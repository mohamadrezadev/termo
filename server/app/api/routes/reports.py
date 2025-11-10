import os
from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import FileResponse
from uuid import uuid4
from server.app.services.report_generator import ReportService
from app.db.models import ReportRecord
from server.app.db.session import get_session

router = APIRouter()
svc = ReportService()

@router.post("/generate")
def generate_report(req: dict = Body(...)):
    project_id = req.get("project_id")
    if not project_id:
        raise HTTPException(status_code=400, detail="project_id required")
    metadata = req.get("metadata", {})
    data = req.get("data", {})
    out_type = req.get("type", "pdf")
    filename_base = req.get("filename") or f"{project_id}_{uuid4().hex[:8]}"
    if out_type == "pdf":
        out_path = svc.generate_pdf(project_id, metadata, data, filename_base)
    else:
        out_path = svc.generate_docx(project_id, metadata, data, filename_base)
    # save report record
    with next(get_session()) as session:
        rec = ReportRecord(project_id=project_id, filename=out_path, type=out_type)
        session.add(rec); session.commit()
    return FileResponse(out_path, filename=os.path.basename(out_path))
