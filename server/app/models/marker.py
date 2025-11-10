from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from datetime import datetime
from uuid import uuid4, UUID


# # from app.models.image import ThermalImage
# from app.models.project import Project

class Marker(SQLModel, table=True):
    __tablename__ = "markers"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID = Field(foreign_key="projects.id", index=True)
    image_id: UUID = Field(foreign_key="thermal_images.id", index=True)
    
    type: str = Field(default="point") # Changed from Literal to str to fix SQLModel issubclass error
    x: float
    y: float
    temperature: float
    label: str
    emissivity: float = 0.95
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    project: "Project" = Relationship(back_populates="markers")
    image: "ThermalImage" = Relationship(back_populates="markers")