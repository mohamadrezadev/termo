from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

from app.schemas.common import ThermalMetadataDTO

class ThermalDataDTO(BaseModel):
    width: int
    height: int
    min_temp: float
    max_temp: float
    temperature_matrix: List[List[float]]
    metadata: "ThermalMetadataDTO"

class ImageBase(BaseModel):
    name: str

class ImageCreate(ImageBase):
    project_id: UUID
    thermal_data: Optional[Dict[str, Any]] = None

class ImageUpdate(BaseModel):
    name: Optional[str] = None

class ImageResponse(ImageBase):
    id: UUID
    project_id: UUID
    real_image_path: Optional[str] = None
    thermal_image_path: Optional[str] = None
    server_rendered_path: Optional[str] = None
    thermal_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ImageUploadResponse(BaseModel):
    success: bool
    images: List[Dict[str, str]]
    message: Optional[str] = None