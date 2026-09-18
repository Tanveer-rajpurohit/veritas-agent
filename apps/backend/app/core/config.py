import json

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Veritas API"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    BEDROCK_AGENT_ENABLED: bool = False
    AGENT_MAX_TOKENS: int = 2048
    AGENT_TEMPERATURE: float = 0.1

    GROQ_API_KEY: str = ""
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    AWS_REGION: str = "ap-south-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_BEDROCK_MODEL_ID: str = "amazon.nova-lite-v1:0"

    DATABASE_URL: str = "postgresql+psycopg://veritas:veritas_password@localhost:5432/veritas"
    SOURCE_STORAGE_BACKEND: str = "local"
    SOURCE_STORAGE_PATH: str = "./data/sources"
    OCR_PROVIDER: str = "local"

    EMBEDDING_PROVIDER: str = "local"
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    EMBEDDING_DIMENSION: int = 384

    WRITER_RETRIEVAL_LIMIT: int = 8
    WRITER_MAX_EVIDENCE_TOKENS: int = 6000

    LEGAL_STATUTE_PROVIDER: str = "ecourts_india"
    LEGAL_CASE_PROVIDER: str = "ecourts_india"
    ECOURTS_INDIA_BASE_URL: str = "https://indiacode.ecourtsindia.com/api/v1"
    INDIAN_KANOON_API_TOKEN: str = ""
    INDIAN_KANOON_BASE_URL: str = "https://api.indiankanoon.org"
    LEGAL_SOURCE_TIMEOUT_SECONDS: float = 10.0
    LEGAL_SOURCE_MAX_RESPONSE_BYTES: int = 2000000
    LEGAL_SOURCE_CACHE_TTL_SECONDS: int = 86400

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, list):
            return [str(origin).strip().rstrip("/") for origin in value if origin]

        value = value.strip()
        if value.startswith("["):
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return [str(origin).strip().rstrip("/") for origin in parsed if origin]

        return [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]

    @property
    def active_agent_provider(self) -> str:
        return "bedrock" if self.BEDROCK_AGENT_ENABLED else "groq"

    @property
    def active_agent_model(self) -> str:
        if self.BEDROCK_AGENT_ENABLED:
            return self.AWS_BEDROCK_MODEL_ID
        return self.GROQ_MODEL

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
