"""
Orbitr AI Sequencer Backend
FastAPI server with MusicGen integration for sample generation
"""

import os
import base64
import io
import json
import hashlib
import re
import secrets
import time
import asyncio
import tempfile
from typing import Optional, Dict, Any, List
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager

import numpy as np
try:
    import torch
    import torchaudio
except (ImportError, OSError):
    torch = None
    torchaudio = None
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, field_validator, ConfigDict
from scipy.io import wavfile
import uvicorn
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import bleach
from dotenv import load_dotenv
from security_config import security_config, SecurityLevel, get_real_client_ip
from security_middleware import (
    SecurityMiddleware, AuthenticationMiddleware, RateLimitMiddleware,
    get_security_metrics, security_logger
)

# Load environment variables
load_dotenv()

# Use centralized security configuration
API_KEY = security_config.api_key
GENERATION_RATE_LIMIT = security_config.rate_limits.generation_limit
CACHE_RATE_LIMIT = security_config.rate_limits.cache_limit
HEALTH_RATE_LIMIT = security_config.rate_limits.health_limit
MAX_GENERATION_DURATION = security_config.max_generation_duration
MAX_PROMPT_LENGTH = security_config.max_prompt_length
MAX_CONCURRENT_GENERATIONS = security_config.max_concurrent_generations
GENERATION_TIMEOUT = security_config.generation_timeout
MAX_REQUEST_SIZE = security_config.max_request_size
ENVIRONMENT = security_config.environment.value

# Rate limiter setup
#
# Forwarded-aware key function: rate-limit on the real client IP rather than the
# direct peer (which behind a proxy/load balancer is the proxy itself). Forwarded
# headers are honoured ONLY when the peer is a configured trusted proxy — otherwise
# they are spoofable and a client could rotate IPs to bypass the limit. See
# security_config.get_real_client_ip.
def _forwarded_key_func(request: Request) -> str:
    """Rate-limit key derived from the real client IP (trusted-proxy gated)."""
    ip = get_real_client_ip(request)
    return ip if ip != "unknown" else get_remote_address(request)


# Shared storage for rate-limit counters. Per-process in-memory storage is the
# default, but it is multiplied by the number of workers and is NOT shared across
# them — multi-worker production deployments MUST set RATELIMIT_STORAGE_URI (or
# REDIS_URL), e.g. "redis://host:6379", so all workers share one counter.
_RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI") or os.getenv("REDIS_URL")
if _RATELIMIT_STORAGE_URI:
    limiter = Limiter(key_func=_forwarded_key_func, storage_uri=_RATELIMIT_STORAGE_URI)
else:
    limiter = Limiter(key_func=_forwarded_key_func)

# Global state for resource management
max_concurrent_generations = MAX_CONCURRENT_GENERATIONS

# Concurrency control: a Semaphore avoids the TOCTOU race that a plain counter has
# across `await` boundaries. Acquired non-blocking so an over-capacity request gets
# an immediate 429 instead of queueing. Recreated at startup / in tests via
# reset_generation_semaphore() so the configured max is always honoured.
generation_semaphore = asyncio.Semaphore(max_concurrent_generations)


def reset_generation_semaphore(max_concurrent: Optional[int] = None) -> None:
    """(Re)create the generation semaphore with the configured maximum.

    Used at startup and by test fixtures to guarantee a clean, fully-available
    semaphore between tests.
    """
    global generation_semaphore, max_concurrent_generations
    if max_concurrent is not None:
        max_concurrent_generations = max_concurrent
    generation_semaphore = asyncio.Semaphore(max_concurrent_generations)


def _try_acquire_generation_slot() -> bool:
    """Non-blocking acquire of a generation slot.

    asyncio.Semaphore has no public try-acquire, so we inspect/decrement the
    internal counter. Since this runs inside the single-threaded event loop with
    no intervening await between the check and decrement, it is atomic with
    respect to other coroutines — closing the TOCTOU window. Returns True if a
    slot was reserved (caller MUST release it), False if at capacity.
    """
    if generation_semaphore._value <= 0:
        return False
    generation_semaphore._value -= 1
    return True

