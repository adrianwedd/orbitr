"""
Comprehensive Security Logging Configuration for Orbitr AI Backend
Production-ready security event monitoring and alerting
"""

import os
import json
import logging
import logging.handlers
from typing import Dict, Any, Optional
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, asdict
from enum import Enum

class SecurityLogLevel(Enum):
    """Security-specific log levels"""
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

@dataclass
class SecurityLogEvent:
    """Structured security log event"""
    event_type: str
    severity: SecurityLogLevel
    timestamp: str
    request_id: Optional[str] = None
    client_ip_hash: Optional[str] = None
    user_agent_hash: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    duration_ms: Optional[float] = None
    details: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        data = asdict(self)
        data['severity'] = self.severity.value
        return {k: v for k, v in data.items() if v is not None}

class SecurityLogger:
    """Enhanced security logger with structured logging"""
    
    def __init__(self):
        self.logger = logging.getLogger("orbitr_security")
        self.setup_logging()
        
    def setup_logging(self):
        """Configure security logging with multiple handlers"""
        # Clear existing handlers
        self.logger.handlers.clear()
        
        # Set log level
        log_level = os.getenv("SECURITY_LOG_LEVEL", "INFO").upper()
        self.logger.setLevel(getattr(logging, log_level))
        
        # Create formatter for structured JSON logs
        class JSONFormatter(logging.Formatter):
            def format(self, record):
                log_data = {
                    'timestamp': datetime.fromtimestamp(record.created).isoformat(),
                    'level': record.levelname,
                    'logger': record.name,
                    'message': record.getMessage(),
                }
                
                # Add extra fields if present
                if hasattr(record, 'security_event'):
                    log_data.update(record.security_event.to_dict())
                
                return json.dumps(log_data)
        
        # File handler for security logs
        if os.getenv("ENABLE_SECURITY_LOGGING", "true").lower() == "true":
            log_dir = Path(os.getenv("LOG_DIR", "./logs"))
            log_dir.mkdir(exist_ok=True)
            
            # Main security log file
            security_log_file = log_dir / "security.log"
            file_handler = logging.handlers.RotatingFileHandler(
                security_log_file,
                maxBytes=50 * 1024 * 1024,  # 50MB
                backupCount=10
            )
            file_handler.setFormatter(JSONFormatter())
            self.logger.addHandler(file_handler)
            
            # Critical events log (separate file for alerts)
            critical_log_file = log_dir / "security_critical.log"
            critical_handler = logging.handlers.RotatingFileHandler(
                critical_log_file,
                maxBytes=10 * 1024 * 1024,  # 10MB
                backupCount=5
            )
            critical_handler.setLevel(logging.ERROR)
            critical_handler.setFormatter(JSONFormatter())
            self.logger.addHandler(critical_handler)
        
        # Console handler for development
        if os.getenv("ENVIRONMENT", "development") == "development":
            console_handler = logging.StreamHandler()
            console_formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            console_handler.setFormatter(console_formatter)
            self.logger.addHandler(console_handler)
    
    def log_security_event(self, event: SecurityLogEvent):
        """Log a security event with appropriate level"""
        extra = {'security_event': event}
        
        if event.severity == SecurityLogLevel.INFO:
            self.logger.info(f"Security event: {event.event_type}", extra=extra)
        elif event.severity == SecurityLogLevel.WARNING:
            self.logger.warning(f"Security warning: {event.event_type}", extra=extra)
        elif event.severity == SecurityLogLevel.ERROR:
            self.logger.error(f"Security error: {event.event_type}", extra=extra)
        elif event.severity == SecurityLogLevel.CRITICAL:
            self.logger.critical(f"Critical security event: {event.event_type}", extra=extra)
    
    def log_authentication_success(self, client_ip_hash: str, user_agent_hash: str, request_id: str):
        """Log successful authentication"""
        event = SecurityLogEvent(
            event_type="authentication_success",
            severity=SecurityLogLevel.INFO,
            timestamp=datetime.now().isoformat(),
            request_id=request_id,
            client_ip_hash=client_ip_hash,
            user_agent_hash=user_agent_hash
        )
        self.log_security_event(event)
    
    def log_authentication_failure(self, client_ip_hash: str, user_agent_hash: str, 
                                 reason: str, request_id: str):
        """Log failed authentication"""
        event = SecurityLogEvent(
            event_type="authentication_failure",
            severity=SecurityLogLevel.WARNING,
            timestamp=datetime.now().isoformat(),
            request_id=request_id,
            client_ip_hash=client_ip_hash,
            user_agent_hash=user_agent_hash,
            details={"reason": reason}
        )
        self.log_security_event(event)
    
    def log_rate_limit_exceeded(self, client_ip_hash: str, user_agent_hash: str,
                              endpoint: str, request_id: str):
        """Log rate limit violations"""
        event = SecurityLogEvent(
            event_type="rate_limit_exceeded",
            severity=SecurityLogLevel.WARNING,
            timestamp=datetime.now().isoformat(),
            request_id=request_id,
            client_ip_hash=client_ip_hash,
            user_agent_hash=user_agent_hash,
            endpoint=endpoint
        )
        self.log_security_event(event)
    
    def log_suspicious_activity(self, client_ip_hash: str, user_agent_hash: str,
                              activity_type: str, details: Dict[str, Any], request_id: str):
        """Log suspicious activity"""
        event = SecurityLogEvent(
            event_type="suspicious_activity",
            severity=SecurityLogLevel.ERROR,
            timestamp=datetime.now().isoformat(),
            request_id=request_id,
            client_ip_hash=client_ip_hash,
            user_agent_hash=user_agent_hash,
            details={"activity_type": activity_type, **details}
        )
        self.log_security_event(event)
    
    def log_blocked_request(self, client_ip_hash: str, user_agent_hash: str,
                          reason: str, endpoint: str, request_id: str):
        """Log blocked requests"""
        event = SecurityLogEvent(
            event_type="request_blocked",
            severity=SecurityLogLevel.ERROR,
            timestamp=datetime.now().isoformat(),
            request_id=request_id,
            client_ip_hash=client_ip_hash,
            user_agent_hash=user_agent_hash,
            endpoint=endpoint,
            details={"reason": reason}
        )
        self.log_security_event(event)
    
    def log_api_key_expiry_warning(self, expires_in_hours: int):
        """Log API key expiry warning"""
        event = SecurityLogEvent(
            event_type="api_key_expiry_warning",
            severity=SecurityLogLevel.WARNING,
            timestamp=datetime.now().isoformat(),
            details={"expires_in_hours": expires_in_hours}
        )
        self.log_security_event(event)
    
    def log_security_configuration_error(self, error_details: str):
        """Log security configuration errors"""
        event = SecurityLogEvent(
            event_type="security_configuration_error",
            severity=SecurityLogLevel.CRITICAL,
            timestamp=datetime.now().isoformat(),
            details={"error": error_details}
        )
        self.log_security_event(event)
    
    def log_cache_operation(self, operation: str, client_ip_hash: str, 
                          user_agent_hash: str, request_id: str):
        """Log cache operations"""
        event = SecurityLogEvent(
            event_type="cache_operation",
            severity=SecurityLogLevel.INFO,
            timestamp=datetime.now().isoformat(),
            request_id=request_id,
            client_ip_hash=client_ip_hash,
            user_agent_hash=user_agent_hash,
            details={"operation": operation}
        )
        self.log_security_event(event)
    
    def log_generation_timeout(self, client_ip_hash: str, user_agent_hash: str,
                             duration_seconds: float, request_id: str):
        """Log generation timeouts"""
        event = SecurityLogEvent(
            event_type="generation_timeout",
            severity=SecurityLogLevel.WARNING,
            timestamp=datetime.now().isoformat(),
            request_id=request_id,
            client_ip_hash=client_ip_hash,
            user_agent_hash=user_agent_hash,
            details={"duration_seconds": duration_seconds}
        )
        self.log_security_event(event)
    
    def log_request_metrics(self, method: str, endpoint: str, status_code: int,
                          duration_ms: float, client_ip_hash: str, 
                          user_agent_hash: str, request_id: str):
        """Log request metrics for monitoring"""
        severity = SecurityLogLevel.WARNING if status_code >= 400 else SecurityLogLevel.INFO
        
        event = SecurityLogEvent(
            event_type="request_processed",
            severity=severity,
            timestamp=datetime.now().isoformat(),
            request_id=request_id,
            client_ip_hash=client_ip_hash,
            user_agent_hash=user_agent_hash,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            duration_ms=duration_ms
        )
        self.log_security_event(event)

