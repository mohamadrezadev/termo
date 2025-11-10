from fastapi import APIRouter

from fastapi import FastAPI,Depends
from sqlalchemy import select
from sqlmodel import Session

from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import project, thermal, markers, regions
from app.db import init_db
from app.models.project import Project
from app.db.session import get_db

app = FastAPI(title="Thermal Inspection Backend (SQLite + PDF template)")

@app.on_event("startup")
def on_startup():
    init_db()
    
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


  # ensure tables exist

@app.get("/projects")
def read_projects(db: Session = Depends(get_db)):
    projects = db.exec(select(Project)).all()
    return projects

api_router = APIRouter()
api_router.include_router(project.router, prefix="/project", tags=["project"])
# api_router.include_router(upload.router, prefix="/upload", tags=["upload"])
api_router.include_router(thermal.router, prefix="/thermal", tags=["thermal"])
api_router.include_router(markers.router, prefix="/markers", tags=["markers"])
# api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
app.include_router(api_router)

# app.include_router(health.router, prefix="/health", tags=["health"])