# Lazy load AudioCraft to speed up startup
musicgen_model = None
melody_model = None

# Application lifespan management
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: (re)create the concurrency semaphore bound to the running loop.
    reset_generation_semaphore(MAX_CONCURRENT_GENERATIONS)
    if ENVIRONMENT != "development":
        loop = asyncio.get_event_loop()
        loop.run_in_executor(executor, load_models)
    yield
    # Shutdown
    pass

app = FastAPI(
    title="Orbitr AI Backend",
    description="Secure AI-powered music sequencer backend",
    version="1.0.0",
    lifespan=lifespan
)

# Enhanced security middleware configuration
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(SecurityMiddleware)

# Configure CORS with centralized security settings
cors_config = security_config.get_cors_config()
app.add_middleware(CORSMiddleware, **cors_config)

# Add trusted host middleware for production
if security_config.environment == SecurityLevel.PRODUCTION:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=security_config.trusted_hosts)

# Authentication
security = HTTPBearer(auto_error=False)

async def _verify_api_key(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials],
    allow_dev_bypass: bool,
):
    """Core API key verification with security logging.

    When ``allow_dev_bypass`` is True, unauthenticated requests are accepted in
    development mode (preserving local-dev ergonomics for generation endpoints).
    When False, the bearer token is ALWAYS required regardless of environment —
    used for destructive/sensitive endpoints (cache clear, security metrics).
    """
    client_ip = request.client.host if hasattr(request, 'client') and hasattr(request.client, 'host') else 'unknown'
    user_agent = request.headers.get('user-agent', '')

    # Check API key expiration
    if security_config.is_api_key_expired():
        AuthenticationMiddleware.log_auth_failure(client_ip, user_agent, "API key expired")
        raise HTTPException(status_code=401, detail="API key expired")

    # Development mode bypass (only for non-sensitive endpoints)
    if (allow_dev_bypass and
            security_config.environment == SecurityLevel.DEVELOPMENT and
            not security_config.auth_config.require_auth_in_dev and
            not credentials):
        return True

    if not credentials:
        AuthenticationMiddleware.log_auth_failure(client_ip, user_agent, "No credentials provided")
        raise HTTPException(status_code=401, detail="API key required")

    # Constant-time comparison to avoid leaking the key via timing side-channels.
    if not secrets.compare_digest(credentials.credentials, security_config.api_key):
        AuthenticationMiddleware.log_auth_failure(client_ip, user_agent, "Invalid API key")
        raise HTTPException(status_code=401, detail="Invalid API key")

    # Log successful authentication
    AuthenticationMiddleware.log_auth_success(client_ip, user_agent)
    return True


