"""
Project management API routes for saving and loading thermal analysis projects
"""
from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any
import logging
from app.db.persistence import init_db, save_project, load_project, list_projects, delete_project

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/project", tags=["projects"])

# Initialize database on startup
init_db()


@router.post("/save")
async def save_project_endpoint(project: Dict[str, Any]):
    """
    Save project with all thermal analysis data
    
    Request body:
    {
        "id": "project_id",
        "name": "Project Name",
        "description": "Optional description",
        "images": [...],
        "markers": [...],
        "regions": [...],
        "activeImageId": "image_id",
        "currentPalette": "iron",
        "customMinTemp": null,
        "customMaxTemp": null
    }
    """
    try:
        if not project.get('id'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Project ID is required"
            )
        
        logger.info(f"Saving project: {project.get('name')} (ID: {project.get('id')})")
        
        success = save_project(project)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save project"
            )
        
        return {
            "status": "success",
            "message": f"Project '{project.get('name')}' saved successfully",
            "project_id": project.get('id')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving project: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save project: {str(e)}"
        )


@router.get("/load/{project_id}")
async def load_project_endpoint(project_id: str):
    """
    Load project with all thermal analysis data
    
    Returns complete project including images, markers, regions, and all analysis data
    """
    try:
        logger.info(f"Loading project: {project_id}")
        
        project_data = load_project(project_id)
        
        if not project_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{project_id}' not found"
            )
        
        return {
            "status": "success",
            "project": project_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading project: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load project: {str(e)}"
        )


@router.get("/list")
async def list_projects_endpoint():
    """
    List all saved projects
    
    Returns list of projects with metadata (name, description, created/updated dates)
    """
    try:
        logger.info("Listing all projects")
        
        projects = list_projects()
        
        return {
            "status": "success",
            "projects": projects,
            "count": len(projects)
        }
        
    except Exception as e:
        logger.error(f"Error listing projects: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list projects: {str(e)}"
        )


@router.delete("/delete/{project_id}")
async def delete_project_endpoint(project_id: str):
    """
    Delete project and all related data
    
    Warning: This operation cannot be undone
    """
    try:
        logger.info(f"Deleting project: {project_id}")
        
        success = delete_project(project_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete project"
            )
        
        return {
            "status": "success",
            "message": f"Project '{project_id}' deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting project: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete project: {str(e)}"
        )
