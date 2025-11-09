from fastapi import APIRouter, Body, HTTPException
from app.db.models import Marker
from app.db.database import get_session

router = APIRouter()

@router.post("/{project_id}/add")
def add_marker(project_id: str, marker: dict = Body(...)):
    m = Marker(project_id=project_id,
               marker_id=marker.get("id") or marker.get("marker_id") or marker.get("marker_id"),
               label=marker.get("label"),
               x=marker.get("x"),
               y=marker.get("y"),
               radius=marker.get("radius"),
               polygon=marker.get("polygon"),
               temp=marker.get("temp"),
               note=marker.get("note"))
    with next(get_session()) as session:
        session.add(m); session.commit()
    return {"ok": True, "marker": m}
