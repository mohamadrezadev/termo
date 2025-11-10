from sqlmodel import SQLModel, Field, Relationship, Column, JSON
from typing import Optional, List, Dict
from datetime import datetime
from uuid import uuid4, UUID
from enum import Enum




class RegionType(str, Enum):
    rectangle = "rectangle"
    circle = "circle"
    polygon = "polygon"
    line = "line"


class Region(SQLModel, table=True):
    __tablename__ = "regions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID = Field(foreign_key="projects.id", index=True)
    image_id: UUID = Field(foreign_key="thermal_images.id", index=True)

    type: RegionType = Field(default=RegionType.rectangle)
    points: List[Dict[str, float]] = Field(sa_column=Column(JSON))

    min_temp: float
    max_temp: float
    avg_temp: float
    area: Optional[float] = None

    label: str
    emissivity: float = 0.95
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    project: Optional["Project"] = Relationship(back_populates="regions")
    image: Optional["ThermalImage"] = Relationship(back_populates="regions")
