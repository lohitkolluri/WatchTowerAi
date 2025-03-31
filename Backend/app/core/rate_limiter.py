import time
from typing import Optional
import aioredis
from loguru import logger

class RateLimiter:
    def __init__(
        self,
        max_requests: int,
        window_seconds: int,
        redis_url: Optional[str] = None
    ):
        """Initialize rate limiter with Redis backend."""
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.redis_url = redis_url or "redis://localhost:6379/0"
        self._redis: Optional[aioredis.Redis] = None

    async def _get_redis(self) -> aioredis.Redis:
        """Get Redis connection with lazy initialization."""
        if self._redis is None:
            try:
                self._redis = await aioredis.from_url(
                    self.redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                )
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {e}")
                # Fallback to in-memory storage
                self._redis = InMemoryRateLimiter(
                    self.max_requests,
                    self.window_seconds,
                )
        return self._redis

    async def is_allowed(self, client_id: str) -> bool:
        """Check if request is allowed based on rate limit."""
        redis = await self._get_redis()
        current_time = int(time.time())
        key = f"ratelimit:{client_id}"

        try:
            # Use Redis pipeline for atomic operations
            async with redis.pipeline(transaction=True) as pipe:
                # Remove old requests outside the window
                await pipe.zremrangebyscore(
                    key,
                    0,
                    current_time - self.window_seconds,
                )

                # Count requests in current window
                await pipe.zcard(key)

                # Add current request timestamp
                await pipe.zadd(key, {str(current_time): current_time})

                # Set expiry on the key
                await pipe.expire(key, self.window_seconds)

                # Execute pipeline
                results = await pipe.execute()

            request_count = results[1]
            return request_count < self.max_requests

        except Exception as e:
            logger.error(f"Rate limiter error: {e}")
            # Allow request on error to prevent blocking users
            return True

class InMemoryRateLimiter:
    """Fallback in-memory rate limiter when Redis is unavailable."""
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._storage = {}

    async def zremrangebyscore(self, key: str, min_score: int, max_score: int) -> None:
        if key in self._storage:
            self._storage[key] = {
                ts: score for ts, score in self._storage[key].items()
                if score > max_score
            }

    async def zcard(self, key: str) -> int:
        return len(self._storage.get(key, {}))

    async def zadd(self, key: str, mapping: dict) -> None:
        if key not in self._storage:
            self._storage[key] = {}
        self._storage[key].update(mapping)

    async def expire(self, key: str, seconds: int) -> None:
        # Cleanup happens in zremrangebyscore
        pass

    async def pipeline(self, transaction: bool = True):
        return self
