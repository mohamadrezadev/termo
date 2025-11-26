from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from uuid import UUID, uuid4
import json
import base64
from pathlib import Path

from app.db.session import get_db

from app.models.project import Project
from app.models.image import ThermalImage
from app.models.marker import Marker
from app.models.region import Region
from app.services.file_manager import FileManager
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectDetailResponse,
    BulkSaveRequest,
    BulkSaveResponse
)
from app.core.config import get_settings

settings = get_settings()
router = APIRouter()

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db)
) -> Project:
    """Create new project"""
    project = Project(**project_in.dict())
    db.add(project)
    db.commit()
    db.refresh(project)

    # Create project directories using sanitized project name
    file_manager = FileManager()
    sanitized_name = FileManager.sanitize_folder_name(project.name)
    file_manager.create_project_directories(sanitized_name)

    return project

@router.get("/", response_model=List[ProjectResponse])
def list_projects(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
) -> List[Project]:
    """Get all projects"""
    statement = select(Project).offset(skip).limit(limit)
    projects = db.exec(statement).all()
    return projects

@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project(
    project_id: UUID,
    db: Session = Depends(get_db)
) -> Project:
    """Get project by ID with all related data"""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return project

@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: UUID,
    project_in: ProjectUpdate,
    db: Session = Depends(get_db)
) -> Project:
    """Update project"""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    update_data = project_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    from datetime import datetime
    project.updated_at = datetime.utcnow()
    
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete project and all related data"""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # Delete project files using sanitized project name
    file_manager = FileManager()
    sanitized_name = FileManager.sanitize_folder_name(project.name)
    file_manager.delete_project_directory(sanitized_name)

    db.delete(project)
    db.commit()
    return None

@router.post("/{project_id}/bulk-save", response_model=BulkSaveResponse)
async def bulk_save_project(
    project_id: str,
    data: BulkSaveRequest,
    db: Session = Depends(get_db)
):
    """
    Bulk save operation for project with all related data (images, markers, regions)
    
    This endpoint saves:
    - Project metadata (name, operator, company, notes)
    - All thermal images with their data
    - All markers with temperatures and positions
    - All regions with statistics
    
    All data is persisted to the database for future retrieval.
    """
    file_manager = FileManager()

    # Handle "null" project_id for new projects
    if project_id == "null":
        # Create new project
        project = Project(
            name=data.project.name,
            operator=data.project.operator,
            company=data.project.company,
            notes=data.project.notes
        )
        
        # Set state persistence fields for new project
        if data.active_image_id:
            try:
                project.active_image_id = UUID(data.active_image_id)
            except (ValueError, AttributeError):
                pass
        
        project.current_palette = data.current_palette or "iron"
        project.custom_min_temp = data.custom_min_temp
        project.custom_max_temp = data.custom_max_temp
        project.global_parameters = data.global_parameters
        project.display_settings = data.display_settings
        project.window_layout = data.window_layout
        
        db.add(project)
        db.commit()
        db.refresh(project)

        # Create project directories using sanitized project name
        sanitized_name = FileManager.sanitize_folder_name(project.name)
        file_manager.create_project_directories(sanitized_name)
    else:
        # Update existing project
        try:
            project_uuid = UUID(project_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid project ID format"
            )

        project = db.get(Project, project_uuid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

        # Update project fields
        project.name = data.project.name
        project.operator = data.project.operator
        project.company = data.project.company
        project.notes = data.project.notes
        project.has_unsaved_changes = False
        
        # Update state persistence fields
        if data.active_image_id:
            try:
                project.active_image_id = UUID(data.active_image_id)
            except (ValueError, AttributeError):
                project.active_image_id = None
        
        project.current_palette = data.current_palette or "iron"
        project.custom_min_temp = data.custom_min_temp
        project.custom_max_temp = data.custom_max_temp
        project.global_parameters = data.global_parameters
        project.display_settings = data.display_settings
        project.window_layout = data.window_layout
        
        from datetime import datetime
        project.updated_at = datetime.utcnow()

        db.add(project)
        db.commit()

    # Map to track old image IDs to new image objects
    image_id_map = {}

    # Process images
    for img_data in data.images:
        try:
            # Check if image already exists
            if img_data.id:
                try:
                    img_uuid = UUID(img_data.id)
                    existing_image = db.get(ThermalImage, img_uuid)
                    if existing_image and existing_image.project_id == project.id:
                        # Update existing image
                        existing_image.name = img_data.name
                        if img_data.thermal_data:
                            existing_image.thermal_data = img_data.thermal_data
                        if img_data.server_palettes:
                            existing_image.server_palettes = img_data.server_palettes
                        if img_data.csv_url:
                            existing_image.csv_url = img_data.csv_url
                        db.add(existing_image)
                        image_id_map[img_data.id] = existing_image
                        continue
                except (ValueError, AttributeError):
                    pass

            # Create new image
            new_image = ThermalImage(
                project_id=project.id,
                name=img_data.name
            )

            # Save base64 images to disk if provided
            # Use sanitized project name for folder structure
            sanitized_name = FileManager.sanitize_folder_name(project.name)
            project_dir = Path(settings.PROJECTS_DIR) / sanitized_name
            project_dir.mkdir(parents=True, exist_ok=True)

            if img_data.thermal_image_base64:
                try:
                    # Remove data URL prefix if present
                    thermal_b64 = img_data.thermal_image_base64
                    if "base64," in thermal_b64:
                        thermal_b64 = thermal_b64.split("base64,")[1]

                    thermal_bytes = base64.b64decode(thermal_b64)
                    thermal_path = project_dir / f"{new_image.id}_thermal.png"
                    thermal_path.write_bytes(thermal_bytes)
                    new_image.thermal_image_path = f"/files/projects/{sanitized_name}/{thermal_path.name}"
                except Exception as e:
                    print(f"Error saving thermal image: {e}")

            if img_data.real_image_base64:
                try:
                    # Remove data URL prefix if present
                    real_b64 = img_data.real_image_base64
                    if "base64," in real_b64:
                        real_b64 = real_b64.split("base64,")[1]

                    real_bytes = base64.b64decode(real_b64)
                    real_path = project_dir / f"{new_image.id}_real.png"
                    real_path.write_bytes(real_bytes)
                    new_image.real_image_path = f"/files/projects/{sanitized_name}/{real_path.name}"
                except Exception as e:
                    print(f"Error saving real image: {e}")

            # Handle thermal data
            if img_data.thermal_data:
                new_image.thermal_data = img_data.thermal_data
            elif img_data.thermal_data_json:
                try:
                    new_image.thermal_data = json.loads(img_data.thermal_data_json)
                except json.JSONDecodeError:
                    print(f"Error parsing thermal data JSON for image {img_data.name}")
            
            # Handle server palettes and CSV URL
            if img_data.server_palettes:
                new_image.server_palettes = img_data.server_palettes
            if img_data.csv_url:
                new_image.csv_url = img_data.csv_url

            db.add(new_image)
            db.flush()  # Get the ID without committing

            # Store mapping for markers/regions
            if img_data.id:
                image_id_map[img_data.id] = new_image

        except Exception as e:
            print(f"Error processing image {img_data.name}: {e}")
            continue

    db.commit()

    # Delete existing markers and regions for this project
    db.exec(select(Marker).where(Marker.project_id == project.id)).all()
    for marker in db.exec(select(Marker).where(Marker.project_id == project.id)):
        db.delete(marker)
    for region in db.exec(select(Region).where(Region.project_id == project.id)):
        db.delete(region)
    db.commit()

    # Process markers
    for marker_data in data.markers:
        try:
            # Find the corresponding image
            mapped_image = image_id_map.get(marker_data.image_id)
            if not mapped_image:
                print(f"Image not found for marker: {marker_data.name}")
                continue

            new_marker = Marker(
                project_id=project.id,
                image_id=mapped_image.id,
                type=marker_data.type or "point",
                x=marker_data.x,
                y=marker_data.y,
                temperature=marker_data.temperature or 0.0,
                label=marker_data.label or marker_data.name,
                emissivity=marker_data.emissivity or 0.95
            )
            db.add(new_marker)
        except Exception as e:
            print(f"Error processing marker {marker_data.name}: {e}")
            continue

    # Process regions
    for region_data in data.regions:
        try:
            # Find the corresponding image
            mapped_image = image_id_map.get(region_data.image_id)
            if not mapped_image:
                print(f"Image not found for region: {region_data.name}")
                continue

            new_region = Region(
                project_id=project.id,
                image_id=mapped_image.id,
                type=region_data.type or "polygon",
                points=region_data.points,
                min_temp=region_data.min_temp or 0.0,
                max_temp=region_data.max_temp or 0.0,
                avg_temp=region_data.avg_temp or 0.0,
                area=region_data.area,
                label=region_data.label or region_data.name,
                emissivity=region_data.emissivity or 0.95
            )
            db.add(new_region)
        except Exception as e:
            print(f"Error processing region {region_data.name}: {e}")
            continue

    db.commit()

    # Refresh project to get all relationships
    db.refresh(project)

    return BulkSaveResponse(
        success=True,
        project=project,
        message="Project saved successfully with all images, markers, and regions"
    )