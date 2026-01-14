# config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "Dino API"
    admin_email: str
    items_per_user: int = 50

    class Config:
        env_file = ".env"

settings = Settings()
