from fastapi import APIRouter, UploadFile, Form, HTTPException, status, Request, File
from pathlib import Path
import shutil
import subprocess
import uuid
import re
import logging
import json
import time

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/upload", tags=["upload"])

BASE_DIR = Path(__file__).resolve().parents[4]  # مسیر به پوشه server
EXTRACTOR_PATH = BASE_DIR / "BmtExtract" / "BmtExteract" / "bin" / "Debug" / "BmtExteract.exe"
PROJECTS_DIR = BASE_DIR / "projects"
PROJECTS_DIR.mkdir(exist_ok=True)


def url_path(file_path: Path, add_timestamp: bool = True) -> str:
    """Convert file path to URL path with optional cache-busting timestamp"""
    relative_path = file_path.relative_to(PROJECTS_DIR)
    url = f"/files/projects/{relative_path.as_posix()}"
    
    # Add timestamp to prevent browser caching issues
    if add_timestamp:
        timestamp = int(time.time() * 1000)  # milliseconds
        url = f"{url}?t={timestamp}"
    
    return url


def validate_extractor():
    """Validate that the C# extractor exists and is accessible"""
    if not EXTRACTOR_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"BMT extractor not found at: {EXTRACTOR_PATH}"
        )


def validate_output_files(output_dir: Path) -> dict:
    """Validate that the C# extractor produced expected output files"""
    validation = {
        "has_thermal": False,
        "has_visual": False,
        "has_csv": False,
        "has_json": False,
        "errors": []
    }

    # Check for thermal images
    thermal_files = list(output_dir.glob("*_thermal_*.png"))
    validation["has_thermal"] = len(thermal_files) > 0
    if not validation["has_thermal"]:
        validation["errors"].append("No thermal images generated")

    # Check for visual images
    visual_files = list(output_dir.glob("*_visual.png"))
    validation["has_visual"] = len(visual_files) > 0

    # Check for CSV
    csv_files = list(output_dir.glob("*.csv"))
    validation["has_csv"] = len(csv_files) > 0
    if not validation["has_csv"]:
        validation["errors"].append("No CSV temperature data generated")

    # Check for JSON metadata
    json_files = list(output_dir.glob("*.json"))
    validation["has_json"] = len(json_files) > 0

    return validation


def normalize_metadata(raw_metadata: dict) -> dict:
    """
    Normalize metadata from C# extractor format to client format.
    Converts PascalCase C# properties to snake_case properties that client expects.
    """
    if not raw_metadata:
        return {}
    
    normalized = {}
    
    # Extract measurement info
    measurement_info = raw_metadata.get("MeasurementInfo", {})
    if measurement_info:
        normalized["emissivity"] = measurement_info.get("Emissivity", 0.95)
        normalized["reflected_temp"] = measurement_info.get("ReflectedTemperature", 20)
        normalized["humidity"] = measurement_info.get("Humidity", 0.5)
    
    # Extract device info
    device_info = raw_metadata.get("DeviceInfo", {})
    if device_info:
        normalized["device"] = device_info.get("DeviceName", "Thermal Camera")
    
    # Extract image info
    image_info = raw_metadata.get("ImageInfo", {})
    if image_info:
        normalized["captured_at"] = image_info.get("CreationDateTime")
        normalized["width"] = image_info.get("Width")
        normalized["height"] = image_info.get("Height")
    
    # Extract temperature stats
    temp_stats = raw_metadata.get("TemperatureStats", {})
    if temp_stats:
        normalized["min_temp"] = temp_stats.get("Min")
        normalized["max_temp"] = temp_stats.get("Max")
        normalized["avg_temp"] = temp_stats.get("Average")
    
    logger.info(f"Normalized metadata: emissivity={normalized.get('emissivity')}, reflected_temp={normalized.get('reflected_temp')}")
    
    return normalized


