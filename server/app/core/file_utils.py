from pathlib import Path
import shutil, uuid
from app.core.config import PROJECTS_DIR

def ensure_project_dirs(project_id: str):
    base = Path(PROJECTS_DIR) / project_id
    raw = base / "raw"
    extracted = base / "extracted"
    reports = base / "reports"
    raw.mkdir(parents=True, exist_ok=True)
    extracted.mkdir(parents=True, exist_ok=True)
    reports.mkdir(parents=True, exist_ok=True)
    return {"base": base, "raw": raw, "extracted": extracted, "reports": reports}

def save_upload_file(project_id: str, upload_file) -> Path:
    dirs = ensure_project_dirs(project_id)
    filename = f"{uuid.uuid4().hex}_{upload_file.filename}"
    dest = dirs["raw"] / filename
    with open(dest, "wb") as f:
        shutil.copyfileobj(upload_file.file, f)
    return dest

def save_bytes(project_id: str, content: bytes, filename: str, subdir="extracted") -> Path:
    dirs = ensure_project_dirs(project_id)
    dest = dirs[subdir] / filename
    with open(dest, "wb") as f:
        f.write(content)
    return dest
