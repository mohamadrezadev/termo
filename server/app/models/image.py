from sqlmodel import SQLModel, Field, Relationship, Column, JSON
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import uuid4, UUID

# # from models.marker import Marker
from models.project import Project
# # from models.region import Region

class ThermalMetadata(SQLModel):
    """Metadata for thermal image"""
    emissivity: float = 0.95
    ambient_temp: float = 20.0
    reflected_temp: float = 20.0
    humidity: float = 0.5
    distance: float = 1.0
    camera_model: Optional[str] = None
    timestamp: Optional[datetime] = None

class ThermalData(SQLModel):
    """Thermal data structure"""
    width: int
    height: int
    min_temp: float
    max_temp: float
    temperature_matrix: List[List[float]] = Field(sa_column=Column(JSON))
    metadata: ThermalMetadata = Field(sa_column=Column(JSON))

class ThermalImage(SQLModel, table=True):
    __tablename__ = "thermal_images"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID = Field(foreign_key="projects.id", index=True)
    name: str
    
    # File paths
    real_image_path: Optional[str] = None
    thermal_image_path: Optional[str] = None
    server_rendered_path: Optional[str] = None
    
    # Thermal data (stored as JSON)
    thermal_data: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    project: "Project" = Relationship(back_populates="images")
    # markers: List["Marker"] = Relationship(back_populates="image")
    # regions: List["Region"] = Relationship(back_populates="image")