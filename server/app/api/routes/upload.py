from fastapi import APIRouter, UploadFile, File, HTTPException
from app.core.file_utils import save_upload_file
from app.db.database import get_session
from app.db.models import ImageRecord
from sqlmodel import Session
from fastapi import Depends

router = APIRouter()

@router.post("/{project_id}")
async def upload_files(project_id: str, thermal: UploadFile = File(...), visual: UploadFile = File(...)):
    tpath = save_upload_file(project_id, thermal)
    vpath = save_upload_file(project_id, visual)
    with next(get_session()) as session:
        t = ImageRecord(project_id=project_id, original_path=tpath, type="thermal")
        v = ImageRecord(project_id=project_id, original_path=vpath, type="visual")
        session.add(t); session.add(v); session.commit()
    return {"thermal_path": tpath, "visual_path": vpath}
