from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime
from uuid import UUID

class MarkerBase(BaseModel):
    type: Literal["point", "hotspot", "coldspot"] = "point"
    x: float
    y: float
    temperature: float
    label: str
    emissivity: float = 0.95

class MarkerCreate(MarkerBase):
    project_id: UUID
    image_id: UUID

class MarkerUpdate(BaseModel):
    label: Optional[str] = None
    emissivity: Optional[float] = None

class MarkerResponse(MarkerBase):
    id: UUID
    project_id: UUID
    image_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True