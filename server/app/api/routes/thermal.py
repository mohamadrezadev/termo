# server/app/api/routes/thermal.py
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from typing import Optional
import os

from app.services.thermal_processor import ThermalProcessor
from app.services.file_manager import FileManager
from app.core.config import settings


router = APIRouter()


@router.post("")
async def extract_bmt_file(
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None)
):
    """
    Extract thermal and real images from BMT file.
    
    Process:
    1. Save uploaded BMT file temporarily
    2. Process with ThermalProcessor (extracts thermal + real images + CSV)
    3. Save to project directory (if project_id provided)
    4. Return URLs and metadata
    
    Returns:
    {
        "success": true,
        "images": [
            {
                "type": "thermal",
                "url": "/files/projects/.../thermal/...",
                "csv_url": "/files/projects/.../csv/...",
                "metadata": {...}
            },
            {
                "type": "real",
                "url": "/files/projects/.../real/..."
            }
        ],
        "message": "BMT file processed successfully"
    }
    """
    file_manager = FileManager()
    thermal_processor = ThermalProcessor()
    
    try:
        # Validate file extension
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file_ext} not supported. Allowed: {settings.ALLOWED_EXTENSIONS}"
            )
        
        # Check file size
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset
        
        if file_size > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Max size: {settings.MAX_UPLOAD_SIZE / 1024 / 1024} MB"
            )
        
        # Save uploaded file temporarily
        print(f"📤 Processing upload: {file.filename} ({file_size / 1024:.1f} KB)")
        temp_file_path = file_manager.save_temp_file(file)
        
        # Process BMT file
        print(f"⚙️  Processing BMT file...")
        result = await thermal_processor.process_bmt_file(temp_file_path)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("message", "Failed to process BMT file")
            )
        
        print(f"✅ BMT processing complete")
        
        # Prepare response
        images_data = []
        
        # Save to project directory if project_id provided
        if project_id:
            print(f"💾 Saving files to project: {project_id}")
            
            # Save thermal image
            if result.get("thermal_image_path"):
                thermal_url = file_manager.save_project_file(
                    project_id,
                    result["thermal_image_path"],
                    "thermal",
                    file.filename
                )
                
                # Save CSV if available
                csv_url = None
                if result.get("csv_url"):
                    csv_url = file_manager.save_project_file(
                        project_id,
                        result["csv_url"],
                        "csv",
                        f"{os.path.splitext(file.filename)[0]}.csv"
                    )
                
                images_data.append({
                    "type": "thermal",
                    "url": thermal_url,
                    "csv_url": csv_url,
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
        
        else:
            # No project - return temp file URLs
            print("ℹ️  No project_id - returning temp URLs")
            
            if result.get("thermal_image_path"):
                images_data.append({
                    "type": "thermal",
                    "url": f"/temp/{os.path.basename(result['thermal_image_path'])}",
                    "csv_url": f"/temp/{os.path.basename(result['csv_url'])}" if result.get("csv_url") else None,
                    "metadata": result.get("metadata", {})
                })
            
            if result.get("real_image_path"):
                images_data.append({
                    "type": "real",
                    "url": f"/temp/{os.path.basename(result['real_image_path'])}"
                })
        
        # Cleanup temp BMT file
        try:
            os.remove(temp_file_path)
        except Exception as e:
            print(f"Warning: Could not remove temp file: {e}")
        
        print(f"✅ Upload complete - {len(images_data)} images extracted")
        
        return {
            "success": True,
            "images": images_data,
            "message": result.get("message", "BMT file processed successfully")
        }
        
    except HTTPException:
        raise
    
    except Exception as e:
        print(f"❌ Error processing BMT file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing BMT file: {str(e)}"
        )


@router.get("/supported-formats")
async def get_supported_formats():
    """Return list of supported file formats"""
    return {
        "formats": settings.ALLOWED_EXTENSIONS,
        "max_size_mb": settings.MAX_UPLOAD_SIZE / 1024 / 1024
    }