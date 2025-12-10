from select import select
from fastapi import FastAPI
from fastapi.concurrency import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.params import Depends
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session
from pathlib import Path as SysPath  # تغییر نام برای جلوگیری از تداخل

from app.core.config import settings
from app.api.v1.router import api_router
from app.db.session import get_db, init_db  # استفاده از init_db از session
from app.models.project import Project

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("\n" + "="*60)
    print("🚀 Starting Thermal Analyzer API Server")
    print("="*60)
    init_db()  # خودکار دیتابیس رو می‌سازه
    print("="*60 + "\n")
    yield
    # Shutdown
    pass

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
BASE_DIR = SysPath(__file__).resolve().parents[2]  # روت پروژه (termo)
PROJECTS_DIR = BASE_DIR / "projects"
PROJECTS_DIR.mkdir(exist_ok=True)  # اگر نبود ایجادش کن
app.mount("/files/projects", StaticFiles(directory=str(PROJECTS_DIR)), name="projects")

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "running"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/projects")
def read_projects(db: Session = Depends(get_db)):
    projects = db.exec(select(Project)).all()
    return projects


