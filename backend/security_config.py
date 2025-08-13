"""
Centralized Security Configuration for Orbitr AI Backend
Production-ready security settings and utilities
"""

import os
import time
import hashlib
import secrets
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from pathlib import Path

logger = logging.getLogger(__name__)

class SecurityLevel(Enum):
    """Security level enumeration"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TEST = "test"

@dataclass
class SecurityHeaders:
    """Security headers configuration"""
    x_content_type_options: str = "nosniff"
    x_frame_options: str = "DENY"
    x_xss_protection: str = "1; mode=block"
    referrer_policy: str = "strict-origin-when-cross-origin"
    content_security_policy: str = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "media-src 'self' blob:; "
        "connect-src 'self'; "
        "font-src 'self'; "
        "object-src 'none'; "
        "base-uri 'self'; "
        "form-action 'self'; "
        "frame-ancestors 'none'; "
        "upgrade-insecure-requests"
    )
    strict_transport_security: str = "max-age=31536000; includeSubDomains; preload"
    permissions_policy: str = (
        "geolocation=(), "
        "microphone=(), "
        "camera=(), "
        "payment=(), "
        "usb=(), "
        "magnetometer=(), "
        "gyroscope=(), "
        "accelerometer=()"
    )
    cross_origin_opener_policy: str = "same-origin"
    cross_origin_embedder_policy: str = "require-corp"
    cross_origin_resource_policy: str = "same-origin"

@dataclass
class RateLimitConfig:
    """Rate limiting configuration"""
    generation_limit: int = 10
    cache_limit: int = 30
    health_limit: int = 60
    batch_limit: int = 5
    clear_cache_limit: int = 3
    window_size: str = "minute"

@dataclass
class AuthConfig:
    """Authentication configuration"""
    api_key: str
    api_key_expiry: Optional[int] = None  # Unix timestamp
    require_auth_in_dev: bool = False
    session_timeout: int = 3600  # 1 hour
    max_failed_attempts: int = 5
    lockout_duration: int = 900  # 15 minutes

class SecurityConfig:
    """Centralized security configuration management"""
    
    def __init__(self):
        self.environment = SecurityLevel(os.getenv("ENVIRONMENT", "development"))
        self.api_key = os.getenv("API_KEY", self._generate_default_key())
        self.api_key_expiry = self._parse_api_key_expiry()
        
        # Security settings
        self.headers = SecurityHeaders()
        self.rate_limits = self._load_rate_limits()
        self.auth_config = self._load_auth_config()
        
        # Resource limits
        self.max_request_size = int(os.getenv("MAX_REQUEST_SIZE", "10485760"))  # 10MB
        self.max_generation_duration = float(os.getenv("MAX_GENERATION_DURATION", "5.0"))
        self.max_prompt_length = int(os.getenv("MAX_PROMPT_LENGTH", "500"))
        self.max_concurrent_generations = int(os.getenv("MAX_CONCURRENT_GENERATIONS", "3"))
        self.generation_timeout = int(os.getenv("GENERATION_TIMEOUT", "30"))
        
        # CORS configuration
        self.cors_origins = self._parse_cors_origins()
        self.trusted_hosts = self._parse_trusted_hosts()
        
        # Logging configuration
        self.enable_security_logging = os.getenv("ENABLE_SECURITY_LOGGING", "true").lower() == "true"
        self.log_level = os.getenv("LOG_LEVEL", "INFO").upper()
        self.log_file = os.getenv("SECURITY_LOG_FILE", "security.log")
        
        # Validate configuration
        self._validate_config()
    
    def _generate_default_key(self) -> str:
        """Generate a secure default API key"""
        if self.environment == SecurityLevel.PRODUCTION:
            raise ValueError("API_KEY environment variable is required in production")
        if self.environment == SecurityLevel.TEST:
            return "test-api-key-secure"  # Consistent test key
        return f"dev-key-{secrets.token_urlsafe(16)}"
    
    def _parse_api_key_expiry(self) -> Optional[int]:
        """Parse API key expiry from environment"""
        expiry_str = os.getenv("API_KEY_EXPIRY")
        if expiry_str:
            try:
                return int(expiry_str)
            except ValueError:
                logger.warning(f"Invalid API_KEY_EXPIRY format: {expiry_str}")
        return None
    
    def _load_rate_limits(self) -> RateLimitConfig:
        """Load rate limiting configuration"""
        return RateLimitConfig(
            generation_limit=int(os.getenv("GENERATION_RATE_LIMIT", "10")),
            cache_limit=int(os.getenv("CACHE_RATE_LIMIT", "30")),
            health_limit=int(os.getenv("HEALTH_RATE_LIMIT", "60")),
            batch_limit=int(os.getenv("BATCH_RATE_LIMIT", "5")),
            clear_cache_limit=int(os.getenv("CLEAR_CACHE_RATE_LIMIT", "3")),
            window_size=os.getenv("RATE_LIMIT_WINDOW", "minute")
        )
    
    def _load_auth_config(self) -> AuthConfig:
        """Load authentication configuration"""
        return AuthConfig(
            api_key=self.api_key,
            api_key_expiry=self.api_key_expiry,
            require_auth_in_dev=os.getenv("REQUIRE_AUTH_IN_DEV", "false").lower() == "true",
            session_timeout=int(os.getenv("SESSION_TIMEOUT", "3600")),
            max_failed_attempts=int(os.getenv("MAX_FAILED_ATTEMPTS", "5")),
            lockout_duration=int(os.getenv("LOCKOUT_DURATION", "900"))
        )
    
    def _parse_cors_origins(self) -> List[str]:
        """Parse CORS origins from environment"""
        origins_str = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001")
        origins = [origin.strip() for origin in origins_str.split(",") if origin.strip()]
        
        if self.environment == SecurityLevel.PRODUCTION and not origins:
            raise ValueError("CORS_ALLOWED_ORIGINS must be configured in production")
        
        return origins
    
    def _parse_trusted_hosts(self) -> List[str]:
        """Parse trusted hosts from CORS origins"""
        hosts = []
        for origin in self.cors_origins:
            host = origin.replace("https://", "").replace("http://", "")
            if host and host not in hosts:
                hosts.append(host)
        return hosts
    
    def _validate_config(self):
        """Validate security configuration"""
        errors = []
        
        # Validate API key (skip validation for test environment)
        if self.environment == SecurityLevel.PRODUCTION:
            if self.api_key.startswith("dev-key") or self.api_key.startswith("test-"):
                errors.append("Production API key cannot start with 'dev-key' or 'test-'")
            if len(self.api_key) < 32:
                errors.append("Production API key must be at least 32 characters")
        
        # Validate rate limits
        if self.rate_limits.generation_limit <= 0:
            errors.append("Generation rate limit must be positive")
        
        # Validate resource limits
        if self.max_request_size <= 0:
            errors.append("Max request size must be positive")
        if self.max_generation_duration <= 0:
            errors.append("Max generation duration must be positive")
        
        if errors:
            raise ValueError(f"Security configuration errors: {'; '.join(errors)}")
    
    def is_api_key_expired(self) -> bool:
        """Check if API key is expired"""
        if self.api_key_expiry is None:
            return False
        return time.time() > self.api_key_expiry
    
    def get_security_headers(self) -> Dict[str, str]:
        """Get security headers for responses"""
        headers = {
            "X-Content-Type-Options": self.headers.x_content_type_options,
            "X-Frame-Options": self.headers.x_frame_options,
            "X-XSS-Protection": self.headers.x_xss_protection,
            "Referrer-Policy": self.headers.referrer_policy,
            "Content-Security-Policy": self.headers.content_security_policy,
            "Permissions-Policy": self.headers.permissions_policy,
            "Cross-Origin-Opener-Policy": self.headers.cross_origin_opener_policy,
            "Cross-Origin-Embedder-Policy": self.headers.cross_origin_embedder_policy,
            "Cross-Origin-Resource-Policy": self.headers.cross_origin_resource_policy,
        }
        
        # Add HSTS for HTTPS in production
        if self.environment == SecurityLevel.PRODUCTION:
            headers["Strict-Transport-Security"] = self.headers.strict_transport_security
        
        return headers
    
    def get_cors_config(self) -> Dict[str, any]:
        """Get CORS configuration"""
        if self.environment == SecurityLevel.PRODUCTION:
            return {
                "allow_origins": self.cors_origins,
                "allow_credentials": False,
                "allow_methods": ["GET", "POST"],
                "allow_headers": ["Authorization", "Content-Type"],
                "max_age": 600,
            }
        else:
            return {
                "allow_origins": self.cors_origins,
                "allow_credentials": True,
                "allow_methods": ["*"],
                "allow_headers": ["*"],
            }
    
    def should_enable_security_headers(self) -> bool:
        """Check if security headers should be enabled"""
        return os.getenv("ENABLE_SECURITY_HEADERS", "true").lower() == "true"
    
    def get_cache_security_config(self) -> Dict[str, any]:
        """Get cache security configuration"""
        return {
            "max_size_mb": int(os.getenv("CACHE_MAX_SIZE_MB", "1000")),
            "enable_encryption": os.getenv("ENABLE_CACHE_ENCRYPTION", "false").lower() == "true",
            "cleanup_interval": int(os.getenv("CACHE_CLEANUP_INTERVAL", "3600")),  # 1 hour
        }

# Global security configuration instance
security_config = SecurityConfig()

# Security utilities
def generate_request_id() -> str:
    """Generate unique request ID for tracking"""
    return secrets.token_urlsafe(16)

def hash_sensitive_data(data: str) -> str:
    """Hash sensitive data for logging"""
    return hashlib.sha256(data.encode()).hexdigest()[:16]

def is_suspicious_request(user_agent: str, ip: str) -> bool:
    """Basic suspicious request detection"""
    suspicious_patterns = [
        "bot", "crawler", "spider", "scraper",
        "curl", "wget", "python-requests",
        "attack", "scan", "probe"
    ]
    
    user_agent_lower = user_agent.lower()
    return any(pattern in user_agent_lower for pattern in suspicious_patterns)

def validate_ip_address(ip: str) -> bool:
    """Validate IP address format"""
    import ipaddress
    try:
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False

def get_client_fingerprint(user_agent: str, ip: str) -> str:
    """Generate client fingerprint for tracking"""
    fingerprint_data = f"{user_agent}:{ip}"
    return hashlib.md5(fingerprint_data.encode()).hexdigest()