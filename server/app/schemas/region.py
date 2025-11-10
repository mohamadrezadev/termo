from pydantic import BaseModel
from typing import Optional, List, Dict, Literal
from datetime import datetime
from uuid import UUID

class RegionPointDTO(BaseModel):
    x: float
    y: float

class RegionBase(BaseModel):
    type: Literal["rectangle", "circle", "polygon", "line"]
    points: List[Dict[str, float]]
    min_temp: float
    max_temp: float
    avg_temp: float
    area: Optional[float] = None
    label: str
    emissivity: float = 0.95

class RegionCreate(RegionBase):
    project_id: UUID
    image_id: UUID

class RegionUpdate(BaseModel):
    label: Optional[str] = None
    emissivity: Optional[float] = None
    min_temp: Optional[float] = None
    max_temp: Optional[float] = None
    avg_temp: Optional[float] = None

class RegionResponse(RegionBase):
    id: UUID
    project_id: UUID
    image_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True