from fastapi import APIRouter

from app.api.routes import (
    project,  # Changed from 'projects' to 'project' for SQLModel
    thermal,
    markers,
    regions,
    # template,
    reports
)

api_router = APIRouter()

api_router.include_router(
    project.router,  # Changed from projects.router to project.router
    prefix="/projects",
    tags=["projects"]
)

api_router.include_router(
    thermal.router,
    prefix="/thermal",
    tags=["thermal"]
)

api_router.include_router(
    markers.router,
    prefix="/markers",
    tags=["markers"]
)

api_router.include_router(
    regions.router,
    prefix="/regions",
    tags=["regions"]
)

# api_router.include_router(
#     templates.router,
#     prefix="/templates",
#     tags=["templates"]
# )

api_router.include_router(
    reports.router,
    prefix="/reports",
    tags=["reports"]
)