async def verify_api_key(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """API key verification for generation endpoints (allows dev bypass)."""
    return await _verify_api_key(request, credentials, allow_dev_bypass=True)


async def verify_api_key_strict(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Strict API key verification for destructive/sensitive endpoints.

    Always requires a valid bearer token, even in development mode. Used by
    /cache/clear (DELETE) and /security/metrics so they can never be reached
    unauthenticated regardless of environment configuration.
    """
    return await _verify_api_key(request, credentials, allow_dev_bypass=False)

# Thread pool for CPU-bound operations
executor = ThreadPoolExecutor(max_workers=max_concurrent_generations)

# Simple file-based cache
CACHE_DIR = Path("./cache")
CACHE_DIR.mkdir(exist_ok=True)

# Security utilities
def sanitize_text(text: str) -> str:
    """Sanitize text input to prevent XSS and injection attacks"""
    if not text:
        return ""
    
    # Remove non-printable characters first except basic whitespace
    cleaned = re.sub(r'[^\x20-\x7E\n\r\t]', '', text)
    
    # Remove HTML tags and entities
    cleaned = bleach.clean(cleaned, tags=[], attributes={}, strip=True)
    
    # Limit consecutive whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    
    return cleaned

def validate_prompt_content(prompt: str) -> str:
    """Validate prompt content for security and appropriateness"""
    if not prompt or not prompt.strip():
        raise ValueError("Prompt cannot be empty")
    
    # Check original prompt for forbidden patterns before sanitization
    forbidden_patterns = [
        r'<script',
        r'javascript:',
        r'data:',
        r'vbscript:',
        r'<img[^>]+onerror',
        r'<iframe',
        r'<object',
        r'<embed',
    ]
    
    for pattern in forbidden_patterns:
        if re.search(pattern, prompt, re.IGNORECASE):
            raise ValueError("Prompt contains forbidden content")
    
    sanitized = sanitize_text(prompt)
    
    if len(sanitized) > MAX_PROMPT_LENGTH:
        raise ValueError(f"Prompt too long. Maximum {MAX_PROMPT_LENGTH} characters allowed")
    
    return sanitized

# Enhanced Pydantic models with V2 configuration
class GenerateRequest(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
        extra='forbid'
    )
    
    prompt: str = Field(..., min_length=1, max_length=MAX_PROMPT_LENGTH, description="Text prompt for audio generation")
    duration: float = Field(default=1.5, ge=0.1, le=MAX_GENERATION_DURATION, description="Audio duration in seconds")
    quality: str = Field(default="draft", pattern="^(draft|high)$", description="Generation quality level")
    seed: Optional[int] = Field(default=None, ge=0, le=2**32-1, description="Random seed for reproducibility")
    temperature: float = Field(default=1.0, ge=0.1, le=2.0, description="Generation temperature")
    top_k: int = Field(default=250, ge=1, le=1000, description="Top-k sampling parameter")
    top_p: float = Field(default=0.0, ge=0.0, le=1.0, description="Top-p sampling parameter")
    cfg_coef: float = Field(default=3.0, ge=0.1, le=10.0, description="CFG coefficient")
    
    @field_validator('prompt')
    @classmethod
    def validate_prompt(cls, v: str) -> str:
        if len(v) > MAX_PROMPT_LENGTH:
            raise ValueError(f"Prompt too long. Maximum {MAX_PROMPT_LENGTH} characters allowed")
        return validate_prompt_content(v)
    
    @field_validator('duration')
    @classmethod
    def validate_duration(cls, v: float) -> float:
        if v > MAX_GENERATION_DURATION:
            raise ValueError(f"Duration cannot exceed {MAX_GENERATION_DURATION} seconds")
        return v

class BatchGenerateRequest(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
        extra='forbid'
    )
    
    prompts: List[str] = Field(..., min_length=1, max_length=10, description="List of prompts for batch generation")
    duration: float = Field(default=1.5, ge=0.1, le=MAX_GENERATION_DURATION, description="Audio duration in seconds")
    quality: str = Field(default="draft", pattern="^(draft|high)$")
    temperature: float = Field(default=1.0, ge=0.1, le=2.0)
    top_k: int = Field(default=250, ge=1, le=1000)
    top_p: float = Field(default=0.0, ge=0.0, le=1.0)
    cfg_coef: float = Field(default=3.0, ge=0.1, le=10.0)
    
    @field_validator('prompts')
    @classmethod
    def validate_prompts(cls, v: List[str]) -> List[str]:
        validated_prompts = []
        for prompt in v:
            if len(prompt) > MAX_PROMPT_LENGTH:
                raise ValueError(f"Prompt too long. Maximum {MAX_PROMPT_LENGTH} characters allowed")
            validated_prompts.append(validate_prompt_content(prompt))
        return validated_prompts
    
    @field_validator('duration')
    @classmethod
    def validate_duration(cls, v: float) -> float:
        if v > MAX_GENERATION_DURATION:
            raise ValueError(f"Duration cannot exceed {MAX_GENERATION_DURATION} seconds")
        return v

class GenerateResponse(BaseModel):
    model_config = ConfigDict(extra='forbid')
    
    audio: str = Field(..., description="Base64 encoded WAV audio")
    name: str = Field(..., description="Generated sample name")
    seed: int = Field(..., description="Random seed used for generation")
    cached: bool = Field(default=False, description="Whether result was served from cache")

def get_cache_key(req: GenerateRequest) -> str:
    """Generate cache key from request parameters"""
    key_data = {
        "prompt": req.prompt,
        "duration": req.duration,
        "quality": req.quality,
        "seed": req.seed,
        "temperature": req.temperature,
        "top_k": req.top_k,
        "top_p": req.top_p,
        "cfg_coef": req.cfg_coef
    }
    key_str = json.dumps(key_data, sort_keys=True)
    return hashlib.md5(key_str.encode()).hexdigest()

def load_models():
    """Lazy load MusicGen models"""
    global musicgen_model, melody_model
    
    if musicgen_model is None or melody_model is None:
        try:
            from transformers import MusicgenForConditionalGeneration, AutoProcessor
            
            print("Loading MusicGen models from transformers...")
            # Load both models for different quality levels
            if musicgen_model is None:
                print("Loading MusicGen small model...")
                musicgen_model = {
                    'model': MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small"),
                    'processor': AutoProcessor.from_pretrained("facebook/musicgen-small")
                }
            if melody_model is None:
                print("Loading MusicGen melody model...")
                melody_model = {
                    'model': MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-melody"),
                    'processor': AutoProcessor.from_pretrained("facebook/musicgen-melody")
                }
            print("Models loaded successfully!")
        except ImportError as e:
            print(f"Transformers not available: {e}. Using fake generation.")
        except Exception as e:
            print(f"Error loading models: {e}. Using fake generation.")

def generate_fake_audio(duration: float, sample_rate: int = 32000) -> np.ndarray:
    """Generate fake audio for testing without MusicGen"""
    samples = int(duration * sample_rate)
    t = np.linspace(0, duration, samples)
    
    # Generate a simple drum-like sound
    envelope = np.exp(-5 * t)
    frequency = 60 + np.random.rand() * 40  # 60-100 Hz
    noise = np.random.randn(samples) * 0.1
    signal = (np.sin(2 * np.pi * frequency * t) + noise) * envelope * 0.5
    
    return signal.astype(np.float32)

def audio_to_base64_wav(audio: np.ndarray, sample_rate: int = 32000) -> str:
    """Convert audio array to base64 encoded WAV"""
    # Normalize audio
    audio = np.clip(audio, -1, 1)
    audio_int16 = (audio * 32767).astype(np.int16)
    
    # Write to WAV in memory
    buffer = io.BytesIO()
    wavfile.write(buffer, sample_rate, audio_int16)
    buffer.seek(0)
    
    # Encode to base64
    return base64.b64encode(buffer.read()).decode('utf-8')

def _write_cache_atomic(cache_file: Path, data: bytes) -> None:
    """Write cache data atomically.

    Writes to a temp file in the same directory then os.replace()s it onto the
    final path. os.replace() is atomic on POSIX, so concurrent readers always see
    either the old file or the complete new file — never a partial write left
    behind by a crash or timeout.
    """
    cache_file.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=str(cache_file.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, 'wb') as f:
            f.write(data)
        os.replace(tmp_path, cache_file)
    except BaseException:
        # Clean up the temp file on any failure so we don't leak partial files.
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise

# Add security monitoring endpoint
@app.get("/security/metrics")
@limiter.limit(f"{HEALTH_RATE_LIMIT//10}/minute")
async def security_metrics(
    request: Request,
    authenticated: bool = Depends(verify_api_key_strict)
):
    """Get security metrics (always requires auth, even in development)"""
    return get_security_metrics()

@app.get("/")
@limiter.limit(f"{HEALTH_RATE_LIMIT}/minute")
async def root(request: Request):
    """Health check endpoint"""
    return {
        "status": "Orbitr AI Backend Running", 
        "models_loaded": musicgen_model is not None,
        "version": "1.0.0",
        "environment": ENVIRONMENT
    }

@app.get("/health")
@limiter.limit(f"{HEALTH_RATE_LIMIT}/minute")
async def health_check(request: Request):
    """Detailed health check with security status"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "security": {
            "auth_enabled": ENVIRONMENT == "production" or API_KEY != "dev-key-change-in-production",
            "rate_limiting_enabled": True,
            "cors_configured": len(security_config.cors_origins) > 0,
            "request_size_limited": True
        },
        "resources": {
            "current_generations": max(0, max_concurrent_generations - generation_semaphore._value),
            "max_concurrent": max_concurrent_generations,
            "models_loaded": musicgen_model is not None
        }
    }

