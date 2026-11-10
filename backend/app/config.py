from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://scholarpulse:scholarpulse_dev@localhost:5432/scholarpulse"
    redis_url: str = "redis://localhost:6379/0"
    qdrant_url: str = "http://localhost:6333"

    jwt_secret: str = "change-me"
    gemini_api_key: str = ""
    llm_api_key: str = ""
    llm_base_url: str = ""
    llm_model: str = "gemini-3.8-flash"
    use_celery: bool = True

    model_config = SettingsConfigDict(
        env_file=[".env", "../.env"],
        extra="ignore",
    )


settings = Settings()
