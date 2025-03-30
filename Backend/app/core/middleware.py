import time
from typing import Callable
import uuid
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from starlette.middleware.base import BaseHTTPMiddleware
from loguru import logger
from .rate_limiter import RateLimiter

def setup_middleware(app: FastAPI, config: dict) -> None:
    """Configure middleware for the application."""
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config["CORS_ORIGINS"].split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Add trusted host middleware
    if config["ENVIRONMENT"] == "production":
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=["api.watchtowerai.com"],
        )

    # Add custom middleware
    app.add_middleware(RequestTracingMiddleware)

    # Add rate limiting if enabled
    if config["RATE_LIMIT_ENABLED"]:
        app.add_middleware(
            RateLimitMiddleware,
            max_requests=config["RATE_LIMIT_MAX_REQUESTS"],
            window_seconds=config["RATE_LIMIT_WINDOW_SECONDS"],
        )

    # Add metrics instrumentation
    Instrumentator().instrument(app).expose(app)

class RequestTracingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate correlation ID
        correlation_id = str(uuid.uuid4())
        request.state.correlation_id = correlation_id

        # Start timer
        start_time = time.time()

        try:
            # Add correlation ID to logger context
            with logger.contextualize(
                correlation_id=correlation_id,
                user_id=request.headers.get("X-User-ID", "anonymous"),
            ):
                # Log request
                logger.info(
                    f"Incoming request | {request.method} {request.url.path}",
                    extra={
                        "headers": dict(request.headers),
                        "query_params": dict(request.query_params),
                    },
                )

                # Process request
                response = await call_next(request)

                # Calculate duration
                duration = time.time() - start_time

                # Log response
                logger.info(
                    f"Request completed | {response.status_code} | {duration:.2f}s",
                    extra={
                        "status_code": response.status_code,
                        "duration": duration,
                    },
                )

                # Add correlation ID to response headers
                response.headers["X-Correlation-ID"] = correlation_id
                response.headers["X-Response-Time"] = f"{duration:.2f}s"

                return response

        except Exception as e:
            # Log error
            logger.exception("Request failed")
            duration = time.time() - start_time

            # Re-raise for FastAPI's exception handlers
            raise

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app: FastAPI,
        max_requests: int = 100,
        window_seconds: int = 60,
    ):
        super().__init__(app)
        self.limiter = RateLimiter(max_requests, window_seconds)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for certain paths
        if request.url.path.startswith(("/docs", "/redoc", "/metrics")):
            return await call_next(request)

        # Get client identifier (IP or API key)
        client_id = request.headers.get("X-API-Key") or request.client.host

        # Check rate limit
        if not await self.limiter.is_allowed(client_id):
            logger.warning(f"Rate limit exceeded for {client_id}")
            return Response(
                content="Rate limit exceeded",
                status_code=429,
                headers={"Retry-After": str(self.limiter.window_seconds)},
            )

        return await call_next(request)
