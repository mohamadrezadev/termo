from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    PROJECT_NAME: str = "Thermal Analyzer"
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    PROJECTS_DIR: Path = BASE_DIR / "projects"

    DATABASE_URL: str = "sqlite:///./app.db"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
