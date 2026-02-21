from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/suggar_daddy"
    redis_url: str = "redis://localhost:6379"
    kafka_bootstrap_servers: str = "localhost:9092"
    embedding_dimensions: int = 128
    model_update_cron_hour: int = 3
    port: int = 5000
    log_level: str = "info"

    # Recommendation parameters
    max_recommendations: int = 100
    ml_recs_cache_ttl: int = 3600  # 1 hour
    min_interactions_for_training: int = 10

    class Config:
        env_file = ".env"


settings = Settings()
