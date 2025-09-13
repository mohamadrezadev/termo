from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from fastapi.responses import FileResponse, JSONResponse
import shutil
from PIL import Image
from io import BytesIO
import os
import uuid
import struct
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "temp_uploads")
EXTRACT_DIR = os.path.join(BASE_DIR, "extracted_images")


# Lifespan for startup/shutdown (replaces @app.on_event("startup"))
@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(EXTRACT_DIR, exist_ok=True)
    logger.info("Server startup complete - directories initialized")
    yield
    logger.info("Server shutdown complete")


app = FastAPI(lifespan=lifespan)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev; adjust for prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# Serve static images
@app.get("/static_images/{filename}")
async def serve_static_image(filename: str):
    file_path = os.path.join(EXTRACT_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(
        file_path,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Cache-Control": "no-cache"
        }
    )


# Extract BMPs from file
def extract_bmps(file_path: str, original_filename: str):
    with open(file_path, 'rb') as f:
        data = f.read()

    bmsig = b'BM'
    offsets = []
    idx = 0
    while True:
        idx = data.find(bmsig, idx)
        if idx == -1:
            break
        offsets.append(idx)
        idx += 2

    results = []
    unique = uuid.uuid4().hex
    for i, offset in enumerate(offsets):
        if offset + 6 > len(data):
            continue
        size = struct.unpack_from('<I', data, offset + 2)[0]
        if offset + size > len(data):
            logger.warning(f"[EXTRACT] Skipping offset {offset}: claimed size {size} is out of bounds.")
            continue
        segment = data[offset:offset + size]
        name_part = "".join(c if c.isalnum() else "_" for c in original_filename.split('.')[0])
        type_name = "thermal" if i == 0 else "real"

        try:
            if type_name == "thermal":
                filename = f"{unique}_{type_name}_{name_part}.bmp"
                output_path = os.path.join(EXTRACT_DIR, filename)
                with open(output_path, 'wb') as out:
                    out.write(segment)
                results.append({
                    "type": type_name,
                    "filename": filename,
                    "url": f"/static_images/{filename}",
                    "size": len(segment)
                })
                logger.info(f"[EXTRACT] Saved thermal image: {filename}")
            else:
                image = Image.open(BytesIO(segment))
                filename = f"{unique}_{type_name}_{name_part}.png"
                output_path = os.path.join(EXTRACT_DIR, filename)
                image.save(output_path, format='PNG')
                results.append({
                    "type": type_name,
                    "filename": filename,
                    "url": f"/static_images/{filename}",
                    "size": os.path.getsize(output_path)
                })
                logger.info(f"[EXTRACT] Saved real image as PNG: {filename}")
        except Exception as e:
            logger.error(f"[EXTRACT] Failed at offset {offset}: {e}")
            continue

    return results


# Upload endpoint
@app.post("/api/extract-bmps-py")
async def upload_file(request: Request, file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No file provided.")

    filename = file.filename
    temp_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}_{filename}")
    logger.info(f"[UPLOAD] Received file: {filename}")

    try:
        # Save uploaded file to temp
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Extract images
        extracted = extract_bmps(temp_path, filename)
        if not extracted:
            raise HTTPException(status_code=400, detail="No BMP found.")

        base_url = str(request.base_url).rstrip('/')
        for img in extracted:
            img["url"] = base_url + img["url"]

        return {
            "success": True,
            "message": "Images extracted.",
            "images": extracted
        }

    finally:
        # Cleanup
        try:
            os.remove(temp_path)
            await file.close()
            logger.info(f"[UPLOAD] Temp file removed: {temp_path}")
        except Exception as e:
            logger.warning(f"Failed to cleanup temp file: {e}")
