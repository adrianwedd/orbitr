"""
Enhanced Security Middleware for Orbitr AI Backend
Comprehensive security monitoring, logging, and protection
"""

import time
import json
import logging
import asyncio
from typing import Dict, Set, Optional, Tuple
from collections import defaultdict, deque
from datetime import datetime, timedelta
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from security_config import security_config, generate_request_id, hash_sensitive_data, is_suspicious_request, get_client_fingerprint

# Configure security logger
security_logger = logging.getLogger("security")
security_logger.setLevel(getattr(logging, security_config.log_level))

# Create file handler if security logging is enabled
if security_config.enable_security_logging:
    handler = logging.FileHandler(security_config.log_file)
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    security_logger.addHandler(handler)

class SecurityEvent:
    """Security event types"""
    AUTHENTICATION_SUCCESS = "auth_success"
    AUTHENTICATION_FAILURE = "auth_failure"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    SUSPICIOUS_REQUEST = "suspicious_request"
    LARGE_REQUEST = "large_request"
    INVALID_INPUT = "invalid_input"
    GENERATION_TIMEOUT = "generation_timeout"
    CACHE_ACCESS = "cache_access"
    ERROR_OCCURRED = "error_occurred"
    REQUEST_BLOCKED = "request_blocked"

class SecurityMetrics:
    """Security metrics collection"""
    
    def __init__(self):
        self.failed_auth_attempts: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        self.suspicious_ips: Set[str] = set()
        self.blocked_ips: Dict[str, datetime] = {}
        self.request_counts: Dict[str, int] = defaultdict(int)
        self.error_counts: Dict[str, int] = defaultdict(int)
        self.last_cleanup = time.time()
        
    def record_failed_auth(self, ip: str, user_agent: str):
        """Record failed authentication attempt"""
        # Skip blocking for test environment
        if security_config.environment.value == "test":
            return
            
        self.failed_auth_attempts[ip].append({
            'timestamp': time.time(),
            'user_agent': user_agent[:100]  # Truncate user agent
        })
        
        # Check if IP should be blocked
        recent_failures = sum(
            1 for attempt in self.failed_auth_attempts[ip]
            if time.time() - attempt['timestamp'] < security_config.auth_config.lockout_duration
        )
        
        if recent_failures >= security_config.auth_config.max_failed_attempts:
            self.blocked_ips[ip] = datetime.now() + timedelta(seconds=security_config.auth_config.lockout_duration)
            security_logger.warning(
                f"IP {hash_sensitive_data(ip)} blocked due to {recent_failures} failed auth attempts"
            )
    
    def is_ip_blocked(self, ip: str) -> bool:
        """Check if IP is currently blocked"""
        # Skip blocking for test environment
        if security_config.environment.value == "test":
            return False
            
        if ip in self.blocked_ips:
            if datetime.now() < self.blocked_ips[ip]:
                return True
            else:
                # Unblock expired IPs
                del self.blocked_ips[ip]
        return False
    
    def mark_suspicious(self, ip: str, reason: str):
        """Mark IP as suspicious"""
        self.suspicious_ips.add(ip)
        security_logger.warning(f"IP {hash_sensitive_data(ip)} marked suspicious: {reason}")
    
    def cleanup_old_data(self):
        """Clean up old metrics data"""
        current_time = time.time()
        if current_time - self.last_cleanup > 3600:  # Cleanup every hour
            # Clean up old failed auth attempts
            cutoff_time = current_time - security_config.auth_config.lockout_duration
            for ip in list(self.failed_auth_attempts.keys()):
                self.failed_auth_attempts[ip] = deque(
                    [attempt for attempt in self.failed_auth_attempts[ip] 
                     if attempt['timestamp'] > cutoff_time],
                    maxlen=100
                )
                if not self.failed_auth_attempts[ip]:
                    del self.failed_auth_attempts[ip]
            
            # Clean up expired blocks
            now = datetime.now()
            self.blocked_ips = {
                ip: expiry for ip, expiry in self.blocked_ips.items()
                if expiry > now
            }
            
            self.last_cleanup = current_time

# Global metrics instance
security_metrics = SecurityMetrics()

