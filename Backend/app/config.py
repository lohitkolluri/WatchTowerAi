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

    # Gemini API
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # SMTP Settings
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "")
    ALERT_RECIPIENT: str = os.getenv("ALERT_RECIPIENT", "")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

# Create a settings instance
settings = Settings()
