from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://biasdetector:biasdetector@db:5432/biasdetector"
    LLM_PROVIDER: Literal["openai", "anthropic", "gemini"] = "openai"
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
