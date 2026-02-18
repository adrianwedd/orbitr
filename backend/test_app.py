import pytest
import json
import base64
from fastapi.testclient import TestClient
from app import app, get_cache_key, audio_to_base64_wav, generate_fake_audio, GenerateRequest

client = TestClient(app)

class TestAPIEndpoints:
    
    def test_root_endpoint(self):
        """Test the root health check endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] == "Orbitr AI Backend Running"
    
    def test_generate_endpoint_basic(self):
        """Test basic sample generation"""
        request_data = {
            "prompt": "test drum hit",
            "duration": 0.5,
            "quality": "draft"
        }
        
        response = client.post("/generate", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "audio" in data
        assert "name" in data
        assert "seed" in data
        
        # Verify audio is base64 encoded
        try:
            audio_data = base64.b64decode(data["audio"])
            assert len(audio_data) > 0
        except Exception:
            pytest.fail("Audio data is not valid base64")
    
    def test_generate_endpoint_with_seed(self):
        """Test generation with specific seed for reproducibility"""
        request_data = {
            "prompt": "kick drum",
            "duration": 1.0,
            "seed": 42
        }
        
        response = client.post("/generate", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["seed"] == 42
    
    def test_generate_endpoint_invalid_data(self):
        """Test error handling for invalid request data"""
        response = client.post("/generate", json={"invalid": "data"})
        assert response.status_code == 422  # Validation error
    
    def test_cache_endpoints(self):
        """Test cache management endpoints"""
        # Test cache size endpoint
        response = client.get("/cache/size")
        assert response.status_code == 200
        
        data = response.json()
        assert "files" in data
        assert "size_mb" in data
        assert isinstance(data["files"], int)
        assert isinstance(data["size_mb"], (int, float))
        
        # Test cache clear endpoint (DELETE, not GET)
        response = client.delete("/cache/clear")
        assert response.status_code == 200
        assert "message" in response.json()

class TestUtilityFunctions:
    
    def test_get_cache_key(self):
        """Test cache key generation"""
        req1 = GenerateRequest(prompt="test", duration=1.0, quality="draft")
        req2 = GenerateRequest(prompt="test", duration=1.0, quality="draft")
        req3 = GenerateRequest(prompt="different", duration=1.0, quality="draft")
        
        # Same requests should generate same key
        assert get_cache_key(req1) == get_cache_key(req2)
        
        # Different requests should generate different keys
        assert get_cache_key(req1) != get_cache_key(req3)
        
        # Key should be MD5 hash (32 hex characters)
        key = get_cache_key(req1)
        assert len(key) == 32
        assert all(c in "0123456789abcdef" for c in key)
    
    def test_generate_fake_audio(self):
        """Test fake audio generation for testing"""
        duration = 1.0
        sample_rate = 32000
        
        audio = generate_fake_audio(duration, sample_rate)
        
        # Check audio properties
        expected_samples = int(duration * sample_rate)
        assert len(audio) == expected_samples
        assert audio.dtype.name == 'float32'
        
        # Audio should be normalized between -1 and 1
        assert audio.min() >= -1.0
        assert audio.max() <= 1.0
    
    def test_audio_to_base64_wav(self):
        """Test audio to base64 WAV conversion"""
        # Generate test audio
        audio = generate_fake_audio(0.5)
        
        # Convert to base64 WAV
        base64_wav = audio_to_base64_wav(audio)
        
        # Should be valid base64
        try:
            decoded = base64.b64decode(base64_wav)
            assert len(decoded) > 0
        except Exception:
            pytest.fail("Generated data is not valid base64")
        
        # WAV files start with 'RIFF' header
        wav_data = base64.b64decode(base64_wav)
        assert wav_data[:4] == b'RIFF'

class TestCacheManagement:
    
    def test_cache_key_consistency(self):
        """Test that identical requests generate identical cache keys"""
        params = {
            "prompt": "techno kick",
            "duration": 1.5,
            "quality": "draft",
            "seed": 123,
            "temperature": 1.0,
            "top_k": 250,
            "top_p": 0.0,
            "cfg_coef": 3.0
        }
        
        req1 = GenerateRequest(**params)
        req2 = GenerateRequest(**params)
        
        assert get_cache_key(req1) == get_cache_key(req2)
    
    def test_cache_behavior_with_generation(self):
        """Test that cache works correctly with actual generation"""
        request_data = {
            "prompt": "cached test drum",
            "duration": 0.3,
            "seed": 999
        }
        
        # First request - should generate and cache
        response1 = client.post("/generate", json=request_data)
        assert response1.status_code == 200
        data1 = response1.json()
        assert data1.get("cached", False) == False
        
        # Second identical request - should return cached result
        response2 = client.post("/generate", json=request_data)
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Results should be identical
        assert data1["audio"] == data2["audio"]
        assert data1["seed"] == data2["seed"]

class TestGenerationParameters:
    
    def test_duration_parameter(self):
        """Test different duration values"""
        for duration in [0.2, 0.5, 1.0, 2.0]:
            request_data = {
                "prompt": f"test {duration}s",
                "duration": duration
            }
            
            response = client.post("/generate", json=request_data)
            assert response.status_code == 200
    
    def test_quality_modes(self):
        """Test different quality modes"""
        for quality in ["draft", "high"]:
            request_data = {
                "prompt": f"test {quality}",
                "duration": 0.5,
                "quality": quality
            }
            
            response = client.post("/generate", json=request_data)
            assert response.status_code == 200
    
    def test_temperature_parameter(self):
        """Test temperature parameter range"""
        for temperature in [0.5, 1.0, 1.5]:
            request_data = {
                "prompt": "test temperature",
                "duration": 0.5,
                "temperature": temperature
            }
            
            response = client.post("/generate", json=request_data)
            assert response.status_code == 200

if __name__ == "__main__":
    pytest.main([__file__, "-v"])