@router.post("")
async def upload_bmt(file: UploadFile, project_id: str = Form(...)):
    """
    Upload and process BMT thermal imaging file
    Only ONE BMT file per project is allowed.

    Args:
        file: BMT file to process
        project_id: ID of the project

    Returns:
        JSON response with extracted images, CSV, and JSON data
    """
    
    logger.info(f"=== UPLOAD_BMT STARTED ===")
    logger.info(f"File: {file.filename}")
    logger.info(f"Project ID received: {project_id}")
    logger.info(f"Project ID type: {type(project_id)}")

    # Validate file extension
    if not file.filename:
        logger.error("No filename provided")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )

    if not file.filename.lower().endswith('.bmt'):
        logger.error(f"Invalid file type: {file.filename}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .BMT files are supported"
        )

    # Validate extractor exists
    validate_extractor()

    try:
        # Check if project exists in database
        from sqlmodel import Session, select
        from app.db.session import engine
        from app.models.project import Project
        from app.models.image import ThermalImage
        from uuid import UUID
        
        logger.info(f"[UPLOAD_BMT] Starting upload for project_id: {project_id}")
        logger.info(f"[UPLOAD_BMT] File: {file.filename}")
        
        with Session(engine) as db:
            try:
                project_uuid = UUID(project_id)
                logger.info(f"[UPLOAD_BMT] Parsed project UUID: {project_uuid}")
            except ValueError as e:
                logger.error(f"[UPLOAD_BMT] Invalid UUID format: {project_id}, error: {e}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid project ID format: {str(e)}"
                )
            
            project = db.get(Project, project_uuid)
            if not project:
                logger.error(f"[UPLOAD_BMT] Project not found: {project_uuid}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Project with ID {project_id} not found"
                )
            
            logger.info(f"[UPLOAD_BMT] Found project: {project.name}")
            
            # Check if project already has a BMT file (thermal image)
            existing_images = db.exec(
                select(ThermalImage).where(ThermalImage.project_id == project_uuid)
            ).all()
            
            logger.info(f"[UPLOAD_BMT] Found {len(existing_images)} existing images")
            
            if existing_images:
                logger.warning(f"[UPLOAD_BMT] Project already has images, rejecting upload")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="این پروژه قبلاً یک فایل BMT دارد. فقط یک فایل BMT در هر پروژه مجاز است."
                )
        
        # Create project directory using project name
        from app.services.file_manager import FileManager
        file_manager = FileManager()
        sanitized_name = FileManager.sanitize_folder_name(project.name)
        project_path = PROJECTS_DIR / sanitized_name
        project_path.mkdir(parents=True, exist_ok=True)

        # Check if BMT file already exists
        existing_bmt = list(project_path.glob("*.bmt"))
        if existing_bmt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="یک فایل BMT قبلاً برای این پروژه آپلود شده است. لطفاً ابتدا فایل قبلی را حذف کنید."
            )

        # Save uploaded file
        bmt_path = project_path / file.filename
        logger.info(f"Saving BMT file to: {bmt_path}")

        try:
            with open(bmt_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
        except Exception as e:
            logger.error(f"Failed to save BMT file: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save uploaded file: {str(e)}"
            )

        # مسیر خروجی برای C# extractor
        output_dir = project_path / "output"
        output_dir.mkdir(exist_ok=True)

        # اجرای برنامه C#
        logger.info(f"Running C# extractor: {EXTRACTOR_PATH}")
        logger.info(f"Input: {bmt_path}, Output: {output_dir}")

        try:
                process = subprocess.run(
                [
                    str(EXTRACTOR_PATH),
                    str(bmt_path),
                    str(output_dir)
                ],
                capture_output=True,
                text=True,
                encoding="utf-8", # <-- این خط اضافه شد
                cwd=EXTRACTOR_PATH.parent,
                timeout=60  # 60 second timeout
            )

            # process = subprocess.run(
            #     [
            #         str(EXTRACTOR_PATH),
            #         str(bmt_path),
            #         str(output_dir)
            #     ],
            #     capture_output=True,
            #     text=True,
            #     cwd=EXTRACTOR_PATH.parent,
            #     timeout=60  # 60 second timeout
            # )
        except subprocess.TimeoutExpired:
            logger.error("C# extractor timed out")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="BMT processing timed out (60 seconds)"
            )
        except Exception as e:
            logger.error(f"Failed to run C# extractor: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to run extractor: {str(e)}"
            )

        # Check extractor exit code
        if process.returncode != 0:
            logger.error(f"Extractor failed with code {process.returncode}")
            logger.error(f"STDERR: {process.stderr}")
            logger.error(f"STDOUT: {process.stdout}")

            # Even if extractor fails, continue to see if we got any output
            # This allows partial processing to continue
            validation = validate_output_files(output_dir)
            
            if validation["has_thermal"]:
                logger.warning(f"Extractor reported error but still produced some thermal images")
                # Continue processing with what we have
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail={
                        "message": "BMT extraction failed",
                        "return_code": process.returncode,
                        "stderr": process.stderr,
                        "stdout": process.stdout
                    }
                )

        # Validate output files
        validation = validate_output_files(output_dir)
        if validation["errors"]:
            logger.warning(f"Extractor output validation warnings: {validation['errors']}")
            # Log all files that were created for debugging
            all_files = list(output_dir.glob("*"))
            logger.warning(f"Files in output directory: {[f.name for f in all_files]}")

        # --- جمع‌آوری فایل‌ها ---
        images = []
        thermal_images = []
        csv_files = []
        json_files = []

        # پردازش PNG
        for file_path in output_dir.glob("*.png"):
            name = file_path.stem
            # تصویر واقعی
            if name.endswith("_visual"):
                images.append({
                    "type": "real",
                    "url": url_path(file_path)
                })
                logger.info(f"Found visual image: {file_path.name}")
            # تصاویر حرارتی با پالت
            elif "_thermal_" in name:
                match = re.match(r"(.+)_thermal_(.+)", name)
                if match:
                    base_name, palette = match.groups()
                    existing = next((item for item in thermal_images if item["name"] == base_name), None)
                    if not existing:
                        existing = {
                            "type": "thermal",
                            "name": base_name,
                            "palettes": {},
                            "csv_url": None,
                            "json_url": None,
                            "metadata": {}
                        }
                        thermal_images.append(existing)
                    existing["palettes"][palette] = url_path(file_path)
                    logger.info(f"Found thermal image: {file_path.name} (palette: {palette})")

        # پردازش CSV
        for csv_file in output_dir.glob("*.csv"):
            base_name = csv_file.stem.replace("_temperature", "").replace("_thermal", "")
            csv_url = url_path(csv_file)
            csv_files.append({
                "name": base_name,
                "url": csv_url
            })

            # Link CSV to corresponding thermal image
            existing = next((item for item in thermal_images if item["name"] == base_name), None)
            if existing:
                existing["csv_url"] = csv_url
                logger.info(f"Linked CSV to thermal image: {csv_file.name}")
            else:
                logger.warning(f"CSV file has no matching thermal image: {csv_file.name}")

        # پردازش JSON (metadata)
        for json_file in output_dir.glob("*.json"):
            base_name = json_file.stem.replace("_data", "")
            json_url = url_path(json_file)

            # Try to parse JSON metadata
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                    json_files.append({
                        "name": base_name,
                        "url": json_url,
                        "metadata": metadata
                    })
            except Exception as e:
                logger.warning(f"Failed to parse JSON metadata from {json_file.name}: {e}")
                json_files.append({
                    "name": base_name,
                    "url": json_url
                })

            # Link JSON to corresponding thermal image
            existing = next((item for item in thermal_images if item["name"] == base_name), None)
            if existing:
                existing["json_url"] = json_url
                # Parse and attach metadata to thermal image, with normalization
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        raw_metadata = json.load(f)
                        # Normalize metadata from C# format to client format
                        existing["metadata"] = normalize_metadata(raw_metadata)
                except Exception as e:
                    logger.warning(f"Failed to parse metadata for {json_file.name}: {e}")
                logger.info(f"Linked JSON metadata to thermal image: {json_file.name}")
                logger.debug(f"Metadata: {existing.get('metadata')}")

        # ترکیب thermal images با images اصلی
        images.extend(thermal_images)

        logger.info(f"Processing complete: {len(images)} images, {len(csv_files)} CSV, {len(json_files)} JSON")
        logger.info(f"Images in response: {[img.get('name', img.get('type')) for img in images]}")

        # Save images to database
        with Session(engine) as db:
            # Save visual image
            visual_image = next((img for img in images if img.get('type') == 'real'), None)
            
            # Save thermal images
            for thermal_img in thermal_images:
                thermal_image = ThermalImage(
                    project_id=project_uuid,
                    name=thermal_img['name'],
                    real_image_path=visual_image['url'] if visual_image else None,
                    thermal_image_path=None,  # We don't have a single thermal path
                    server_palettes=thermal_img.get('palettes', {}),
                    csv_url=thermal_img.get('csv_url'),
                    thermal_data=thermal_img.get('metadata', {})
                )
                db.add(thermal_image)
            
            db.commit()
            logger.info(f"Saved {len(thermal_images)} thermal images to database")

        return {
            "status": "success",
            "project_id": project_id,
            "output_dir": str(output_dir),
            "validation": validation,
            "images": images,
            "csv_files": csv_files,
            "json_files": json_files
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in upload_bmt: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )


@router.get("/project/{project_name}")
async def get_project_images(project_name: str):
    """
    Retrieve all images and data files for a project

    Args:
        project_name: Name of the project

    Returns:
        JSON response with all images, CSV, and JSON files
    """
    try:
        project_path = PROJECTS_DIR / project_name
        output_dir = project_path / "output"

        logger.info(f"Retrieving images for project: {project_name} from {output_dir}")

        if not output_dir.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{project_name}' not found"
            )

        images = []
        thermal_images = []
        csv_files = []
        json_files = []

        # جمع‌آوری فایل‌های PNG
        for file_path in output_dir.glob("*.png"):
            name = file_path.stem
            if name.endswith("_visual"):
                images.append({
                    "type": "real",
                    "url": url_path(file_path)
                })
            elif "_thermal_" in name:
                match = re.match(r"(.+)_thermal_(.+)", name)
                if match:
                    base_name, palette = match.groups()
                    existing = next((item for item in thermal_images if item["name"] == base_name), None)
                    if not existing:
                        existing = {
                            "type": "thermal",
                            "name": base_name,
                            "palettes": {},
                            "csv_url": None,
                            "json_url": None,
                            "metadata": {}
                        }
                        thermal_images.append(existing)
                    existing["palettes"][palette] = url_path(file_path)

        # جمع‌آوری CSV
        for csv_file in output_dir.glob("*.csv"):
            base_name = csv_file.stem.replace("_temperature", "").replace("_thermal", "")
            csv_url = url_path(csv_file)
            csv_files.append({
                "name": base_name,
                "url": csv_url
            })
            existing = next((item for item in thermal_images if item["name"] == base_name), None)
            if existing:
                existing["csv_url"] = csv_url

        # جمع‌آوری JSON
        for json_file in output_dir.glob("*.json"):
            base_name = json_file.stem.replace("_data", "")
            json_url = url_path(json_file)

            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                    json_files.append({
                        "name": base_name,
                        "url": json_url,
                        "metadata": metadata
                    })
            except Exception:
                json_files.append({
                    "name": base_name,
                    "url": json_url
                })

            existing = next((item for item in thermal_images if item["name"] == base_name), None)
            if existing:
                existing["json_url"] = json_url
                # Parse and attach metadata to thermal image, with normalization
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        raw_metadata = json.load(f)
                        # Normalize metadata from C# format to client format
                        existing["metadata"] = normalize_metadata(raw_metadata)
                except Exception as e:
                    logger.warning(f"Failed to parse metadata for {json_file.name}: {e}")
                logger.info(f"Linked JSON metadata to thermal image: {json_file.name}")

        # ترکیب تصاویر واقعی و حرارتی
        images.extend(thermal_images)

        return {
            "status": "success",
            "project_id": project_name,
            "images": images,
            "csv_files": csv_files,
            "json_files": json_files
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving project images: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/rerender-palette")
async def rerender_with_palette(
    request: Request,
    bmt_file: UploadFile = File(None),
    project_name: str = Form(...),
    palette: str = Form("iron")
):
    """
    Re-render thermal image with a different color palette
    
    این endpoint فایل BMT را دوباره پردازش می‌کند اما فقط با پالت مشخص شده
    تا کاربر بتواند بدون آپلود مجدد، پالت را تغییر دهد.
    
    Args:
        file: BMT file (can be the same file again)
        project_name: Name of the project
        palette: Color palette name (iron, rainbow, grayscale, etc.)
        
    Returns:
        JSON response with the new thermal image URL for the requested palette
    """
    
    # If client did not upload the BMT file, try to use an existing BMT in the project folder
    project_id = project_name
    project_path = PROJECTS_DIR / project_id
    project_path.mkdir(parents=True, exist_ok=True)

    selected_bmt_path = None
    # If file provided, save it to project
    if bmt_file and getattr(bmt_file, 'filename', None):
        if not bmt_file.filename.lower().endswith('.bmt'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only .BMT files are supported"
            )
        bmt_path = project_path / bmt_file.filename
        try:
            with open(bmt_path, "wb") as f:
                shutil.copyfileobj(bmt_file.file, f)
            selected_bmt_path = bmt_path
        except Exception as e:
            logger.error(f"Failed to save BMT file: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save file: {str(e)}"
            )
    else:
        # Try to find an existing .bmt file in the project folder
        candidates = list(project_path.glob('*.bmt'))
        if candidates:
            # pick the latest modified one
            candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
            selected_bmt_path = candidates[0]

    if not selected_bmt_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No BMT file provided and no existing project BMT found"
        )
    
    # Validate extractor exists
    validate_extractor()
    
    try:
        # مسیر خروجی
        output_dir = project_path / "output"
        output_dir.mkdir(exist_ok=True)

        # ابتدا چک کنیم که آیا فایل پالت از قبل وجود دارد
        thermal_pattern = f"*_thermal_{palette}.png"
        existing_thermal_files = list(output_dir.glob(thermal_pattern))
        
        if existing_thermal_files:
            # فایل پالت از قبل وجود دارد، از همان استفاده می‌کنیم
            logger.info(f"Found existing palette file: {existing_thermal_files[0].name}")
            thermal_url = url_path(existing_thermal_files[0], add_timestamp=True)
            
            return {
                "status": "success",
                "thermal_url": thermal_url,
                "palette": palette,
                "project_id": project_id,
                "from_cache": True
            }

        # اگر فایل وجود ندارد، C# extractor را اجرا می‌کنیم
        logger.info(f"Palette file not found, running C# extractor with palette: {palette} using {selected_bmt_path}")

        try:
            process = subprocess.run(
                [
                    str(EXTRACTOR_PATH),
                    str(selected_bmt_path),
                    str(output_dir),
                    palette  # Pass palette as argument to C# app
                ],
                capture_output=True,
                text=True,
                encoding="utf-8",
                cwd=EXTRACTOR_PATH.parent,
                timeout=60
            )
        except subprocess.TimeoutExpired:
            logger.error("C# extractor timed out")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Palette rendering timed out"
            )
        except Exception as e:
            logger.error(f"Failed to run C# extractor: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to render palette: {str(e)}"
            )
        
        # Check for errors
        if process.returncode != 0:
            logger.error(f"Extractor failed: {process.stderr}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate palette image"
            )
        
        # پیدا کردن تصویر حرارتی با پالت درخواستی
        thermal_pattern = f"*_thermal_{palette}.png"
        thermal_files = list(output_dir.glob(thermal_pattern))
        
        if not thermal_files:
            # Maybe the file naming is different, search for any thermal files
            all_thermal = list(output_dir.glob("*_thermal_*.png"))
            logger.warning(f"Palette '{palette}' not found. Available: {[f.name for f in all_thermal]}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Thermal image with palette '{palette}' not generated"
            )
        
        # Get the thermal image URL with cache-busting
        thermal_url = url_path(thermal_files[0], add_timestamp=True)
        
        logger.info(f"Palette rendering complete: {thermal_files[0].name}")
        
        return {
            "status": "success",
            "thermal_url": thermal_url,
            "palette": palette,
            "project_id": project_id,
            "from_cache": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in rerender_palette: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )

