"""
Database models for project persistence
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
import json


# ============= API Request/Response Models =============

class ThermalMetadata(BaseModel):
    """Thermal image metadata from C# extractor"""
    emissivity: float = 0.95
    reflected_temp: float = 20.0
    humidity: Optional[float] = None
    device: Optional[str] = None
    captured_at: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    min_temp: Optional[float] = None
    max_temp: Optional[float] = None
    avg_temp: Optional[float] = None


class TemperaturePoint(BaseModel):
    """Single temperature data point"""
    x: int
    y: int
    temperature: float


class ThermalData(BaseModel):
    """Thermal image data"""
    width: int
    height: int
    minTemp: float
    maxTemp: float
    temperatureMatrix: List[List[float]]
    metadata: Optional[ThermalMetadata] = None


class MarkerData(BaseModel):
    """Marker on thermal image"""
    id: str
    type: str = "point"  # point, line, etc.
    x: float
    y: float
    temperature: Optional[float] = None
    label: str
    emissivity: float = 0.95
    imageId: str


class RegionData(BaseModel):
    """Region (rectangle, polygon) on thermal image"""
    id: str
    type: str  # rectangle, polygon, circle
    points: List[Dict[str, float]]  # [{x, y}, ...]
    minTemp: float = 0
    maxTemp: float = 0
    avgTemp: float = 0
    area: float = 0
    label: str
    emissivity: float = 0.95
    imageId: str


class ThermalImageData(BaseModel):
    """Complete thermal image with data and URLs"""
    id: str
    name: str
    thermalData: Optional[ThermalData] = None
    realImage: Optional[str] = None
    serverRenderedThermalUrl: Optional[str] = None
    serverPalettes: Dict[str, str] = Field(default_factory=dict)
    csvUrl: Optional[str] = None


class ProjectAnalysis(BaseModel):
    """Complete project analysis data"""
    id: str
    name: str
    description: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime
    images: List[ThermalImageData] = Field(default_factory=list)
    markers: List[MarkerData] = Field(default_factory=list)
    regions: List[RegionData] = Field(default_factory=list)
    activeImageId: Optional[str] = None
    currentPalette: str = "iron"
    customMinTemp: Optional[float] = None
    customMaxTemp: Optional[float] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)


# ============= Database Models =============

class ProjectDB(BaseModel):
    """Project model for database"""
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    active_image_id: Optional[str] = None
    current_palette: str = "iron"
    custom_min_temp: Optional[float] = None
    custom_max_temp: Optional[float] = None
    parameters: str = Field(default_factory=lambda: json.dumps({}))  # JSON string
    data_json: str  # Full project data as JSON
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ImageDB(BaseModel):
    """Image model for database"""
    id: str
    project_id: str
    name: str
    thermal_data: Optional[str] = None  # JSON string
    real_image_url: Optional[str] = None
    server_rendered_url: Optional[str] = None
    server_palettes: str = Field(default_factory=lambda: json.dumps({}))  # JSON string
    csv_url: Optional[str] = None
    metadata: str = Field(default_factory=lambda: json.dumps({}))  # JSON string
    created_at: datetime


class MarkerDB(BaseModel):
    """Marker model for database"""
    id: str
    project_id: str
    image_id: str
    type: str = "point"
    x: float
    y: float
    temperature: Optional[float] = None
    label: str
    emissivity: float = 0.95
    created_at: datetime


class RegionDB(BaseModel):
    """Region model for database"""
    id: str
    project_id: str
    image_id: str
    type: str  # rectangle, polygon
    points: str  # JSON array of points
    min_temp: float = 0
    max_temp: float = 0
    avg_temp: float = 0
    area: float = 0
    label: str
    emissivity: float = 0.95
    created_at: datetime
