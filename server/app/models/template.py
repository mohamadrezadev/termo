from sqlmodel import SQLModel, Field, Column, JSON
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import uuid4, UUID

class Template(SQLModel, table=True):
    __tablename__ = "templates"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(index=True)
    description: Optional[str] = None
    user_id: Optional[UUID] = None
    is_public: bool = False
    
    # Template data (stored as JSON)
    template_data: Dict[str, Any] = Field(sa_column=Column(JSON))
    
    usage_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)