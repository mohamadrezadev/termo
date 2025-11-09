from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID

class TemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = False

class TemplateCreate(TemplateBase):
    template_data: Dict[str, Any]

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    template_data: Optional[Dict[str, Any]] = None

class TemplateResponse(TemplateBase):
    id: UUID
    user_id: Optional[UUID] = None
    template_data: Dict[str, Any]
    usage_count: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True