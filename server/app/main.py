from fastapi import APIRouter

from fastapi import FastAPI,Depends
from sqlalchemy import select
from sqlmodel import Session
from app.db import database
from app.db.models import Project

from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import project, upload, thermal, markers, reports,health

app = FastAPI(title="Thermal Inspection Backend (SQLite + PDF template)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    database.init_db()  # ensure tables exist

@app.get("/projects")
def read_projects(session: Session = Depends(database.get_session)):
    projects = session.exec(select(Project)).all()
    return projects

api_router = APIRouter()
api_router.include_router(project.router, prefix="/project", tags=["project"])
api_router.include_router(upload.router, prefix="/upload", tags=["upload"])
api_router.include_router(thermal.router, prefix="/thermal", tags=["thermal"])
api_router.include_router(markers.router, prefix="/markers", tags=["markers"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
app.include_router(api_router)

# app.include_router(health.router, prefix="/health", tags=["health"])
