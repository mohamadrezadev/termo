from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from uuid import UUID

from app.db.session import get_db

from app.models.project import Project
from app.services.file_manager import FileManager
from schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectDetailResponse
)
router = APIRouter()

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db)
) -> Project:
    """Create new project"""
    project = Project(**project_in.dict())
    db.add(project)
    db.commit()
    db.refresh(project)
    
    # Create project directories
    file_manager = FileManager()
    file_manager.create_project_directories(str(project.id))
    
    return project

@router.get("/", response_model=List[ProjectResponse])
def list_projects(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
) -> List[Project]:
    """Get all projects"""
    statement = select(Project).offset(skip).limit(limit)
    projects = db.exec(statement).all()
    return projects

@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project(
    project_id: UUID,
    db: Session = Depends(get_db)
) -> Project:
    """Get project by ID with all related data"""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return project

@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: UUID,
    project_in: ProjectUpdate,
    db: Session = Depends(get_db)
) -> Project:
    """Update project"""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    update_data = project_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    from datetime import datetime
    project.updated_at = datetime.utcnow()
    
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete project and all related data"""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Delete project files
    file_manager = FileManager()
    file_manager.delete_project_directory(str(project_id))
    
    db.delete(project)
    db.commit()
    return None