from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from server.app.schemas.image import ImageResponse
from server.app.schemas.marker import MarkerResponse
from server.app.schemas.region import RegionResponse

class ProjectBase(BaseModel):
    name: str
    operator: str
    company: Optional[str] = None
    notes: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    operator: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    has_unsaved_changes: Optional[bool] = None

class ProjectResponse(ProjectBase):
    id: UUID
    date: datetime
    has_unsaved_changes: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ProjectDetailResponse(ProjectResponse):
    images: List["ImageResponse"] = []
    markers: List["MarkerResponse"] = []
    regions: List["RegionResponse"] = []