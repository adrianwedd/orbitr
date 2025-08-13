"""
Orbitr AI Sequencer Backend
FastAPI server with MusicGen integration for sample generation
"""

import os
import base64
import io
import json
import hashlib
from typing import Optional, Dict, Any
from pathlib import Path
import asyncio
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import torch
import torchaudio
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from scipy.io import wavfile
import uvicorn

# Lazy load AudioCraft to speed up startup
musicgen_model = None
melody_model = None

app = FastAPI(title="Orbitr AI Backend")

# Configure CORS
origins = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Thread pool for CPU-bound operations
executor = ThreadPoolExecutor(max_workers=2)

# Simple file-based cache
CACHE_DIR = Path("./cache")
CACHE_DIR.mkdir(exist_ok=True)

class GenerateRequest(BaseModel):
    prompt: str
    duration: float = 1.5
    quality: str = "draft"  # "draft" or "high"
    seed: Optional[int] = None
    temperature: float = 1.0
    top_k: int = 250
    top_p: float = 0.0
    cfg_coef: float = 3.0

class GenerateResponse(BaseModel):
    audio: str  # base64 encoded WAV
    name: str
    seed: int
    cached: bool = False

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

@app.on_event("startup")
async def startup_event():
    """Load models on startup in background"""
    loop = asyncio.get_event_loop()
    loop.run_in_executor(executor, load_models)

@app.get("/")
async def root():
    return {"status": "Orbitr AI Backend Running", "models_loaded": musicgen_model is not None}

@app.post("/generate", response_model=GenerateResponse)
async def generate_sample(request: GenerateRequest, background_tasks: BackgroundTasks):
    """Generate audio sample from text prompt"""
    
    # Check cache first
    cache_key = get_cache_key(request)
    cache_file = CACHE_DIR / f"{cache_key}.wav"
    
    if cache_file.exists():
        with open(cache_file, 'rb') as f:
            audio_base64 = base64.b64encode(f.read()).decode('utf-8')
        return GenerateResponse(
            audio=audio_base64,
            name=f"cached-{request.prompt[:20]}",
            seed=request.seed or 42,
            cached=True
        )
    
    try:
        # Set seed for reproducibility
        if request.seed:
            torch.manual_seed(request.seed)
            np.random.seed(request.seed)
        else:
            request.seed = np.random.randint(0, 2**32)
            torch.manual_seed(request.seed)
            np.random.seed(request.seed)
        
        # Generate audio
        if musicgen_model is not None and melody_model is not None:
            # Use real MusicGen via transformers
            model_info = melody_model if request.quality == "draft" else musicgen_model
            model = model_info['model']
            processor = model_info['processor']
            
            # Process the prompt
            inputs = processor(
                text=[request.prompt],
                padding=True,
                return_tensors="pt",
            )
            
            # Calculate max_new_tokens based on duration (32kHz sample rate)
            max_new_tokens = int(request.duration * 32000 / 256)  # 256 tokens per second approx
            
            # Generate
            with torch.no_grad():
                audio_values = model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    temperature=request.temperature,
                    top_k=request.top_k,
                    top_p=request.top_p if request.top_p > 0 else None,
                    do_sample=True,
                )
            
            # Convert to numpy
            audio = audio_values[0, 0].cpu().numpy()  # Get first channel of first sample
            sample_rate = 32000  # MusicGen default sample rate
        else:
            # Use fake generation for testing
            audio = generate_fake_audio(request.duration)
            sample_rate = 32000
        
        # Convert to base64 WAV
        audio_base64 = audio_to_base64_wav(audio, sample_rate)
        
        # Cache the result
        with open(cache_file, 'wb') as f:
            f.write(base64.b64decode(audio_base64))
        
        # Generate name from prompt
        name = f"{request.prompt[:30]}-{request.seed}"
        
        return GenerateResponse(
            audio=audio_base64,
            name=name,
            seed=request.seed
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate_batch")
async def generate_batch(prompts: list[str], request: GenerateRequest):
    """Generate multiple samples in batch"""
    results = []
    for prompt in prompts:
        req = GenerateRequest(
            prompt=prompt,
            duration=request.duration,
            quality=request.quality,
            temperature=request.temperature,
            top_k=request.top_k,
            top_p=request.top_p,
            cfg_coef=request.cfg_coef
        )
        result = await generate_sample(req, BackgroundTasks())
        results.append(result)
    return results

@app.get("/cache/clear")
async def clear_cache():
    """Clear the audio cache"""
    import shutil
    if CACHE_DIR.exists():
        shutil.rmtree(CACHE_DIR)
        CACHE_DIR.mkdir(exist_ok=True)
    return {"message": "Cache cleared"}

@app.get("/cache/size")
async def cache_size():
    """Get cache size and file count"""
    if not CACHE_DIR.exists():
        return {"files": 0, "size_mb": 0}
    
    files = list(CACHE_DIR.glob("*.wav"))
    total_size = sum(f.stat().st_size for f in files) / (1024 * 1024)
    
    return {
        "files": len(files),
        "size_mb": round(total_size, 2)
    }

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
