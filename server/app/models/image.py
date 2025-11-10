from sqlmodel import SQLModel, Field, Relationship, Column, JSON
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import uuid4, UUID




class ThermalImage(SQLModel, table=True):
    __tablename__ = "thermal_images"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID = Field(foreign_key="projects.id", index=True)
    name: str

    # File paths
    real_image_path: Optional[str] = None
    thermal_image_path: Optional[str] = None
    server_rendered_path: Optional[str] = None

    # Thermal data stored as JSON
    thermal_data: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    project: Optional["Project"] = Relationship(back_populates="images")
    markers: List["Marker"] = Relationship(back_populates="image")
    regions: List["Region"] = Relationship(back_populates="image")
