import os
from typing import Optional, List
from pydantic_settings import BaseSettings
from pydantic import Field, validator
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    """Application settings with production-ready configuration."""
    
    # ============ Application Meta ============
    APP_NAME: str = "WatchTowerAI"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")  # development, staging, production
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # ============ MongoDB Settings ============
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "watchtower")
    ENABLE_FALLBACK_MODE: bool = os.getenv("ENABLE_FALLBACK_MODE", "false").lower() == "true"
    
    # ============ Authentication & Security ============
    API_KEY: str = os.getenv("API_KEY", "test_api_key")
    AUTH_TOKEN: str = os.getenv("AUTH_TOKEN", "demo_token_test")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    TOKEN_EXPIRE_MINUTES: int = int(os.getenv("TOKEN_EXPIRE_MINUTES", "60"))
    
    # ============ CORS Settings ============
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:3000,https://watchtowerai.onrender.com")
    CORS_ALLOW_CREDENTIALS: bool = os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() == "true"
    CORS_ALLOW_METHODS: str = os.getenv("CORS_ALLOW_METHODS", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
    CORS_ALLOW_HEADERS: str = os.getenv("CORS_ALLOW_HEADERS", "Content-Type,Authorization,X-API-Key")
    CORS_EXPOSE_HEADERS: str = os.getenv("CORS_EXPOSE_HEADERS", "X-Total-Count,X-Page-Count")
    
    # ============ Rate Limiting ============
    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
    RATE_LIMIT_PERIOD: int = int(os.getenv("RATE_LIMIT_PERIOD", "60"))  # seconds
    
    # ============ AI/ML Configuration ============
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
    GEMINI_TIMEOUT: int = int(os.getenv("GEMINI_TIMEOUT", "30"))
    AI_CLASSIFICATION_ENABLED: bool = os.getenv("AI_CLASSIFICATION_ENABLED", "true").lower() == "true"
    FALLBACK_MODE_ON_AI_FAILURE: bool = os.getenv("FALLBACK_MODE_ON_AI_FAILURE", "true").lower() == "true"
    
    # ============ Email/SMTP Settings ============
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "noreply@watchtowerai.com")
    ALERT_RECIPIENT: str = os.getenv("ALERT_RECIPIENT", "admin@watchtowerai.com")
    ENABLE_EMAIL_ALERTS: bool = os.getenv("ENABLE_EMAIL_ALERTS", "false").lower() == "true"
    
    # ============ Redis Settings (for caching and rate limiting) ============
    REDIS_URL: Optional[str] = os.getenv("REDIS_URL", None)
    REDIS_CACHE_TTL: int = int(os.getenv("REDIS_CACHE_TTL", "300"))  # 5 minutes
    REDIS_RETRY_ON_TIMEOUT: bool = os.getenv("REDIS_RETRY_ON_TIMEOUT", "true").lower() == "true"
    
    # ============ Monitoring & Observability ============
    SENTRY_DSN: Optional[str] = os.getenv("SENTRY_DSN", None)
    SENTRY_ENABLED: bool = os.getenv("SENTRY_ENABLED", "false").lower() == "true"
    SENTRY_ENVIRONMENT: str = ENVIRONMENT
    SENTRY_TRACES_SAMPLE_RATE: float = float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1"))
    ENABLE_METRICS: bool = os.getenv("ENABLE_METRICS", "true").lower() == "true"
    ENABLE_TRACING: bool = os.getenv("ENABLE_TRACING", "false").lower() == "true"
    
    # ============ Logging ============
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO" if ENVIRONMENT == "production" else "DEBUG")
    LOG_DIR: str = os.getenv("LOG_DIR", "logs")
    LOG_RETENTION_DAYS: int = int(os.getenv("LOG_RETENTION_DAYS", "30"))
    
    # ============ Request/Response ============
    MAX_REQUEST_SIZE: int = int(os.getenv("MAX_REQUEST_SIZE", "10485760"))  # 10MB
    REQUEST_TIMEOUT: int = int(os.getenv("REQUEST_TIMEOUT", "30"))
    REQUEST_ID_HEADER: str = "X-Request-ID"
    
    # ============ Database Pooling ============
    DB_POOL_MIN_SIZE: int = int(os.getenv("DB_POOL_MIN_SIZE", "5"))
    DB_POOL_MAX_SIZE: int = int(os.getenv("DB_POOL_MAX_SIZE", "20"))
    DB_CONNECT_TIMEOUT: int = int(os.getenv("DB_CONNECT_TIMEOUT", "10"))
    DB_RETRY_ATTEMPTS: int = int(os.getenv("DB_RETRY_ATTEMPTS", "3"))
    
    # ============ Data Retention (in days) ============
    LOG_RETENTION_DAYS: int = int(os.getenv("LOG_RETENTION_DAYS", "30"))
    ALERT_RETENTION_DAYS: int = int(os.getenv("ALERT_RETENTION_DAYS", "90"))
    METRIC_RETENTION_DAYS: int = int(os.getenv("METRIC_RETENTION_DAYS", "90"))
    API_MONITOR_RETENTION_DAYS: int = int(os.getenv("API_MONITOR_RETENTION_DAYS", "7"))
    
    # ============ Feature Flags ============
    ENABLE_BACKGROUND_TASKS: bool = os.getenv("ENABLE_BACKGROUND_TASKS", "true").lower() == "true"
    ENABLE_API_MONITORING: bool = os.getenv("ENABLE_API_MONITORING", "true").lower() == "true"
    ENABLE_LOG_SEARCH: bool = os.getenv("ENABLE_LOG_SEARCH", "true").lower() == "true"
    ENABLE_METRICS_AGGREGATION: bool = os.getenv("ENABLE_METRICS_AGGREGATION", "true").lower() == "true"
    
    # ============ Performance Optimization ============
    CACHE_ENABLED: bool = os.getenv("CACHE_ENABLED", "true").lower() == "true"
    CACHE_TTL: int = int(os.getenv("CACHE_TTL", "300"))
    ENABLE_QUERY_OPTIMIZATION: bool = os.getenv("ENABLE_QUERY_OPTIMIZATION", "true").lower() == "true"
    MAX_BATCH_SIZE: int = int(os.getenv("MAX_BATCH_SIZE", "1000"))

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
    
    @validator("ENVIRONMENT")
    def validate_environment(cls, v):
        """Validate environment is one of allowed values."""
        valid_environments = ["development", "staging", "production"]
        if v not in valid_environments:
            raise ValueError(f"ENVIRONMENT must be one of: {', '.join(valid_environments)}")
        return v
    
    @validator("LOG_LEVEL")
    def validate_log_level(cls, v):
        """Validate log level is valid."""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(f"LOG_LEVEL must be one of: {', '.join(valid_levels)}")
        return v.upper()
    
    @validator("RATE_LIMIT_REQUESTS")
    def validate_rate_limit_requests(cls, v):
        """Ensure rate limit requests is positive."""
        if v <= 0:
            raise ValueError("RATE_LIMIT_REQUESTS must be > 0")
        return v
    
    @validator("RATE_LIMIT_PERIOD")
    def validate_rate_limit_period(cls, v):
        """Ensure rate limit period is positive."""
        if v <= 0:
            raise ValueError("RATE_LIMIT_PERIOD must be > 0")
        return v
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.ENVIRONMENT == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.ENVIRONMENT == "development"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Get CORS origins as a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    @property
    def cors_methods_list(self) -> List[str]:
        """Get CORS methods as a list."""
        return [method.strip() for method in self.CORS_ALLOW_METHODS.split(",")]
    
    @property
    def cors_headers_list(self) -> List[str]:
        """Get CORS headers as a list."""
        return [header.strip() for header in self.CORS_ALLOW_HEADERS.split(",")]


