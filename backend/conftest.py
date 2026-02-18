import pytest
from app import limiter


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset in-memory rate limiter storage before each test to prevent 429 bleed-over."""
    limiter._storage.reset()
    yield
