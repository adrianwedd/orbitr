"""
API Key Management System for Orbitr AI Backend
Secure API key generation, rotation, and validation
"""

import os
import time
import secrets
import hashlib
import json
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from pathlib import Path
from dataclasses import dataclass, asdict
from cryptography.fernet import Fernet
from security_logging import security_logger

@dataclass
class APIKey:
    """API key data structure"""
    key_id: str
    key_hash: str  # Hashed version of the actual key
    created_at: int  # Unix timestamp
    expires_at: Optional[int] = None  # Unix timestamp
    last_used: Optional[int] = None
    usage_count: int = 0
    is_active: bool = True
    permissions: List[str] = None
    name: Optional[str] = None
    
    def __post_init__(self):
        if self.permissions is None:
            self.permissions = ["generate", "cache", "health"]
    
    def is_expired(self) -> bool:
        """Check if the API key is expired"""
        if self.expires_at is None:
            return False
        return time.time() > self.expires_at
    
    def is_valid(self) -> bool:
        """Check if the API key is valid for use"""
        return self.is_active and not self.is_expired()
    
    def update_usage(self):
        """Update usage statistics"""
        self.last_used = int(time.time())
        self.usage_count += 1

class APIKeyManager:
    """Secure API key management system"""
    
    def __init__(self):
        self.keys_file = Path(os.getenv("API_KEYS_FILE", "./config/api_keys.json"))
        self.encryption_key = self._get_or_create_encryption_key()
        self.cipher = Fernet(self.encryption_key)
        self.keys: Dict[str, APIKey] = {}
        self.load_keys()
    
    def _get_or_create_encryption_key(self) -> bytes:
        """Get or create encryption key for API key storage"""
        key_file = Path(os.getenv("ENCRYPTION_KEY_FILE", "./config/encryption.key"))
        key_file.parent.mkdir(exist_ok=True)
        
        if key_file.exists():
            with open(key_file, 'rb') as f:
                return f.read()
        else:
            # Generate new encryption key
            key = Fernet.generate_key()
            with open(key_file, 'wb') as f:
                f.write(key)
            # Set restrictive permissions
            os.chmod(key_file, 0o600)
            return key
    
    def _hash_key(self, api_key: str) -> str:
        """Create a secure hash of the API key"""
        # Use PBKDF2 for key derivation
        import hashlib
        import base64
        
        salt = b"orbitr_api_salt_v1"  # Fixed salt for consistency
        key_hash = hashlib.pbkdf2_hmac('sha256', api_key.encode(), salt, 100000)
        return base64.b64encode(key_hash).decode()
    
    def generate_api_key(self, name: Optional[str] = None, 
                        expires_in_days: Optional[int] = None,
                        permissions: Optional[List[str]] = None) -> Tuple[str, str]:
        """Generate a new API key
        
        Returns:
            Tuple of (key_id, actual_api_key)
        """
        # Generate secure API key
        api_key = f"orbitr_{secrets.token_urlsafe(32)}"
        key_id = secrets.token_urlsafe(16)
        
        # Calculate expiration
        expires_at = None
        if expires_in_days:
            expires_at = int(time.time() + (expires_in_days * 24 * 3600))
        
        # Create API key object
        key_obj = APIKey(
            key_id=key_id,
            key_hash=self._hash_key(api_key),
            created_at=int(time.time()),
            expires_at=expires_at,
            permissions=permissions or ["generate", "cache", "health"],
            name=name
        )
        
        # Store the key
        self.keys[key_id] = key_obj
        self.save_keys()
        
        security_logger.log_security_event({
            "event_type": "api_key_generated",
            "key_id": key_id,
            "name": name,
            "expires_at": expires_at,
            "permissions": key_obj.permissions
        })
        
        return key_id, api_key
    
    def validate_api_key(self, api_key: str) -> Optional[APIKey]:
        """Validate an API key and return key object if valid"""
        key_hash = self._hash_key(api_key)
        
        for key_obj in self.keys.values():
            if key_obj.key_hash == key_hash:
                if key_obj.is_valid():
                    key_obj.update_usage()
                    self.save_keys()
                    return key_obj
                else:
                    if key_obj.is_expired():
                        security_logger.log_security_event({
                            "event_type": "api_key_expired_used",
                            "key_id": key_obj.key_id
                        })
                    return None
        
        return None
    
    def revoke_api_key(self, key_id: str) -> bool:
        """Revoke an API key"""
        if key_id in self.keys:
            self.keys[key_id].is_active = False
            self.save_keys()
            
            security_logger.log_security_event({
                "event_type": "api_key_revoked",
                "key_id": key_id
            })
            return True
        return False
    
    def rotate_api_key(self, key_id: str, expires_in_days: Optional[int] = None) -> Optional[Tuple[str, str]]:
        """Rotate an existing API key (create new, keep old temporarily)"""
        if key_id not in self.keys:
            return None
        
        old_key = self.keys[key_id]
        
        # Generate new key with same permissions and name
        new_key_id, new_api_key = self.generate_api_key(
            name=f"{old_key.name}_rotated" if old_key.name else None,
            expires_in_days=expires_in_days,
            permissions=old_key.permissions
        )
        
        # Mark old key for expiration in 24 hours (grace period)
        old_key.expires_at = int(time.time() + 24 * 3600)
        self.save_keys()
        
        security_logger.log_security_event({
            "event_type": "api_key_rotated",
            "old_key_id": key_id,
            "new_key_id": new_key_id
        })
        
        return new_key_id, new_api_key
    
    def cleanup_expired_keys(self):
        """Remove expired keys from storage"""
        current_time = time.time()
        expired_keys = []
        
        for key_id, key_obj in self.keys.items():
            if key_obj.expires_at and current_time > key_obj.expires_at + (7 * 24 * 3600):  # 7 days grace
                expired_keys.append(key_id)
        
        for key_id in expired_keys:
            del self.keys[key_id]
            security_logger.log_security_event({
                "event_type": "api_key_cleaned_up",
                "key_id": key_id
            })
        
        if expired_keys:
            self.save_keys()
    
    def get_key_info(self, key_id: str) -> Optional[Dict]:
        """Get information about an API key (excluding sensitive data)"""
        if key_id not in self.keys:
            return None
        
        key_obj = self.keys[key_id]
        return {
            "key_id": key_obj.key_id,
            "name": key_obj.name,
            "created_at": datetime.fromtimestamp(key_obj.created_at).isoformat(),
            "expires_at": datetime.fromtimestamp(key_obj.expires_at).isoformat() if key_obj.expires_at else None,
            "last_used": datetime.fromtimestamp(key_obj.last_used).isoformat() if key_obj.last_used else None,
            "usage_count": key_obj.usage_count,
            "is_active": key_obj.is_active,
            "permissions": key_obj.permissions,
            "is_expired": key_obj.is_expired()
        }
    
    def list_keys(self) -> List[Dict]:
        """List all API keys (excluding sensitive data)"""
        return [self.get_key_info(key_id) for key_id in self.keys.keys()]
    
    def get_usage_stats(self) -> Dict:
        """Get usage statistics for all keys"""
        total_keys = len(self.keys)
        active_keys = sum(1 for key in self.keys.values() if key.is_active)
        expired_keys = sum(1 for key in self.keys.values() if key.is_expired())
        total_usage = sum(key.usage_count for key in self.keys.values())
        
        return {
            "total_keys": total_keys,
            "active_keys": active_keys,
            "expired_keys": expired_keys,
            "total_usage": total_usage,
            "keys_by_permission": self._get_permission_stats()
        }
    
    def _get_permission_stats(self) -> Dict[str, int]:
        """Get statistics by permission type"""
        stats = {}
        for key in self.keys.values():
            for permission in key.permissions:
                stats[permission] = stats.get(permission, 0) + 1
        return stats
    
    def save_keys(self):
        """Save keys to encrypted file"""
        self.keys_file.parent.mkdir(exist_ok=True)
        
        # Convert to serializable format
        keys_data = {
            key_id: asdict(key_obj) for key_id, key_obj in self.keys.items()
        }
        
        # Encrypt and save
        encrypted_data = self.cipher.encrypt(json.dumps(keys_data).encode())
        with open(self.keys_file, 'wb') as f:
            f.write(encrypted_data)
        
        # Set restrictive permissions
        os.chmod(self.keys_file, 0o600)
    
    def load_keys(self):
        """Load keys from encrypted file"""
        if not self.keys_file.exists():
            return
        
        try:
            with open(self.keys_file, 'rb') as f:
                encrypted_data = f.read()
            
            decrypted_data = self.cipher.decrypt(encrypted_data)
            keys_data = json.loads(decrypted_data.decode())
            
            # Convert back to APIKey objects
            self.keys = {}
            for key_id, key_dict in keys_data.items():
                self.keys[key_id] = APIKey(**key_dict)
                
        except Exception as e:
            security_logger.log_security_event({
                "event_type": "api_key_load_error",
                "error": str(e)
            })
            # Initialize empty keys dict on error
            self.keys = {}

