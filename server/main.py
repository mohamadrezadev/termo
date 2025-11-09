import sys
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
import numpy as np

import uvicorn
import matplotlib.cm as cm

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =============================
# مسیرهای اصلی
# =============================
if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UPLOAD_DIR = os.path.join(BASE_DIR, "temp_uploads")
EXTRACT_DIR = os.path.join(BASE_DIR, "extracted_images")

# =============================
# Lifecycle
# =============================
@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(EXTRACT_DIR, exist_ok=True)
    logger.info("Server startup complete - directories initialized")
    yield
    logger.info("Server shutdown complete")


app = FastAPI(lifespan=lifespan)

# =============================
# CORS
# =============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # برای تست می‌تونی محدودتر کنی
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================
# Exception handler
# =============================
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# =============================
# Static serving
# =============================
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

# =============================
# 🧠 تابع استخراج دما از تصویر حرارتی
# =============================
def extract_temperature_data(bmp_path: str):
    """
    Reads a 16-bit thermal BMP and returns:
    - min/max temperature
    - 2D list of temperatures for all pixels
    """
    image = Image.open(bmp_path)
    logger.info(f"[TEMP] Image mode: {image.mode}, size: {image.size}")

    # اگر تصویر 16 بیتی نیست، سعی می‌کنیم داده‌های خام رو بخونیم
    if image.mode not in ["I;16", "I"]:
        logger.warning(f"Image mode is {image.mode}, not 16-bit. Attempting to read raw data.")
        # This is a fallback for BMPs that Pillow doesn't recognize as 16-bit
        try:
            # We assume the data is raw 16-bit grayscale after the header
            image.fp.seek(54) # Skip standard BMP header
            raw_data = image.fp.read()
            img_array = np.frombuffer(raw_data, dtype=np.uint16).reshape((image.height, image.width))
        except Exception as e:
            logger.error(f"Could not read raw 16-bit data: {e}")
            raise ValueError("Could not extract temperature data.")
    else:
        img_array = np.array(image, dtype=np.uint16)

    # ⚙️ ضریب تبدیل به دما (قابل تنظیم برای هر دوربین)
    # معمولاً هر مقدار × 0.04 = دما به سانتی‌گراد
    temp_map = img_array.astype(np.float32) * 0.04

    return {
        "min_temp": float(temp_map.min()),
        "max_temp": float(temp_map.max()),
        "width": int(temp_map.shape[1]),
        "height": int(temp_map.shape[0]),
        "data": temp_map.tolist()
    }

# =============================
# تابع استخراج BMPها از فایل ورودی
# =============================
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

                # ✅ استخراج داده دما
                try:
                    temp_data = extract_temperature_data(output_path)
                except Exception as e:
                    logger.warning(f"[TEMP] Extraction failed: {e}")
                    temp_data = None

                results.append({
                    "type": type_name,
                    "filename": filename,
                    "url": f"/static_images/{filename}",
                    "size": len(segment),
                    "temperature": temp_data
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

# =============================
# Upload Endpoint
# =============================
@app.post("/api/extract-bmt")
async def extract_bmt(request: Request, file: UploadFile = File(...), palette: str = "iron"):
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

        response_images = []
        thermal_image_data = None
        for img in extracted:
            if img["type"] == "thermal":
                thermal_image_data = img
                continue  # Process thermal image last

            full_url = base_url + img["url"]
            if img["type"] == "real":
                real_data = {
                    "type": "real",
                    "url": full_url
                }
                response_images.append(real_data)

        if thermal_image_data:
            temp_data = thermal_image_data.get("temperature")

            # Apply initial palette
            thermal_url = apply_palette(temp_data, palette)
            full_thermal_url = base_url + thermal_url

            stats = {}
            if temp_data and temp_data.get("data"):
                temps = np.array(temp_data["data"])
                stats = {
                    "min": float(temps.min()),
                    "max": float(temps.max()),
                    "avg": float(temps.mean())
                }

            thermal_response = {
                "type": "thermal",
                "url": full_thermal_url,
                "csv_url": None,  # Will be implemented later
                "metadata": {
                        "device": "Unknown",
                        "serial": "Unknown",
                        "captured_at": "Unknown",
                        "emissivity": 0.95,
                        "reflected_temp": 20.0,
                        "stats": stats
                    }
                }
            response_images.append(thermal_response)

            # This part of the original code was logically incorrect,
            # This part of the original code was logically incorrect,
            # as it was inside the thermal_image_data check but processed the "real" image.
            # The logic is now corrected to handle "real" images in the main loop.


        return {
            "success": True,
            "message": "BMT file processed successfully",
            "images": response_images
        }

    finally:
        try:
            os.remove(temp_path)
            await file.close()
            logger.info(f"[UPLOAD] Temp file removed: {temp_path}")
        except Exception as e:
            logger.warning(f"Failed to cleanup temp file: {e}")

# =============================
# 🎨 تابع اعمال پالت رنگی
# =============================
def apply_palette(temp_data: dict, palette: str):
    """
    Applies a color palette to thermal data and saves it as a PNG.
    """
    if not temp_data or "data" not in temp_data:
        raise ValueError("Invalid temperature data provided.")

    temps = np.array(temp_data["data"])

    # Normalize temperatures to 0-1 range for colormapping
    norm_temps = (temps - temps.min()) / (temps.max() - temps.min())

    # Get colormap from matplotlib
    try:
        colormap = cm.get_cmap(palette)
    except ValueError:
        logger.warning(f"Palette '{palette}' not found. Falling back to 'hot'.")
        colormap = cm.get_cmap("hot")

    colored_data = colormap(norm_temps)

    # Convert to 8-bit RGB
    img_array = (colored_data[:, :, :3] * 255).astype(np.uint8)

    image = Image.fromarray(img_array)

    # Save the new image
    unique = uuid.uuid4().hex
    filename = f"{unique}_thermal_{palette}.png"
    output_path = os.path.join(EXTRACT_DIR, filename)
    image.save(output_path)

    return f"/static_images/{filename}"


@app.post("/api/rerender-palette")
async def rerender_palette(request: Request, file: UploadFile = File(...), palette: str = "iron"):
    if not file:
        raise HTTPException(status_code=400, detail="No BMT file uploaded")

    filename = f"{uuid.uuid4().hex}_{file.filename}"
    temp_path = os.path.join(UPLOAD_DIR, filename)

    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        extracted = extract_bmps(temp_path, file.filename)
        thermal_image = next((img for img in extracted if img["type"] == "thermal"), None)

        if not thermal_image or "temperature" not in thermal_image:
            raise HTTPException(status_code=404, detail="No thermal data found in file.")

        new_image_url = apply_palette(thermal_image["temperature"], palette)
        base_url = str(request.base_url).rstrip('/')

        return {
            "success": True,
            "thermal_url": base_url + new_image_url,
            "palette": palette
        }
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

# =============================
# Run
# =============================
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8080)
