from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./watchtower.db"
    GEMINI_API_KEY: str
    SMTP_SERVER: str
    SMTP_PORT: int = 587
    SMTP_USERNAME: str
    SMTP_PASSWORD: str
    EMAIL_FROM: str
    ALERT_RECIPIENT: str

    class Config:
        env_file = ".env"

settings = Settings()
