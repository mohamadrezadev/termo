from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ResponseBase(BaseModel):
    success: bool
    message: Optional[str] = None
    
class PaginationParams(BaseModel):
    skip: int = 0
    limit: int = 100
    
class ThermalMetadataDTO(BaseModel):
    emissivity: float = 0.95
    ambient_temp: float = 20.0
    reflected_temp: float = 20.0
    humidity: float = 0.5
    distance: float = 1.0
    camera_model: Optional[str] = None
    timestamp: Optional[datetime] = None