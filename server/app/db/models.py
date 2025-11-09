from sqlmodel import SQLModel, Field, Column
from typing import Optional
from datetime import datetime
from sqlalchemy import JSON

class Project(SQLModel, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    device: Optional[str] = None
    customer: Optional[str] = None
    logo_path: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ImageRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: str = Field(index=True)
    original_path: str
    type: str  # thermal | visual
    extracted_path: Optional[str] = None
    meta: Optional[dict] = Field(default=None, sa_column=Column("metadata", JSON))

class Marker(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: str = Field(index=True)
    marker_id: str
    label: Optional[str] = None
    x: Optional[int] = None
    y: Optional[int] = None
    radius: Optional[int] = None
    polygon: Optional[list] = Field(default=None, sa_column=Column(JSON))
    temp: Optional[float] = None
    note: Optional[str] = None

class ReportRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: str = Field(index=True)
    filename: str
    type: str  # pdf | docx
    created_at: datetime = Field(default_factory=datetime.utcnow)
