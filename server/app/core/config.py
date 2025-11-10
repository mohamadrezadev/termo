import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Thermal Analyzer Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = "sqlite:///./data/app.db"
    
    # Directories
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    PROJECTS_DIR: Path = DATA_DIR / "projects"
    TEMP_DIR: Path = DATA_DIR / "temp"
    FONTS_DIR: Path = BASE_DIR / "app" / "assets" / "fonts"
    
    # C# Extractor
    CSHARP_EXTRACTOR_PATH: str = os.getenv(
        "CSHARP_EXTRACTOR_PATH",
        r"D:\پروژه های دانش بنیان\termo2\termo\BmtExtract\BmtExtract\bin\Debug\net8.0\BmtExtract.exe"
    )
    
    # CORS
    BACKEND_CORS_ORIGINS: list = ["*"]
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 100 * 1024 * 1024  # 100MB
    
    class Config:
        case_sensitive = True
        env_file = ".env"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Create directories
        self.DATA_DIR.mkdir(exist_ok=True)
        self.PROJECTS_DIR.mkdir(exist_ok=True)
        self.TEMP_DIR.mkdir(exist_ok=True)
        self.FONTS_DIR.mkdir(parents=True, exist_ok=True)

settings = Settings()