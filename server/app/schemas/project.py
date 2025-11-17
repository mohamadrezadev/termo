from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

from app.schemas.image import ImageResponse
from app.schemas.marker import MarkerResponse
from app.schemas.region import RegionResponse

class ProjectBase(BaseModel):
    name: str
    operator: str
    company: Optional[str] = None
    notes: Optional[str] = None

class ProjectCreate(ProjectBase):
    # State persistence fields for new projects
    active_image_id: Optional[UUID] = None
    current_palette: Optional[str] = "iron"
    custom_min_temp: Optional[float] = None
    custom_max_temp: Optional[float] = None
    global_parameters: Optional[Dict[str, Any]] = None
    display_settings: Optional[Dict[str, Any]] = None
    window_layout: Optional[Dict[str, Any]] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    operator: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    has_unsaved_changes: Optional[bool] = None
    # State persistence fields
    active_image_id: Optional[UUID] = None
    current_palette: Optional[str] = None
    custom_min_temp: Optional[float] = None
    custom_max_temp: Optional[float] = None
    global_parameters: Optional[Dict[str, Any]] = None
    display_settings: Optional[Dict[str, Any]] = None
    window_layout: Optional[Dict[str, Any]] = None

class ProjectResponse(ProjectBase):
    id: UUID
    date: datetime
    has_unsaved_changes: bool
    created_at: datetime
    updated_at: datetime
    # State persistence fields
    active_image_id: Optional[UUID] = None
    current_palette: str = "iron"
    custom_min_temp: Optional[float] = None
    custom_max_temp: Optional[float] = None
    global_parameters: Optional[Dict[str, Any]] = None
    display_settings: Optional[Dict[str, Any]] = None
    window_layout: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True

class ProjectDetailResponse(ProjectResponse):
    images: List["ImageResponse"] = []
    markers: List["MarkerResponse"] = []
    regions: List["RegionResponse"] = []

# Bulk save schemas
class BulkImageData(BaseModel):
    """Schema for image data in bulk save"""
    id: Optional[str] = None
    name: str
    thermal_image_base64: Optional[str] = None
    real_image_base64: Optional[str] = None
    thermal_data_json: Optional[str] = None
    thermal_data: Optional[Dict[str, Any]] = None

class BulkMarkerData(BaseModel):
    """Schema for marker data in bulk save"""
    id: Optional[str] = None
    image_id: str
    name: str
    x: float
    y: float
    temperature: Optional[float] = None
    type: Optional[str] = "point"
    label: Optional[str] = None
    emissivity: Optional[float] = 0.95

class BulkRegionData(BaseModel):
    """Schema for region data in bulk save"""
    id: Optional[str] = None
    image_id: str
    name: str
    points: List[Dict[str, float]]
    type: Optional[str] = "polygon"
    label: Optional[str] = None
    color: Optional[str] = None
    min_temp: Optional[float] = None
    max_temp: Optional[float] = None
    avg_temp: Optional[float] = None
    area: Optional[float] = None
    emissivity: Optional[float] = 0.95

class BulkSaveRequest(BaseModel):
    """Request schema for bulk save operation"""
    project: ProjectBase
    images: List[BulkImageData] = []
    markers: List[BulkMarkerData] = []
    regions: List[BulkRegionData] = []
    # State persistence fields
    active_image_id: Optional[str] = None
    current_palette: Optional[str] = "iron"
    custom_min_temp: Optional[float] = None
    custom_max_temp: Optional[float] = None
    global_parameters: Optional[Dict[str, Any]] = None
    display_settings: Optional[Dict[str, Any]] = None
    window_layout: Optional[Dict[str, Any]] = None

class BulkSaveResponse(BaseModel):
    """Response schema for bulk save operation"""
    success: bool
    project: ProjectDetailResponse
    message: Optional[str] = None