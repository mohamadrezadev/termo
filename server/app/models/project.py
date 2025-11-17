from sqlmodel import SQLModel, Field, Relationship, Column, JSON
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import uuid4, UUID




class Project(SQLModel, table=True):
    __tablename__ = "projects"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(index=True)
    operator: str
    company: Optional[str] = None
    date: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None
    has_unsaved_changes: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # State Persistence Fields - برای ذخیره وضعیت کامل پروژه
    active_image_id: Optional[UUID] = None
    current_palette: str = Field(default="iron")
    custom_min_temp: Optional[float] = None
    custom_max_temp: Optional[float] = None
    
    # Global Parameters - JSON field for flexible parameter storage
    global_parameters: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    
    # Display Settings - JSON field for view state
    display_settings: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    # Structure: {
    #   "thermalView": {"zoom": 1, "panX": 0, "panY": 0},
    #   "realView": {"zoom": 1, "panX": 0, "panY": 0},
    #   "showGrid": false,
    #   "showMarkers": true,
    #   "showRegions": true,
    #   "showTemperatureScale": true
    # }
    
    # Window Layout - JSON field for window positions and states
    window_layout: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    # Structure: {
    #   "windows": [{"id": "thermal-viewer", "isOpen": true, "position": {...}, "size": {...}, ...}],
    #   "gridCols": 3,
    #   "gridRows": 2
    # }

    # Relationships
    images: List["ThermalImage"] = Relationship(back_populates="project")
    markers: List["Marker"] = Relationship(back_populates="project")
    regions: List["Region"] = Relationship(back_populates="project")