# Global security logger instance
security_logger = SecurityLogger()

# Monitoring utilities
class SecurityMonitor:
    """Security monitoring and alerting utilities"""
    
    @staticmethod
    def check_api_key_expiry():
        """Check and warn about API key expiry"""
        from security_config import security_config
        
        if security_config.api_key_expiry:
            import time
            current_time = time.time()
            expires_in_seconds = security_config.api_key_expiry - current_time
            expires_in_hours = expires_in_seconds / 3600
            
            # Warn when less than 24 hours remain
            if 0 < expires_in_hours < 24:
                security_logger.log_api_key_expiry_warning(int(expires_in_hours))
                return True
        return False
    
    @staticmethod
    def validate_security_configuration():
        """Validate security configuration and log issues"""
        try:
            from security_config import security_config
            # Configuration validation is done in security_config.__init__
            return True
        except Exception as e:
            security_logger.log_security_configuration_error(str(e))
            return False

# Log rotation and cleanup utilities
def cleanup_old_logs():
    """Clean up old log files beyond retention period"""
    log_dir = Path(os.getenv("LOG_DIR", "./logs"))
    if not log_dir.exists():
        return
    
    retention_days = int(os.getenv("LOG_RETENTION_DAYS", "30"))
    import time
    cutoff_time = time.time() - (retention_days * 24 * 3600)
    
    for log_file in log_dir.glob("*.log*"):
        if log_file.stat().st_mtime < cutoff_time:
            try:
                log_file.unlink()
                security_logger.logger.info(f"Cleaned up old log file: {log_file}")
            except Exception as e:
                security_logger.logger.error(f"Failed to clean up log file {log_file}: {e}")

# Initialize security monitoring
def initialize_security_monitoring():
    """Initialize security monitoring and validation"""
    # Validate configuration
    if not SecurityMonitor.validate_security_configuration():
        raise RuntimeError("Security configuration validation failed")
    
    # Check API key expiry
    SecurityMonitor.check_api_key_expiry()
    
    # Clean up old logs
    cleanup_old_logs()
    
    security_logger.logger.info("Security monitoring initialized successfully")