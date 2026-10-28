import os
from pathlib import Path
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_REPO_ROOT = _BACKEND_DIR.parent


class Settings(BaseSettings):
    """
    Central application configuration loaded from environment variables and .env file.
    """
    PROJECT_NAME: str = "SIH26264 Complaint Intelligence"
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "dev_secret_key_change_in_production_min_32_characters_long_sih26264"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    
    # PostgreSQL Configuration Template
    # Initial setup does not require a running live database connection
    DATABASE_URL: str = "postgresql+psycopg2://aicte_admin:postgres_dev_password@localhost:5432/aicte_complaints"
    
    # CORS Origins
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]
    
    # Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 25

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, str) and v.startswith("["):
            import json
            try:
                return json.loads(v)
            except Exception:
                return ["*"]
        return v

    model_config = SettingsConfigDict(
        env_file=(_BACKEND_DIR / ".env", _REPO_ROOT / ".env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )


settings = Settings()