# Global API key manager instance
api_key_manager = APIKeyManager()

# Utility functions for integration
def validate_api_key_with_permissions(api_key: str, required_permission: str) -> Optional[APIKey]:
    """Validate API key and check permissions"""
    key_obj = api_key_manager.validate_api_key(api_key)
    if key_obj and required_permission in key_obj.permissions:
        return key_obj
    return None

def get_api_key_for_legacy_support() -> str:
    """Get or create API key for legacy configuration support"""
    # Check if we have a default key
    for key_obj in api_key_manager.keys.values():
        if key_obj.name == "default" and key_obj.is_valid():
            return "orbitr_" + secrets.token_urlsafe(32)  # We can't return the actual key
    
    # Create a default key if none exists
    key_id, api_key = api_key_manager.generate_api_key(
        name="default",
        expires_in_days=365,  # 1 year
        permissions=["generate", "cache", "health"]
    )
    
    return api_key

# Initialize cleanup task
def schedule_key_cleanup():
    """Schedule periodic cleanup of expired keys"""
    import threading
    import time
    
    def cleanup_task():
        while True:
            time.sleep(24 * 3600)  # Run daily
            api_key_manager.cleanup_expired_keys()
    
    cleanup_thread = threading.Thread(target=cleanup_task, daemon=True)
    cleanup_thread.start()

# Auto-start cleanup if module is imported
if __name__ != "__main__":
    schedule_key_cleanup()