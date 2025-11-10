from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from datetime import datetime
from uuid import uuid4, UUID
from enum import Enum




class MarkerType(str, Enum):
    point = "point"
    hotspot = "hotspot"
    coldspot = "coldspot"


class Marker(SQLModel, table=True):
    __tablename__ = "markers"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID = Field(foreign_key="projects.id", index=True)
    image_id: UUID = Field(foreign_key="thermal_images.id", index=True)

    type: MarkerType = Field(default=MarkerType.point)
    x: float
    y: float
    temperature: float
    label: str
    emissivity: float = 0.95

    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    project: Optional["Project"] = Relationship(back_populates="markers")
    image: Optional["ThermalImage"] = Relationship(back_populates="markers")
