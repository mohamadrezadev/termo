from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from sqlmodel import Session
from typing import List, Optional
from uuid import UUID
import shutil
import os

from app.api.deps import get_db
from app.models.image import ThermalImage
from app.schemas.image import ImageUploadResponse
from app.services.thermal_processor import ThermalProcessor
from app.services.file_manager import FileManager
from app.core.config import settings

router = APIRouter()

@router.post("/extract-bmt", response_model=ImageUploadResponse)
async def extract_bmt_file(
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Extract thermal and real images from BMT file
    Returns URLs for both thermal and real images, plus CSV data
    """
    file_manager = FileManager()
    thermal_processor = ThermalProcessor()
    
    try:
        # Save uploaded file temporarily
        temp_file_path = file_manager.save_temp_file(file)
        
        # Process BMT file
        result = await thermal_processor.process_bmt_file(temp_file_path)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("message", "Failed to process BMT file")
            )
        
        # Save extracted images if project_id provided
        images_data = []
        if project_id:
            project_uuid = UUID(project_id)
            
            # Save thermal image
            if result.get("thermal_image_path"):
                thermal_url = file_manager.save_project_file(
                    project_id,
                    result["thermal_image_path"],
                    "thermal",
                    file.filename
                )
                images_data.append({
                    "type": "thermal",
                    "url": thermal_url,
                    "csv_url": result.get("csv_url"),
                    "metadata": result.get("metadata", {})
                })
            
            # Save real image
            if result.get("real_image_path"):
                real_url = file_manager.save_project_file(
                    project_id,
                    result["real_image_path"],
                    "real",
                    file.filename
                )
                images_data.append({
                    "type": "real",
                    "url": real_url
                })
            
            # Create database record
            thermal_image = ThermalImage(
                project_id=project_uuid,
                name=file.filename,
                thermal_image_path=thermal_url if result.get("thermal_image_path") else None,
                real_image_path=real_url if result.get("real_image_path") else None,
                thermal_data=result.get("thermal_data")
            )
            db.add(thermal_image)
            db.commit()
        else:
            # No project - just return URLs
            if result.get("thermal_image_path"):
                images_data.append({
                    "type": "thermal",
                    "url": f"/api/v1/files/temp/{os.path.basename(result['thermal_image_path'])}",
                    "csv_url": result.get("csv_url"),
                    "metadata": result.get("metadata", {})
                })
            if result.get("real_image_path"):
                images_data.append({
                    "type": "real",
                    "url": f"/api/v1/files/temp/{os.path.basename(result['real_image_path'])}"
                })
        
        # Cleanup temp file
        os.remove(temp_file_path)
        
        return ImageUploadResponse(
            success=True,
            images=images_data,
            message="BMT file processed successfully"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing BMT file: {str(e)}"
        )