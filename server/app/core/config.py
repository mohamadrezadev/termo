# server/app/core/config.py
from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Optional


class Settings(BaseSettings):
    """Application configuration settings"""
    
    # Application Info
    PROJECT_NAME: str = "Thermal Analyzer"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    PROJECTS_DIR: Path = BASE_DIR / "data" / "projects"
    
    # Database
    DATABASE_URL: str = "sqlite:///./thermal_analyzer.db"
    
    # API Settings
    API_V1_PREFIX: str = "/api/v1"
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 100 * 1024 * 1024  # 100 MB
    ALLOWED_EXTENSIONS: list = [".bmt", ".bmp", ".jpg", ".jpeg", ".png", ".tiff", ".tif"]
    
    # Thermal Processing
    BMT_EXTRACTOR_PATH: Optional[str] = None  # Path to C# BmtExtract.exe
    TEMP_FILE_CLEANUP_HOURS: int = 24
    
    # CORS
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:5000"]
    
    # Server
    HOST: str = "127.0.0.1"
    PORT: int = 8080
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Create global settings instance
settings = Settings()


# Ensure required directories exist
settings.PROJECTS_DIR.mkdir(parents=True, exist_ok=True)