class SecurityMiddleware(BaseHTTPMiddleware):
    """Enhanced security middleware with comprehensive protection"""
    
    def __init__(self, app):
        super().__init__(app)
        self.start_time = time.time()
        
    async def dispatch(self, request: Request, call_next):
        """Process request with security checks"""
        start_time = time.time()
        request_id = generate_request_id()
        
        # Add request ID to request state
        request.state.request_id = request_id
        
        # Get client information
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        client_fingerprint = get_client_fingerprint(user_agent, client_ip)
        
        # Clean up old metrics data periodically
        security_metrics.cleanup_old_data()
        
        try:
            # Security checks
            security_check_result = await self._perform_security_checks(
                request, client_ip, user_agent, client_fingerprint
            )
            
            if security_check_result:
                return security_check_result
            
            # Process request
            response = await call_next(request)
            
            # Add security headers
            self._add_security_headers(response)
            
            # Log successful request
            self._log_request(
                SecurityEvent.REQUEST_BLOCKED if response.status_code >= 400 else "request_success",
                request, client_ip, user_agent, response.status_code,
                time.time() - start_time, request_id
            )
            
            return response
            
        except HTTPException as e:
            # Log HTTP exceptions
            self._log_request(
                SecurityEvent.ERROR_OCCURRED, request, client_ip, user_agent,
                e.status_code, time.time() - start_time, request_id, str(e.detail)
            )
            
            # Create error response with security headers
            response = JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail}
            )
            self._add_security_headers(response)
            return response
            
        except Exception as e:
            # Log unexpected errors
            security_logger.error(
                f"Unexpected error in request {request_id}: {str(e)}",
                exc_info=True
            )
            
            # Create generic error response
            response = JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"}
            )
            self._add_security_headers(response)
            return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Get real client IP address"""
        # Check for forwarded headers in order of preference
        forwarded_headers = [
            "x-forwarded-for",
            "x-real-ip",
            "cf-connecting-ip",  # Cloudflare
            "x-cluster-client-ip"
        ]
        
        for header in forwarded_headers:
            if header in request.headers:
                # Take the first IP in case of multiple
                ip = request.headers[header].split(",")[0].strip()
                if ip:
                    return ip
        
        # Fallback to direct connection
        if hasattr(request.client, 'host'):
            return request.client.host
        
        return "unknown"
    
    async def _perform_security_checks(
        self, request: Request, client_ip: str, user_agent: str, fingerprint: str
    ) -> Optional[Response]:
        """Perform comprehensive security checks"""
        
        # Check if IP is blocked
        if security_metrics.is_ip_blocked(client_ip):
            self._log_security_event(
                SecurityEvent.REQUEST_BLOCKED, request, client_ip, user_agent,
                "IP temporarily blocked due to failed authentication attempts"
            )
            response = JSONResponse(
                status_code=429,
                content={"detail": "Too many failed attempts. Please try again later."}
            )
            self._add_security_headers(response)
            return response
        
        # Check request size
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > security_config.max_request_size:
            self._log_security_event(
                SecurityEvent.LARGE_REQUEST, request, client_ip, user_agent,
                f"Request size {content_length} exceeds limit {security_config.max_request_size}"
            )
            response = JSONResponse(
                status_code=413,
                content={"detail": f"Request too large. Maximum {security_config.max_request_size} bytes allowed"}
            )
            self._add_security_headers(response)
            return response
        
        # Check for suspicious patterns
        if is_suspicious_request(user_agent, client_ip):
            security_metrics.mark_suspicious(client_ip, f"Suspicious user agent: {user_agent[:50]}")
            self._log_security_event(
                SecurityEvent.SUSPICIOUS_REQUEST, request, client_ip, user_agent,
                "Suspicious request pattern detected"
            )
        
        # Check for common attack patterns in URL
        path = str(request.url.path).lower()
        suspicious_patterns = [
            "../", "..\\", "<script", "javascript:", "vbscript:",
            "onload=", "onerror=", "eval(", "expression(",
            "union select", "drop table", "insert into"
        ]
        
        if any(pattern in path for pattern in suspicious_patterns):
            self._log_security_event(
                SecurityEvent.SUSPICIOUS_REQUEST, request, client_ip, user_agent,
                f"Suspicious path pattern: {path}"
            )
            response = JSONResponse(
                status_code=400,
                content={"detail": "Invalid request"}
            )
            self._add_security_headers(response)
            return response
        
        return None
    
    def _add_security_headers(self, response: Response):
        """Add comprehensive security headers"""
        if security_config.should_enable_security_headers():
            for header, value in security_config.get_security_headers().items():
                response.headers[header] = value
            
            # Add server header obfuscation
            response.headers["Server"] = "Orbitr"
            
            # Add timestamp for cache control
            response.headers["X-Request-Time"] = str(int(time.time()))
    
    def _log_request(
        self, event_type: str, request: Request, client_ip: str, 
        user_agent: str, status_code: int, duration: float, 
        request_id: str, error_detail: str = None
    ):
        """Log request with security context"""
        if not security_config.enable_security_logging:
            return
        
        log_data = {
            "event_type": event_type,
            "request_id": request_id,
            "method": request.method,
            "path": str(request.url.path),
            "client_ip_hash": hash_sensitive_data(client_ip),
            "user_agent_hash": hash_sensitive_data(user_agent[:100]),
            "status_code": status_code,
            "duration_ms": round(duration * 1000, 2),
            "timestamp": datetime.now().isoformat(),
        }
        
        if error_detail:
            log_data["error_detail"] = error_detail
        
        # Add query parameters (excluding sensitive data)
        if request.url.query:
            log_data["query_params"] = str(request.url.query)
        
        security_logger.info(json.dumps(log_data))
    
    def _log_security_event(
        self, event_type: str, request: Request, client_ip: str,
        user_agent: str, details: str
    ):
        """Log security-specific events"""
        if not security_config.enable_security_logging:
            return
        
        log_data = {
            "event_type": event_type,
            "request_id": getattr(request.state, 'request_id', 'unknown'),
            "method": request.method,
            "path": str(request.url.path),
            "client_ip_hash": hash_sensitive_data(client_ip),
            "user_agent_hash": hash_sensitive_data(user_agent[:100]),
            "details": details,
            "timestamp": datetime.now().isoformat(),
        }
        
        security_logger.warning(json.dumps(log_data))

# Authentication tracking middleware
class AuthenticationMiddleware:
    """Track authentication attempts for security monitoring"""
    
    @staticmethod
    def log_auth_success(client_ip: str, user_agent: str):
        """Log successful authentication"""
        if security_config.enable_security_logging:
            log_data = {
                "event_type": SecurityEvent.AUTHENTICATION_SUCCESS,
                "client_ip_hash": hash_sensitive_data(client_ip),
                "user_agent_hash": hash_sensitive_data(user_agent[:100]),
                "timestamp": datetime.now().isoformat(),
            }
            security_logger.info(json.dumps(log_data))
    
    @staticmethod
    def log_auth_failure(client_ip: str, user_agent: str, reason: str):
        """Log failed authentication"""
        security_metrics.record_failed_auth(client_ip, user_agent)
        
        if security_config.enable_security_logging:
            log_data = {
                "event_type": SecurityEvent.AUTHENTICATION_FAILURE,
                "client_ip_hash": hash_sensitive_data(client_ip),
                "user_agent_hash": hash_sensitive_data(user_agent[:100]),
                "reason": reason,
                "timestamp": datetime.now().isoformat(),
            }
            security_logger.warning(json.dumps(log_data))

# Rate limiting monitoring
class RateLimitMiddleware:
    """Enhanced rate limiting with security monitoring"""
    
    @staticmethod
    def log_rate_limit_exceeded(client_ip: str, user_agent: str, endpoint: str):
        """Log rate limit violations"""
        if security_config.enable_security_logging:
            log_data = {
                "event_type": SecurityEvent.RATE_LIMIT_EXCEEDED,
                "client_ip_hash": hash_sensitive_data(client_ip),
                "user_agent_hash": hash_sensitive_data(user_agent[:100]),
                "endpoint": endpoint,
                "timestamp": datetime.now().isoformat(),
            }
            security_logger.warning(json.dumps(log_data))
        
        # Mark as suspicious if multiple rate limit violations
        security_metrics.mark_suspicious(client_ip, f"Rate limit exceeded on {endpoint}")

# Security metrics endpoint data
def get_security_metrics() -> Dict:
    """Get current security metrics"""
    return {
        "blocked_ips_count": len(security_metrics.blocked_ips),
        "suspicious_ips_count": len(security_metrics.suspicious_ips),
        "failed_auth_attempts_count": sum(len(attempts) for attempts in security_metrics.failed_auth_attempts.values()),
        "uptime_seconds": int(time.time() - security_metrics.last_cleanup),
        "security_events_logged": security_config.enable_security_logging,
    }