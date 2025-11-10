import os
import shutil
from pathlib import Path
from datetime import datetime
from app.core.config import settings


class FileManager:
    """
    Handles creation, deletion, and management of project file directories.
    Base path: /data/projects/<project_id>/
    """

    def __init__(self):
        # base data directory (from config or default)
        self.base_dir = Path(settings.DATA_DIR) if hasattr(settings, "DATA_DIR") else Path("data/projects")
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def get_project_dir(self, project_id: str) -> Path:
        """Returns path of the project directory."""
        return self.base_dir / project_id

    def create_project_directories(self, project_id: str) -> None:
        """
        Create folder structure for a new project.
        Example:
            data/projects/<project_id>/
                ├── uploads/
                ├── thermal/
                ├── reports/
                └── metadata.json
        """
        project_dir = self.get_project_dir(project_id)
        if not project_dir.exists():
            project_dir.mkdir(parents=True, exist_ok=True)

        # Subdirectories
        (project_dir / "uploads").mkdir(exist_ok=True)
        (project_dir / "thermal").mkdir(exist_ok=True)
        (project_dir / "reports").mkdir(exist_ok=True)

        # Metadata file (optional)
        metadata_path = project_dir / "metadata.json"
        if not metadata_path.exists():
            metadata_path.write_text(
                f'{{"created_at": "{datetime.utcnow().isoformat()}"}}',
                encoding="utf-8"
            )

    def delete_project_directory(self, project_id: str) -> None:
        """
        Delete the entire project directory and its contents.
        """
        project_dir = self.get_project_dir(project_id)
        if project_dir.exists():
            shutil.rmtree(project_dir)

    def save_uploaded_file(self, project_id: str, file, filename: str) -> str:
        """
        Save an uploaded file under the project's uploads directory.
        Returns the saved file path.
        """
        upload_dir = self.get_project_dir(project_id) / "uploads"
        upload_dir.mkdir(parents=True, exist_ok=True)

        file_path = upload_dir / filename
        with open(file_path, "wb") as f:
            content = file.file.read()
            f.write(content)

        return str(file_path)

    def save_thermal_output(self, project_id: str, filename: str, content: bytes) -> str:
        """
        Save extracted thermal data or image files in /thermal/ folder.
        Returns the saved file path.
        """
        thermal_dir = self.get_project_dir(project_id) / "thermal"
        thermal_dir.mkdir(parents=True, exist_ok=True)

        output_path = thermal_dir / filename
        with open(output_path, "wb") as f:
            f.write(content)

        return str(output_path)

    def list_project_files(self, project_id: str) -> list[str]:
        """
        List all files under the project's directory.
        """
        project_dir = self.get_project_dir(project_id)
        if not project_dir.exists():
            return []

        files = []
        for root, _, filenames in os.walk(project_dir):
            for file in filenames:
                full_path = os.path.join(root, file)
                files.append(os.path.relpath(full_path, self.base_dir))
        return files
