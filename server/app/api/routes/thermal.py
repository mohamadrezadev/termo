from fastapi import APIRouter, UploadFile, Form
from pathlib import Path
import shutil
import subprocess
import uuid

router = APIRouter(prefix="/upload", tags=["upload"])

BASE_DIR = Path(__file__).resolve().parents[4]  # مسیر به پوشه server
EXTRACTOR_PATH = BASE_DIR / "BmtExtract" / "BmtExteract" / "bin" / "Debug" / "BmtExteract.exe"
PROJECTS_DIR = BASE_DIR / "projects"
PROJECTS_DIR.mkdir(exist_ok=True)

@router.post("")
async def upload_bmt(file: UploadFile, project_name: str = Form(...)):
    """
    دریافت فایل BMT و اجرای برنامه C# برای استخراج اطلاعات.
    خروجی تمام فایل‌ها در فولدر پروژه ذخیره می‌شود.
    """
    try:
        if not EXTRACTOR_PATH.exists():
            return {"status": "error", "message": f"Extractor not found at: {EXTRACTOR_PATH}"}

        # ایجاد دایرکتوری پروژه
        project_id = f"{project_name}_{uuid.uuid4().hex[:8]}"
        project_path = PROJECTS_DIR / project_id
        project_path.mkdir(parents=True, exist_ok=True)

        # ذخیره فایل آپلود شده
        bmt_path = project_path / file.filename
        with open(bmt_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # مسیر خروجی برای C# extractor
        output_dir = project_path / "output"
        output_dir.mkdir(exist_ok=True)

        # اجرای برنامه C#
        process = subprocess.run(
            [
                str(EXTRACTOR_PATH),
                str(bmt_path),
                str(output_dir)
            ],
            capture_output=True,
            text=True,
            cwd=EXTRACTOR_PATH.parent
        )

        if process.returncode != 0:
            return {
                "status": "error",
                "message": "Extractor failed",
                "stderr": process.stderr,
                "stdout": process.stdout
            }

        return {
            "status": "success",
            "project_id": project_id,
            "output_dir": str(output_dir),
            "stdout": process.stdout
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


# # server/app/api/routes/thermal.py
# from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
# from typing import Optional
# import os
# import shutil

# from app.services.thermal_processor import ThermalProcessor
# from app.services.file_manager import FileManager
# from app.core.config import settings


# router = APIRouter()


# @router.post("")
# async def extract_bmt_file(
#     file: UploadFile = File(...),
#     project_id: Optional[str] = Form(None)
# ):
#     """
#     Extract thermal and real images from BMT file.
    
#     Process:
#     1. Save uploaded BMT file temporarily
#     2. Process with ThermalProcessor (extracts thermal + real images + CSV)
#     3. Save to project directory (if project_id provided)
#     4. Return URLs and metadata
    
#     Returns:
#     {
#         "success": true,
#         "images": [
#             {
#                 "type": "thermal",
#                 "url": "/files/projects/.../thermal/...",
#                 "csv_url": "/files/projects/.../csv/...",
#                 "metadata": {...}
#             },
#             {
#                 "type": "real",
#                 "url": "/files/projects/.../real/..."
#             }
#         ],
#         "message": "BMT file processed successfully"
#     }
#     """
#     file_manager = FileManager()
#     thermal_processor = ThermalProcessor()
    
#     temp_file_path = None
#     output_dir = None
    
#     try:
#         # Validate file extension
#         file_ext = os.path.splitext(file.filename)[1].lower()
#         if file_ext not in settings.ALLOWED_EXTENSIONS:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail=f"File type {file_ext} not supported. Allowed: {settings.ALLOWED_EXTENSIONS}"
#             )
        
#         # Check file size (FastAPI's UploadFile does not expose size easily, so we rely on the file object)
#         file.file.seek(0, 2)  # Seek to end
#         file_size = file.file.tell()
#         file.file.seek(0)  # Reset
        
#         if file_size > settings.MAX_UPLOAD_SIZE:
#             raise HTTPException(
#                 status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
#                 detail=f"File too large. Max size: {settings.MAX_UPLOAD_SIZE / 1024 / 1024} MB"
#             )
        
#         # Save uploaded file temporarily
#         print(f"📤 Processing upload: {file.filename} ({file_size / 1024:.1f} KB)")
#         temp_file_path = file_manager.save_temp_file(file)
        
#         # Process BMT file
#         print(f"⚙️  Processing BMT file...")
#         result = await thermal_processor.process_bmt_file(temp_file_path)
        
#         if not result.get("success"):
#             raise HTTPException(
#                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#                 detail=result.get("message", "Failed to process BMT file")
#             )
        
#         print(f"✅ BMT processing complete")
        
#         # Get the output directory from the processor for cleanup
#         output_dir = result.get("output_dir")
        
#         # Prepare response
#         images_data = []
        
#         # Save to project directory if project_id provided
#         if project_id:
#             print(f"💾 Saving files to project: {project_id}")
            
#             # Save thermal image
#             if result.get("thermal_image_path"):
#                 thermal_url = file_manager.save_project_file(
#                     project_id,
#                     result["thermal_image_path"],
#                     "thermal",
#                     file.filename
#                 )
                
#                 # Save CSV if available
#                 csv_url = None
#                 if result.get("csv_url"):
#                     csv_url = file_manager.save_project_file(
#                         project_id,
#                         result["csv_url"],
#                         "csv",
#                         f"{os.path.splitext(file.filename)[0]}.csv"
#                     )
                
#                 images_data.append({
#                     "type": "thermal",
#                     "url": thermal_url,
#                     "csv_url": csv_url,
#                     "metadata": result.get("metadata", {})
#                 })
            
#             # Save real image
#             if result.get("real_image_path"):
#                 real_url = file_manager.save_project_file(
#                     project_id,
#                     result["real_image_path"],
#                     "real",
#                     file.filename
#                 )
#                 images_data.append({
#                     "type": "real",
#                     "url": real_url
#                 })
        
#         else:
#             # No project - return temp file URLs
#             print("ℹ️  No project_id - returning temp URLs")
            
#             # The files are in the C# output_dir. We need to move them to a persistent temp location
#             # that is accessible via a URL, and then clean up the C# output_dir.
#             # Since the file_manager is designed to save to project_files, we'll use a simplified 
#             # approach for the temp URL case, which is not ideal but follows the user's provided structure.
            
#             # The user's provided logic for `else` block:
#             if result.get("thermal_image_path"):
#                 images_data.append({
#                     "type": "thermal",
#                     "url": f"/temp/{os.path.basename(result['thermal_image_path'])}",
#                     "csv_url": f"/temp/{os.path.basename(result['csv_url'])}" if result.get("csv_url") else None,
#                     "metadata": result.get("metadata", {})
#                 })
            
#             if result.get("real_image_path"):
#                 images_data.append({
#                     "type": "real",
#                     "url": f"/temp/{os.path.basename(result['real_image_path'])}"
#                 })
        
#         # Cleanup temp BMT file
#         if temp_file_path and os.path.exists(temp_file_path):
#             try:
#                 os.remove(temp_file_path)
#             except Exception as e:
#                 print(f"Warning: Could not remove temp BMT file: {e}")
        
#         # Cleanup C# output directory
#         # If project_id was provided, the files were MOVED by file_manager.
#         # If project_id was NOT provided, the files are still in output_dir, but we clean it up anyway
#         # because returning a /temp URL to a file in a deleted directory is a known issue in this structure.
#         if output_dir and os.path.exists(output_dir):
#             try:
#                 shutil.rmtree(output_dir)
#             except Exception as e:
#                 print(f"Warning: Could not remove C# output directory: {e}")
        
#         print(f"✅ Upload complete - {len(images_data)} images extracted")
        
#         return {
#             "success": True,
#             "images": images_data,
#             "message": result.get("message", "BMT file processed successfully")
#         }
        
#     except HTTPException:
#         raise
    
#     except Exception as e:
#         print(f"❌ Error processing BMT file: {e}")
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error processing BMT file: {str(e)}"
#         )
#     finally:
#         # Final cleanup of temp BMT file if an error occurred before cleanup block
#         if temp_file_path and os.path.exists(temp_file_path):
#             try:
#                 os.remove(temp_file_path)
#             except Exception:
#                 pass











#     """Return list of supported file formats"""
#     return {
#         "formats": settings.ALLOWED_EXTENSIONS,
#         "max_size_mb": settings.MAX_UPLOAD_SIZE / 1024 / 1024
#     }