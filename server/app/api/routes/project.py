from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
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
    print(f"[CREATE_PROJECT] Received data: {project_in}")
    print(f"[CREATE_PROJECT] Name: {project_in.name}")
    print(f"[CREATE_PROJECT] Operator: {project_in.operator}")
    print(f"[CREATE_PROJECT] Company: {project_in.company}")
    print(f"[CREATE_PROJECT] Notes: {project_in.notes}")
    
    try:
        project = Project(**project_in.dict())
        db.add(project)
        db.commit()
        db.refresh(project)

        # Create project directories using sanitized project name
        file_manager = FileManager()
        sanitized_name = FileManager.sanitize_folder_name(project.name)
        file_manager.create_project_directories(sanitized_name)

        print(f"[CREATE_PROJECT] Project created successfully: {project.id}")
        return project
    except Exception as e:
        print(f"[CREATE_PROJECT] Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise

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

@router.get("/{project_id}")
def get_project(
    project_id: UUID,
    db: Session = Depends(get_db)
):
    """Get project by ID with all related data including base64 encoded images"""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Convert image paths to base64 for frontend
    file_manager = FileManager()
    for image in project.images:
        print(f"[GET_PROJECT] Processing image: {image.name}")
        print(f"[GET_PROJECT] Real path: {image.real_image_path}")
        print(f"[GET_PROJECT] Thermal path: {image.thermal_image_path}")
        
        # Convert real image to base64
        if image.real_image_path and not image.real_image_path.startswith('data:image'):
            try:
                real_path = file_manager.get_file_path(image.real_image_path)
                print(f"[GET_PROJECT] Real file resolved to: {real_path}")
                if real_path and real_path.exists():
                    print(f"[GET_PROJECT] Real file exists, reading...")
                    with open(real_path, 'rb') as f:
                        real_data = f.read()
                        real_b64 = base64.b64encode(real_data).decode('utf-8')
                        # Add data URL prefix based on extension
                        ext = real_path.suffix.lower()
                        mime_type = 'image/jpeg' if ext in ['.jpg', '.jpeg'] else 'image/png' if ext == '.png' else 'image/bmp'
                        image.real_image_path = f'data:{mime_type};base64,{real_b64}'
                        print(f"[GET_PROJECT] Real image converted to base64: {len(real_b64)} bytes")
                else:
                    print(f"[GET_PROJECT] Real file not found! Setting to None")
                    image.real_image_path = None
            except Exception as e:
                print(f"[GET_PROJECT] Error loading real image {image.name}: {e}")
                image.real_image_path = None
                import traceback
                traceback.print_exc()
        
        # Convert thermal image to base64
        if image.thermal_image_path and not image.thermal_image_path.startswith('data:image'):
            try:
                thermal_path = file_manager.get_file_path(image.thermal_image_path)
                print(f"[GET_PROJECT] Thermal file resolved to: {thermal_path}")
                if thermal_path and thermal_path.exists():
                    print(f"[GET_PROJECT] Thermal file exists, reading...")
                    with open(thermal_path, 'rb') as f:
                        thermal_data = f.read()
                        thermal_b64 = base64.b64encode(thermal_data).decode('utf-8')
                        ext = thermal_path.suffix.lower()
                        mime_type = 'image/jpeg' if ext in ['.jpg', '.jpeg'] else 'image/png' if ext == '.png' else 'image/bmp'
                        image.thermal_image_path = f'data:{mime_type};base64,{thermal_b64}'
                        print(f"[GET_PROJECT] Thermal image converted to base64: {len(thermal_b64)} bytes")
                else:
                    print(f"[GET_PROJECT] Thermal file not found! Setting to None")
                    image.thermal_image_path = None
            except Exception as e:
                print(f"[GET_PROJECT] Error loading thermal image {image.name}: {e}")
                image.thermal_image_path = None
                import traceback
                traceback.print_exc()
        
        # Convert server palettes to base64
        if image.server_palettes:
            print(f"[GET_PROJECT] Processing {len(image.server_palettes)} server palettes")
            palettes_to_remove = []
            for palette_name, palette_path in image.server_palettes.items():
                print(f"[GET_PROJECT] Palette '{palette_name}': {palette_path}")
                if palette_path and not palette_path.startswith('data:image'):
                    try:
                        p_path = file_manager.get_file_path(palette_path)
                        print(f"[GET_PROJECT] Palette file resolved to: {p_path}")
                        if p_path and p_path.exists():
                            with open(p_path, 'rb') as f:
                                p_data = f.read()
                                p_b64 = base64.b64encode(p_data).decode('utf-8')
                                ext = p_path.suffix.lower()
                                mime_type = 'image/jpeg' if ext in ['.jpg', '.jpeg'] else 'image/png' if ext == '.png' else 'image/bmp'
                                image.server_palettes[palette_name] = f'data:{mime_type};base64,{p_b64}'
                                print(f"[GET_PROJECT] Palette '{palette_name}' converted to base64: {len(p_b64)} bytes")
                        else:
                            print(f"[GET_PROJECT] Palette file not found: {p_path}, will remove from palette list")
                            palettes_to_remove.append(palette_name)
                    except Exception as e:
                        print(f"[GET_PROJECT] Error loading palette {palette_name} for image {image.name}: {e}")
                        palettes_to_remove.append(palette_name)
                        import traceback
                        traceback.print_exc()
                else:
                    print(f"[GET_PROJECT] Palette '{palette_name}' already base64 or empty")
            
            # Remove palettes that couldn't be loaded
            for palette_name in palettes_to_remove:
                del image.server_palettes[palette_name]
                print(f"[GET_PROJECT] Removed palette '{palette_name}' from list")
        else:
            print(f"[GET_PROJECT] No server palettes for image {image.name}")
    
    # Build response dictionary manually to avoid SQLModel re-serialization from DB
    response = {
        "id": str(project.id),
        "name": project.name,
        "operator": project.operator or "",
        "company": project.company or "",
        "date": project.date.isoformat(),
        "notes": project.notes or "",
        "has_unsaved_changes": project.has_unsaved_changes,
        "created_at": project.created_at.isoformat(),
        "updated_at": project.updated_at.isoformat(),
        "active_image_id": str(project.active_image_id) if project.active_image_id else None,
        "current_palette": project.current_palette or "iron",
        "custom_min_temp": project.custom_min_temp,
        "custom_max_temp": project.custom_max_temp,
        "global_parameters": project.global_parameters,
        "display_settings": project.display_settings,
        "window_layout": project.window_layout,
        "images": [
            {
                "id": str(img.id),
                "project_id": str(img.project_id),
                "name": img.name,
                "real_image_path": img.real_image_path,  # Already base64
                "thermal_image_path": img.thermal_image_path,  # Already base64
                "server_rendered_path": img.server_rendered_path,
                "thermal_data": img.thermal_data,
                "server_palettes": img.server_palettes,  # Already base64
                "csv_url": img.csv_url,
                "created_at": img.created_at.isoformat(),
                "updated_at": img.updated_at.isoformat()
            }
            for img in project.images
        ],
        "markers": [
            {
                "id": str(m.id),
                "image_id": str(m.image_id),
                "name": m.label,
                "x": m.x,
                "y": m.y,
                "temperature": m.temperature,
                "type": str(m.type.value) if hasattr(m.type, 'value') else str(m.type),
                "label": m.label,
                "emissivity": m.emissivity,
                "created_at": m.created_at.isoformat()
            }
            for m in project.markers
        ],
        "regions": [
            {
                "id": str(r.id),
                "image_id": str(r.image_id),
                "name": r.label,
                "points": r.points,
                "type": str(r.type.value) if hasattr(r.type, 'value') else str(r.type),
                "label": r.label,
                "color": None,
                "min_temp": r.min_temp,
                "max_temp": r.max_temp,
                "avg_temp": r.avg_temp,
                "area": r.area,
                "emissivity": r.emissivity,
                "created_at": r.created_at.isoformat()
            }
            for r in project.regions
        ]
    }
    
    # Log final summary
    print(f"\n[GET_PROJECT] ===== FINAL SUMMARY =====")
    print(f"[GET_PROJECT] Project: {project.name}")
    print(f"[GET_PROJECT] Total images: {len(project.images)}")
    for img in project.images:
        print(f"[GET_PROJECT] Image '{img.name}':")
        print(f"  - Real image: {'base64' if img.real_image_path and img.real_image_path.startswith('data:') else img.real_image_path}")
        print(f"  - Thermal image: {'base64' if img.thermal_image_path and img.thermal_image_path.startswith('data:') else img.thermal_image_path}")
        print(f"  - Server palettes: {list(img.server_palettes.keys()) if img.server_palettes else 'None'}")
    print(f"[GET_PROJECT] ===== END SUMMARY =====\n")
    
    return response

@router.get("/load/{project_id}")
def load_project(
    project_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Load project by ID with all related data including base64 encoded images
    This is an alias for GET /{project_id}
    """
    return get_project(project_id, db)

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
                        print(f"[BULK_SAVE] Updating existing image: {existing_image.name}")
                        
                        # Update existing image
                        existing_image.name = img_data.name
                        
                        # Update thermal_data if provided
                        if img_data.thermal_data:
                            existing_image.thermal_data = img_data.thermal_data
                        elif img_data.thermal_data_json:
                            try:
                                existing_image.thermal_data = json.loads(img_data.thermal_data_json)
                            except json.JSONDecodeError:
                                print(f"Error parsing thermal data JSON for image {img_data.name}")
                        
                        # Update server_palettes if provided (but don't overwrite with None/empty)
                        if img_data.server_palettes:
                            existing_image.server_palettes = img_data.server_palettes
                        
                        # Update csv_url if provided
                        if img_data.csv_url:
                            existing_image.csv_url = img_data.csv_url
                        
                        # Save/update base64 images if provided
                        sanitized_name = FileManager.sanitize_folder_name(project.name)
                        project_dir = settings.PROJECTS_DIR / sanitized_name
                        project_dir.mkdir(parents=True, exist_ok=True)
                        
                        if img_data.thermal_image_base64:
                            try:
                                thermal_b64 = img_data.thermal_image_base64
                                if "base64," in thermal_b64:
                                    thermal_b64 = thermal_b64.split("base64,")[1]
                                thermal_bytes = base64.b64decode(thermal_b64)
                                thermal_path = project_dir / f"{existing_image.id}_thermal.png"
                                thermal_path.write_bytes(thermal_bytes)
                                existing_image.thermal_image_path = f"/files/projects/{sanitized_name}/{thermal_path.name}"
                                print(f"[BULK_SAVE] Updated thermal image: {thermal_path}")
                            except Exception as e:
                                print(f"[BULK_SAVE] Error updating thermal image: {e}")
                        
                        if img_data.real_image_base64:
                            try:
                                real_b64 = img_data.real_image_base64
                                if "base64," in real_b64:
                                    real_b64 = real_b64.split("base64,")[1]
                                real_bytes = base64.b64decode(real_b64)
                                real_path = project_dir / f"{existing_image.id}_real.png"
                                real_path.write_bytes(real_bytes)
                                existing_image.real_image_path = f"/files/projects/{sanitized_name}/{real_path.name}"
                                print(f"[BULK_SAVE] Updated real image: {real_path}")
                            except Exception as e:
                                print(f"[BULK_SAVE] Error updating real image: {e}")
                        
                        from datetime import datetime
                        existing_image.updated_at = datetime.utcnow()
                        
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
            
            # Use settings.PROJECTS_DIR to ensure consistency
            project_dir = settings.PROJECTS_DIR / sanitized_name
            project_dir.mkdir(parents=True, exist_ok=True)
            
            print(f"[BULK_SAVE] Project directory: {project_dir}")

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
                    print(f"[BULK_SAVE] Thermal image saved: {thermal_path}")
                except Exception as e:
                    print(f"[BULK_SAVE] Error saving thermal image: {e}")
                    import traceback
                    traceback.print_exc()

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
                    print(f"[BULK_SAVE] Real image saved: {real_path}")
                except Exception as e:
                    print(f"[BULK_SAVE] Error saving real image: {e}")
                    import traceback
                    traceback.print_exc()

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

@router.get("/images/serve/{file_path:path}")
def serve_image(file_path: str):
    """Serve image file from storage"""
    file_manager = FileManager()
    full_path = file_manager.get_file_path(file_path)
    
    if not full_path or not full_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image file not found"
        )
    
    # Determine media type
    ext = full_path.suffix.lower()
    media_type = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.bmp': 'image/bmp',
        '.gif': 'image/gif'
    }.get(ext, 'application/octet-stream')
    
    return FileResponse(
        path=str(full_path),
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=31536000"}
    )