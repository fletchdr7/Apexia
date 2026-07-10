from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration read from environment variables / .env."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # OpenAI (or compatible) API. If unset the backend falls back to heuristics.
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_vision_model: str = "gpt-4o"

    # Optional: verify Supabase user JWTs on protected endpoints.
    supabase_jwt_secret: str = ""
    require_auth: bool = False

    # CORS
    allowed_origins: str = "*"

    @property
    def has_openai(self) -> bool:
        return bool(self.openai_api_key)

    @property
    def cors_origins(self) -> list[str]:
        if self.allowed_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
