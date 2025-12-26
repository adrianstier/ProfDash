"""Configuration settings for the AI service."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # LLM Provider
    llm_provider: Literal["anthropic", "openai"] = "anthropic"

    # API Keys
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    # Model Configuration
    anthropic_model: str = "claude-3-haiku-20240307"
    openai_model: str = "gpt-4o-mini"

    # Service Configuration
    api_key: str = ""  # For authenticating requests from Next.js
    cors_origins: str = "http://localhost:3000"

    # Rate Limiting
    rate_limit_requests: int = 100
    rate_limit_window: int = 60  # seconds

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
