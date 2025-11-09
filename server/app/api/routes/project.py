from fastapi import APIRouter, Body, HTTPException
from uuid import uuid4
from sqlmodel import Session
from app.db.database import init_db, get_session
from app.db.models import Project
from app.core.file_utils import ensure_project_dirs
from fastapi import Depends

router = APIRouter()

@router.on_event("startup")
def startup():
    init_db()

@router.post("/create")
def create_project(payload: dict = Body(...)):
    pid = uuid4().hex
    p = Project(id=pid, name=payload.get("name","بدون نام"), description=payload.get("description"), device=payload.get("device"), customer=payload.get("customer"), logo_path=payload.get("logo_path"))
    with next(get_session()) as session:
        session.add(p); session.commit()
    ensure_project_dirs(pid)
    return {"project_id": pid}

@router.get("/{project_id}")
def get_project(project_id: str):
    with next(get_session()) as session:
        p = session.get(Project, project_id)
        if not p:
            raise HTTPException(status_code=404, detail="Project not found")
        return p
