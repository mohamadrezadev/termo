from fastapi import APIRouter, UploadFile, Form, HTTPException, status
from pathlib import Path
import shutil
import subprocess
import uuid
import re
import logging
import json

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/upload", tags=["upload"])

BASE_DIR = Path(__file__).resolve().parents[4]  # مسیر به پوشه server
EXTRACTOR_PATH = BASE_DIR / "BmtExtract" / "BmtExteract" / "bin" / "Debug" / "BmtExteract.exe"
PROJECTS_DIR = BASE_DIR / "projects"
PROJECTS_DIR.mkdir(exist_ok=True)


def url_path(file_path: Path) -> str:
    """Convert file path to URL path"""
    relative_path = file_path.relative_to(PROJECTS_DIR)
    return f"/files/projects/{relative_path.as_posix()}"


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


@router.post("")
async def upload_bmt(file: UploadFile, project_name: str = Form(...)):
    """
    Upload and process BMT thermal imaging file

    Args:
        file: BMT file to process
        project_name: Name of the project

    Returns:
        JSON response with extracted images, CSV, and JSON data
    """

    # Validate file extension
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )

    if not file.filename.lower().endswith('.bmt'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .BMT files are supported"
        )

    # Validate extractor exists
    validate_extractor()

    try:
        # ایجاد دایرکتوری پروژه
        project_id = project_name
        project_path = PROJECTS_DIR / project_id
        project_path.mkdir(parents=True, exist_ok=True)

        # ذخیره فایل آپلود شده
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
                cwd=EXTRACTOR_PATH.parent,
                timeout=60  # 60 second timeout
            )
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
                            "json_url": None
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
                logger.info(f"Linked JSON metadata to thermal image: {json_file.name}")

        # ترکیب thermal images با images اصلی
        images.extend(thermal_images)

        logger.info(f"Processing complete: {len(images)} images, {len(csv_files)} CSV, {len(json_files)} JSON")

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
                            "json_url": None
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
