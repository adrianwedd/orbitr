"""
Shared pytest configuration for backend tests.

Environment variables that affect security_config must be set HERE, before any
module-level import of app.py, because security_config is initialised as a
module-level singleton when app.py is first imported.  test_security.py sets
the same vars but conftest.py is always loaded first, so those assignments
arrive too late to affect the singleton.
"""
import os
import pytest

# Set test-friendly limits before the app module is imported.
os.environ["GENERATION_RATE_LIMIT"] = "1000"
os.environ["CACHE_RATE_LIMIT"] = "1000"
os.environ["HEALTH_RATE_LIMIT"] = "1000"
os.environ["MAX_PROMPT_LENGTH"] = "100"
os.environ["MAX_GENERATION_DURATION"] = "2.0"
os.environ["MAX_CONCURRENT_GENERATIONS"] = "2"
os.environ["GENERATION_TIMEOUT"] = "10"
# Prevent IP blocks from accumulating across tests that deliberately test 401 responses
os.environ["MAX_FAILED_ATTEMPTS"] = "1000"

import app as _app  # noqa: E402 — must come after env-var setup

limiter = _app.limiter


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset in-memory rate limiter storage and generation counter before each test."""
    _app.current_generations = 0
    limiter._storage.reset()
    yield
