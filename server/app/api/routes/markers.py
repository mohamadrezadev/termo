from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from uuid import UUID

from app.api.deps import get_db
from app.models.marker import Marker
from app.schemas.marker import MarkerCreate, MarkerUpdate, MarkerResponse

router = APIRouter()

@router.post("/", response_model=MarkerResponse, status_code=status.HTTP_201_CREATED)
def create_marker(
    marker_in: MarkerCreate,
    db: Session = Depends(get_db)
) -> Marker:
    """Create new marker"""
    marker = Marker(**marker_in.dict())
    db.add(marker)
    db.commit()
    db.refresh(marker)
    return marker

@router.get("/project/{project_id}", response_model=List[MarkerResponse])
def list_project_markers(
    project_id: UUID,
    db: Session = Depends(get_db)
) -> List[Marker]:
    """Get all markers for a project"""
    statement = select(Marker).where(Marker.project_id == project_id)
    markers = db.exec(statement).all()
    return markers

@router.get("/image/{image_id}", response_model=List[MarkerResponse])
def list_image_markers(
    image_id: UUID,
    db: Session = Depends(get_db)
) -> List[Marker]:
    """Get all markers for an image"""
    statement = select(Marker).where(Marker.image_id == image_id)
    markers = db.exec(statement).all()
    return markers

@router.patch("/{marker_id}", response_model=MarkerResponse)
def update_marker(
    marker_id: UUID,
    marker_in: MarkerUpdate,
    db: Session = Depends(get_db)
) -> Marker:
    """Update marker"""
    marker = db.get(Marker, marker_id)
    if not marker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Marker not found"
        )
    
    update_data = marker_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(marker, field, value)
    
    db.add(marker)
    db.commit()
    db.refresh(marker)
    return marker

@router.delete("/{marker_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_marker(
    marker_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete marker"""
    marker = db.get(Marker, marker_id)
    if not marker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Marker not found"
        )
    
    db.delete(marker)
    db.commit()
    return None