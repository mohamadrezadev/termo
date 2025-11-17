# server/app/services/file_manager.py
import os
import re
import shutil
import tempfile
from pathlib import Path
from datetime import datetime
from typing import Optional
from uuid import uuid4

from app.core.config import settings


class FileManager:
    """
    Manages file storage for the thermal analyzer application.
    Handles project directories, file uploads, and temporary files.
    """

    def __init__(self):
        # Base directory for all projects
        self.projects_dir = settings.PROJECTS_DIR
        self.projects_dir.mkdir(parents=True, exist_ok=True)

        # Temporary directory
        self.temp_dir = Path(tempfile.gettempdir()) / "thermal_analyzer_temp"
        self.temp_dir.mkdir(exist_ok=True)
        
        self.base_dir = Path("projects")

        if not self.base_dir.exists():
            self.base_dir.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def sanitize_folder_name(name: str) -> str:
        """
        Sanitize a project name to create a valid folder name.
        Removes invalid characters and replaces spaces with underscores.
        """
        # Replace spaces with underscores
        sanitized = name.replace(" ", "_")
        # Remove invalid filesystem characters
        sanitized = re.sub(r'[<>:"/\\|?*]', '', sanitized)
        # Limit length to 100 characters
        sanitized = sanitized[:100]
        # Remove leading/trailing dots and spaces
        sanitized = sanitized.strip('. ')
        # If empty after sanitization, use a default
        if not sanitized:
            sanitized = "project"
        return sanitized

    def get_project_dir(self, project_identifier: str) -> Path:
        """
        Get the directory path for a project.

        Args:
            project_identifier: Can be project name or UUID
        """
        return self.projects_dir / project_identifier

    def create_project_directories(self, project_id: str):
        """
        Create directory structure for a new project:
        projects/<project_id>/
            ├── images/       # Processed images
            ├── reports/      # Generated reports
            ├── thermal/      # Thermal images
            ├── real/         # Real images
            ├── csv/          # Temperature CSV files
            └── uploads/      # Original uploaded files
        Returns dict with paths to all directories
        """
        try:
            # Use both base_dir and projects_dir for compatibility
            project_dir = self.base_dir / project_id
            project_dir_alt = self.projects_dir / project_id
            
            # Create main project directories
            for pd in [project_dir, project_dir_alt]:
                pd.mkdir(parents=True, exist_ok=True)
            
            # Create subdirectories
            subdirs = ["images", "reports", "thermal", "real", "csv", "uploads"]
            paths = {}
            
            for subdir in subdirs:
                dir_path = project_dir / subdir
                dir_path.mkdir(exist_ok=True)
                paths[subdir] = dir_path
                
                # Also create in alt location
                (project_dir_alt / subdir).mkdir(exist_ok=True)

            # Create metadata file if not exists
            metadata_path = project_dir / "metadata.json"
            if not metadata_path.exists():
                import json
                metadata = {
                    "created_at": datetime.utcnow().isoformat(),
                    "project_id": project_id
                }
                with open(metadata_path, 'w', encoding='utf-8') as f:
                    json.dump(metadata, f, indent=2, ensure_ascii=False)
            
            paths["project"] = project_dir
            return paths

        except Exception as e:
            print(f"Error creating directories: {e}")
            import traceback
            traceback.print_exc()
            return None

    def save_temp_file(self, upload_file) -> str:
        """
        Save uploaded file to temporary location.
        Returns: Path to saved file
        """
        # Generate unique filename
        file_ext = Path(upload_file.filename).suffix
        temp_filename = f"{uuid4().hex}{file_ext}"
        temp_path = self.temp_dir / temp_filename

        # Save file
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)

        return str(temp_path)

    def save_project_file(
        self,
        project_id: str,
        source_path: str,
        file_type: str,  # 'thermal', 'real', 'csv', etc.
        original_filename: str
    ) -> str:
        """
        Move file from temporary location to project directory.
        
        Args:
            project_id: Project UUID
            source_path: Path to source file
            file_type: Type of file (determines subdirectory)
            original_filename: Original name of file
            
        Returns:
            Relative URL path to file (for storage in database)
        """
        # Ensure project directories exist
        self.create_project_directories(project_id)

        # Determine destination
        project_dir = self.get_project_dir(project_id)
        subdir = project_dir / file_type
        
        # Generate filename
        file_ext = Path(original_filename).suffix
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{Path(original_filename).stem}_{timestamp}{file_ext}"
        dest_path = subdir / filename

        # Copy file
        shutil.copy2(source_path, dest_path)

        # Return relative URL path
        relative_path = dest_path.relative_to(self.projects_dir)
        return f"/files/projects/{relative_path}"

    def get_file_path(self, url_path: str) -> Optional[Path]:
        """
        Convert URL path back to filesystem path.
        
        Args:
            url_path: URL like "/files/projects/project_id/thermal/file.png"
            
        Returns:
            Full filesystem path or None if invalid
        """
        try:
            # Remove /files/projects/ prefix
            if url_path.startswith("/files/projects/"):
                relative_path = url_path.replace("/files/projects/", "")
                full_path = self.projects_dir / relative_path
                
                if full_path.exists():
                    return full_path
            
            return None
        except Exception:
            return None

    def delete_project_directory(self, project_id: str) -> bool:
        """
        Delete entire project directory.
        Returns True if successful.
        """
        try:
            project_dir = self.get_project_dir(project_id)
            if project_dir.exists():
                shutil.rmtree(project_dir)
            return True
        except Exception as e:
            print(f"Error deleting project directory: {e}")
            return False

    def cleanup_temp_files(self, max_age_hours: int = 24) -> None:
        """Remove temporary files older than specified hours"""
        try:
            current_time = datetime.now()
            
            for file_path in self.temp_dir.glob("*"):
                if file_path.is_file():
                    # Check file age
                    file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                    age_hours = (current_time - file_time).total_seconds() / 3600
                    
                    if age_hours > max_age_hours:
                        file_path.unlink()
        except Exception as e:
            print(f"Error cleaning temp files: {e}")

    def get_project_size(self, project_id: str) -> int:
        """Calculate total size of project directory in bytes"""
        total_size = 0
        project_dir = self.get_project_dir(project_id)
        
        if project_dir.exists():
            for file_path in project_dir.rglob("*"):
                if file_path.is_file():
                    total_size += file_path.stat().st_size
        
        return total_size

    def list_project_files(self, project_id: str, file_type: Optional[str] = None) -> list:
        """
        List all files in project directory.
        
        Args:
            project_id: Project UUID
            file_type: Optional filter by type ('thermal', 'real', etc.)
            
        Returns:
            List of file info dicts
        """
        project_dir = self.get_project_dir(project_id)
        
        if file_type:
            search_dir = project_dir / file_type
        else:
            search_dir = project_dir

        if not search_dir.exists():
            return []

        files = []
        for file_path in search_dir.rglob("*"):
            if file_path.is_file() and file_path.name != "metadata.json":
                relative_path = file_path.relative_to(project_dir)
                files.append({
                    "name": file_path.name,
                    "path": str(relative_path),
                    "size": file_path.stat().st_size,
                    "modified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
                })
        
        return files