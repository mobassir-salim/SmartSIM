import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SmartSIM Notification Router"
    API_V1_STR: str = "/api/v1"

    # Database
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "smartsim")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Channel Services URLs
    WHATSAPP_SERVICE_URL: str = os.getenv("WHATSAPP_SERVICE_URL", "http://whatsapp-service:8010/api/v1")
    SMS_SERVICE_URL: str = os.getenv("SMS_SERVICE_URL", "http://sms-service:8011/api/v1")
    EMAIL_SERVICE_URL: str = os.getenv("EMAIL_SERVICE_URL", "http://email-service:8012/api/v1")

    # Routing Rules
    APP_ENV: str = os.getenv("APP_ENV", "development")
    NOTIFICATION_MODE: str = os.getenv("NOTIFICATION_MODE", "TEST") # TEST or LIVE
    
    WHATSAPP_TEST_NUMBER: str = os.getenv("WHATSAPP_TEST_NUMBER", "919999999999")
    SMS_TEST_NUMBER: str = os.getenv("SMS_TEST_NUMBER", "919999999999")
    EMAIL_TEST_ADDRESS: str = os.getenv("EMAIL_TEST_ADDRESS", "test@smartsim.local")

    class Config:
        case_sensitive = True

settings = Settings()