@app.post("/generate", response_model=GenerateResponse)
@limiter.limit(f"{GENERATION_RATE_LIMIT}/minute")
async def generate_sample(
    request: Request,
    generate_request: GenerateRequest, 
    background_tasks: BackgroundTasks,
    authenticated: bool = Depends(verify_api_key)
):
    """Generate audio sample from text prompt (protected endpoint)"""
    # Atomically reserve a generation slot. The non-blocking acquire below avoids
    # the TOCTOU race a plain counter has across await points: if no slot is
    # available we immediately reject with 429 rather than queueing.
    if not _try_acquire_generation_slot():
        raise HTTPException(
            status_code=429,
            detail=f"Too many concurrent generations. Maximum {max_concurrent_generations} allowed"
        )

    try:
        # Check cache first
        cache_key = get_cache_key(generate_request)
        cache_file = CACHE_DIR / f"{cache_key}.wav"

        if cache_file.exists():
            with open(cache_file, 'rb') as f:
                audio_base64 = base64.b64encode(f.read()).decode('utf-8')
            return GenerateResponse(
                audio=audio_base64,
                name=f"cached-{generate_request.prompt[:20]}",
                seed=generate_request.seed or 42,
                cached=True
            )
        # Set seed for reproducibility
        if generate_request.seed:
            if torch is not None:
                torch.manual_seed(generate_request.seed)
            np.random.seed(generate_request.seed)
        else:
            generate_request.seed = np.random.randint(0, 2**32)
            if torch is not None:
                torch.manual_seed(generate_request.seed)
            np.random.seed(generate_request.seed)
        
        # Add generation timeout
        start_time = time.time()
        
        # Generate audio with timeout monitoring
        if musicgen_model is not None and melody_model is not None:
            # Use real MusicGen via transformers
            model_info = melody_model if generate_request.quality == "draft" else musicgen_model
            model = model_info['model']
            processor = model_info['processor']
            
            # Process the prompt
            inputs = processor(
                text=[generate_request.prompt],
                padding=True,
                return_tensors="pt",
            )
            
            # Calculate max_new_tokens based on duration (32kHz sample rate)
            max_new_tokens = int(generate_request.duration * 32000 / 256)  # 256 tokens per second approx
            
            # Check timeout before generation
            if time.time() - start_time > GENERATION_TIMEOUT:
                raise HTTPException(status_code=408, detail="Generation timeout")
            
            # Generate with memory management
            with torch.no_grad():
                audio_values = model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    temperature=generate_request.temperature,
                    top_k=generate_request.top_k,
                    top_p=generate_request.top_p if generate_request.top_p > 0 else None,
                    do_sample=True,
                )
            
            # Convert to numpy
            audio = audio_values[0, 0].cpu().numpy()  # Get first channel of first sample
            sample_rate = 32000  # MusicGen default sample rate
            
            # Clear GPU memory
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        else:
            # Use fake generation for testing
            audio = generate_fake_audio(generate_request.duration)
            sample_rate = 32000
        
        # Final timeout check
        if time.time() - start_time > GENERATION_TIMEOUT:
            raise HTTPException(status_code=408, detail="Generation timeout")
        
        # Convert to base64 WAV
        audio_base64 = audio_to_base64_wav(audio, sample_rate)
        
        # Cache the result atomically: write to a temp file in the same dir then
        # os.replace() (atomic on POSIX) so a crash/timeout mid-write can never
        # leave a truncated file that gets served as a cache hit forever.
        _write_cache_atomic(cache_file, base64.b64decode(audio_base64))

        # Generate name from prompt
        name = f"{generate_request.prompt[:30]}-{generate_request.seed}"
        
        return GenerateResponse(
            audio=audio_base64,
            name=name,
            seed=generate_request.seed
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # Log error for debugging but don't expose internal details
        error_msg = "Audio generation failed"
        if ENVIRONMENT == "development":
            error_msg = f"Audio generation failed: {str(e)}"
        raise HTTPException(status_code=500, detail=error_msg)
    finally:
        # Always release the reserved generation slot (exception-safe).
        generation_semaphore.release()

@app.post("/generate_batch")
@limiter.limit(f"{GENERATION_RATE_LIMIT//2}/minute")  # Lower limit for batch operations
async def generate_batch(
    request: Request,
    batch_request: BatchGenerateRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """Generate multiple samples in batch (protected endpoint)"""
    if len(batch_request.prompts) > 5:  # Additional batch size limit
        raise HTTPException(status_code=400, detail="Batch size too large. Maximum 5 prompts allowed")
    
    results = []
    failed_prompts = []
    
    for i, prompt in enumerate(batch_request.prompts):
        try:
            req = GenerateRequest(
                prompt=prompt,
                duration=batch_request.duration,
                quality=batch_request.quality,
                temperature=batch_request.temperature,
                top_k=batch_request.top_k,
                top_p=batch_request.top_p,
                cfg_coef=batch_request.cfg_coef
            )
            result = await generate_sample(request, req, BackgroundTasks(), authenticated)
            results.append(result)
        except Exception as e:
            failed_prompts.append({"index": i, "prompt": prompt, "error": str(e)})
            continue
    
    return {
        "results": results,
        "failed": failed_prompts,
        "total_requested": len(batch_request.prompts),
        "successful": len(results)
    }

@app.delete("/cache/clear")
@limiter.limit(f"{CACHE_RATE_LIMIT//10}/minute")  # Very limited for destructive operations
async def clear_cache(
    request: Request,
    authenticated: bool = Depends(verify_api_key_strict)
):
    """Clear the audio cache (always requires auth, even in development)"""
    import shutil
    try:
        if CACHE_DIR.exists():
            shutil.rmtree(CACHE_DIR)
            CACHE_DIR.mkdir(exist_ok=True)
        return {"message": "Cache cleared successfully", "timestamp": time.time()}
    except Exception as e:
        error_msg = "Failed to clear cache"
        if ENVIRONMENT == "development":
            error_msg = f"Failed to clear cache: {str(e)}"
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/cache/size")
@limiter.limit(f"{CACHE_RATE_LIMIT}/minute")
async def cache_size(request: Request):
    """Get cache size and file count"""
    try:
        if not CACHE_DIR.exists():
            return {"files": 0, "size_mb": 0, "timestamp": time.time()}
        
        files = list(CACHE_DIR.glob("*.wav"))
        total_size = sum(f.stat().st_size for f in files) / (1024 * 1024)
        
        # Get cache health info
        max_size_mb = int(os.getenv("CACHE_MAX_SIZE_MB", "1000"))
        health_status = "healthy" if total_size < max_size_mb * 0.8 else "warning" if total_size < max_size_mb else "critical"
        
        return {
            "files": len(files),
            "size_mb": round(total_size, 2),
            "max_size_mb": max_size_mb,
            "health": health_status,
            "timestamp": time.time()
        }
    except Exception as e:
        error_msg = "Failed to get cache size"
        if ENVIRONMENT == "development":
            error_msg = f"Failed to get cache size: {str(e)}"
        raise HTTPException(status_code=500, detail=error_msg)

if __name__ == "__main__":
    # Check if we're in development mode
    dev_mode = os.getenv("DEV_MODE", "true").lower() == "true"
    
    if not dev_mode:
        # Production: load models before starting
        load_models()
    
    # Start server
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=dev_mode,
        log_level="info"
    )
