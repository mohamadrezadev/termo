from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from uuid import UUID

from app.api.deps import get_db
from app.models.region import Region
from app.schemas.region import RegionCreate, RegionUpdate, RegionResponse

router = APIRouter()

@router.post("/", response_model=RegionResponse, status_code=status.HTTP_201_CREATED)
def create_region(
    region_in: RegionCreate,
    db: Session = Depends(get_db)
) -> Region:
    """Create new region"""
    region = Region(**region_in.dict())
    db.add(region)
    db.commit()
    db.refresh(region)
    return region

@router.get("/project/{project_id}", response_model=List[RegionResponse])
def list_project_regions(
    project_id: UUID,
    db: Session = Depends(get_db)
) -> List[Region]:
    """Get all regions for a project"""
    statement = select(Region).where(Region.project_id == project_id)
    regions = db.exec(statement).all()
    return regions

@router.get("/image/{image_id}", response_model=List[RegionResponse])
def list_image_regions(
    image_id: UUID,
    db: Session = Depends(get_db)
) -> List[Region]:
    """Get all regions for an image"""
    statement = select(Region).where(Region.image_id == image_id)
    regions = db.exec(statement).all()
    return regions

@router.patch("/{region_id}", response_model=RegionResponse)
def update_region(
    region_id: UUID,
    region_in: RegionUpdate,
    db: Session = Depends(get_db)
) -> Region:
    """Update region"""
    region = db.get(Region, region_id)
    if not region:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Region not found"
        )
    
    update_data = region_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(region, field, value)
    
    db.add(region)
    db.commit()
    db.refresh(region)
    return region

@router.delete("/{region_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_region(
    region_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete region"""
    region = db.get(Region, region_id)
    if not region:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Region not found"
        )
    
    db.delete(region)
    db.commit()
    return None