import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SmartSIM Order Service"
    API_V1_STR: str = "/api"

    # Database
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "smartsim")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # JWT Settings
    JWT_SECRET: str = os.getenv("JWT_SECRET", "supersecretkeychangeinproduction1234567890!")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Service-to-service endpoints inside Docker
    WALLET_SERVICE_URL: str = os.getenv("WALLET_SERVICE_URL", "http://wallet-service:8004")
    SIM_SERVICE_URL: str = os.getenv("SIM_SERVICE_URL", "http://sim-service:8002")
    PLAN_SERVICE_URL: str = os.getenv("PLAN_SERVICE_URL", "http://plan-service:8003")

    class Config:
        case_sensitive = True

settings = Settings()
