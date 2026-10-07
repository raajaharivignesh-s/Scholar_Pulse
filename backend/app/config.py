from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://scholarpulse:scholarpulse_dev@localhost:5432/scholarpulse"
    redis_url: str = "redis://localhost:6379/0"
    qdrant_url: str = "http://localhost:6333"

    jwt_secret: str = "change-me"
    llm_api_key: str = ""
    llm_base_url: str = ""
    llm_model: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()
