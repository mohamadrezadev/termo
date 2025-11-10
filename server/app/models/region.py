from sqlmodel import SQLModel, Field, Relationship, Column, JSON
from typing import Optional, List, Dict, Literal
from datetime import datetime
from uuid import uuid4, UUID


# from server.app.models.image import ThermalImage
# from server.app.models.project import Project

class RegionPoint(SQLModel):
    x: float
    y: float

class Region(SQLModel, table=True):
    __tablename__ = "regions"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID = Field(foreign_key="projects.id", index=True)
    image_id: UUID = Field(foreign_key="thermal_images.id", index=True)
    
    type: Literal["rectangle", "circle", "polygon", "line"]
    points: List[Dict[str, float]] = Field(sa_column=Column(JSON))
    
    min_temp: float
    max_temp: float
    avg_temp: float
    area: Optional[float] = None
    
    label: str
    emissivity: float = 0.95
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    # project: "Project" = Relationship(back_populates="regions")
    # image: "ThermalImage" = Relationship(back_populates="regions")
    