# Create a settings instance
settings = Settings()

# Validate critical settings in production
if settings.is_production:
    errors = []
    
    if settings.API_KEY == "test_api_key":
        errors.append("⚠️ CRITICAL: API_KEY must be changed from default in production!")
    
    if settings.AUTH_TOKEN == "demo_token_test":
        errors.append("⚠️ CRITICAL: AUTH_TOKEN must be changed from default in production!")
    
    if settings.SECRET_KEY == "your-secret-key-change-in-production":
        errors.append("⚠️ CRITICAL: SECRET_KEY must be changed in production!")
    
    if not settings.GEMINI_API_KEY:
        errors.append("⚠️ WARNING: GEMINI_API_KEY not set. AI features will be disabled.")
    
    if not settings.DEBUG and settings.DEBUG is not False:
        errors.append("⚠️ WARNING: DEBUG should be explicitly set to 'false' in production")
    
    if settings.ENABLE_EMAIL_ALERTS and not (settings.SMTP_SERVER and settings.SMTP_USERNAME and settings.SMTP_PASSWORD):
        errors.append("⚠️ CRITICAL: Email alerts enabled but SMTP not configured!")
    
    # Log errors (don't fail immediately, just warn)
    for error in errors:
        print(error)
    
    # Raise error if critical issues found
    critical_errors = [e for e in errors if "CRITICAL" in e]
    if critical_errors:
        raise ValueError("\n".join(critical_errors))
