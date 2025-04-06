import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    # MongoDB settings
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "watchtower")

    # Add fallback mode option for development/testing
    ENABLE_FALLBACK_MODE: bool = os.getenv("ENABLE_FALLBACK_MODE", "false").lower() == "true"

    # Authentication
    API_KEY: str = os.getenv("API_KEY", "test_api_key")
    AUTH_TOKEN: str = os.getenv("AUTH_TOKEN", "demo_token_test")

    # CORS Settings
    CORS_ORIGINS: list[str] = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,https://watchtowerai.onrender.com").split(",")]
    CORS_ALLOW_CREDENTIALS: bool = os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() == "true"
    CORS_ALLOW_METHODS: list[str] = [method.strip() for method in os.getenv("CORS_ALLOW_METHODS", "*").split(",")]
    CORS_ALLOW_HEADERS: list[str] = [header.strip() for header in os.getenv("CORS_ALLOW_HEADERS", "*").split(",")]
    CORS_EXPOSE_HEADERS: list[str] = [header.strip() for header in os.getenv("CORS_EXPOSE_HEADERS", "*").split(",")]

    # Gemini API
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # SMTP Settings
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "")
    ALERT_RECIPIENT: str = os.getenv("ALERT_RECIPIENT", "")

    # JWT Settings
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-secret-key-for-jwt-replace-in-production")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

# Create a settings instance
settings = Settings()
