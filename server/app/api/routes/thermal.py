# app/api/routes/thermal.py
from fastapi import APIRouter, Body, HTTPException
import subprocess
import json
import os
import tempfile

router = APIRouter()

CSHARP_APP = r"D:\پروژه های دانش بنیان\termo2\termo\BmtExtract\BmtExtract\bin\Debug\net8.0\BmtExtract.exe"

def process_bmt_file(bmt_path: str) -> dict:
    """
    Runs the C# BMT extractor and returns parsed JSON.
    """
    if not os.path.exists(bmt_path):
        raise FileNotFoundError(f"BMT file not found: {bmt_path}")

    output_dir = tempfile.mkdtemp()

    result = subprocess.run(
        [CSHARP_APP, bmt_path, output_dir],
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        raise RuntimeError(f"Extractor error: {result.stderr}")

    json_path = os.path.join(output_dir, "data.json")
    if not os.path.exists(json_path):
        raise RuntimeError("Extractor did not produce data.json")

    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)


@router.post("/process")
def process(payload: dict = Body(...)):
    """
    FastAPI endpoint to process a BMT file.
    Expects JSON payload with:
        - project_id: str
        - path: str (file path to BMT)
        - palette: str (optional)
        - use_fahrenheit: bool (optional)
    """
    project_id = payload.get("project_id")
    file_path = payload.get("path")
    palette = payload.get("palette", "iron")
    use_fahrenheit = payload.get("use_fahrenheit", False)

    if not project_id or not file_path:
        raise HTTPException(status_code=400, detail="project_id and path are required")

    try:
        # Call the subprocess wrapper
        data = process_bmt_file(file_path)

        # You can optionally apply palette or convert temperature here
        # For example:
        data["palette"] = palette
        data["use_fahrenheit"] = use_fahrenheit

        return {"project_id": project_id, "data": data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
