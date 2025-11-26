import os
import uuid
import subprocess
import json
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from contextlib import asynccontextmanager
import shutil
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "temp_uploads")
EXTRACT_DIR = os.path.join(BASE_DIR, "extracted_images")

CSHARP_APP = r"D:\پروژه های دانش بنیان\termo2\termo\server\ConsoleApp1\ConsoleApp1\bin\Debug\ConsoleApp1.exe"  # مسیر دقیق فایل exe پروژه C#

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(EXTRACT_DIR, exist_ok=True)
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/extract-bmt")
async def extract_bmt(request: Request, file: UploadFile = File(...), palette: str = "iron"):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    filename = f"{uuid.uuid4().hex}_{file.filename}"
    temp_path = os.path.join(UPLOAD_DIR, filename)

    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # اجرای اپ C# با پارامتر پالت و خواندن خروجی JSON
        process = subprocess.run(
            [CSHARP_APP, temp_path, palette],
            capture_output=True,
            text=True,
            encoding="utf-8"
        )

        output = process.stdout.strip()
        logger.info(f"C# Output: {output}")

        try:
            result = json.loads(output)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Invalid JSON output from C# app")

        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        # Base URL برای ساخت URL کامل
        base_url = str(request.base_url).rstrip('/')

        # مسیر عکس‌ها را برای ارسال به کلاینت آماده می‌کنیم
        for key in ["thermal", "visual"]:
            if result["images"].get(key):
                src = result["images"][key]
                if os.path.exists(src):
                    dest = os.path.join(EXTRACT_DIR, os.path.basename(src))
                    shutil.move(src, dest)
                    result["images"][key] = f"{base_url}/static_images/{os.path.basename(src)}"
                else:
                    logger.warning(f"Image file not found: {src}")

        # اضافه کردن CSV
        if result.get("csv"):
            csv_src = result["csv"]
            if os.path.exists(csv_src):
                csv_dest = os.path.join(EXTRACT_DIR, os.path.basename(csv_src))
                shutil.move(csv_src, csv_dest)
                result["csv_url"] = f"{base_url}/static_images/{os.path.basename(csv_src)}"
                logger.info(f"CSV file moved and URL created: {result['csv_url']}")
            else:
                logger.warning(f"CSV file not found: {csv_src}")

        # ساخت response با فرمت سازگار با کلاینت
        response_data = {
            "success": True,
            "message": "BMT file processed successfully",
            "images": []
        }

        # اضافه کردن thermal image
        if result["images"].get("thermal"):
            thermal_data = {
                "type": "thermal",
                "url": result["images"]["thermal"],
                "csv_url": result.get("csv_url"),
                "metadata": {
                    "device": result.get("device"),
                    "serial": result.get("serial"),
                    "captured_at": result.get("captured_at"),
                    "emissivity": result.get("emissivity", 0.95),
                    "reflected_temp": result.get("reflected_temp", 20.0),
                    "stats": result.get("stats", {})
                }
            }
            response_data["images"].append(thermal_data)

        # اضافه کردن visual/real image
        if result["images"].get("visual"):
            real_data = {
                "type": "real",
                "url": result["images"]["visual"]
            }
            response_data["images"].append(real_data)

        logger.info(f"Response data prepared: {len(response_data['images'])} images")
        return response_data

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/api/rerender-palette")
async def rerender_palette(request: Request, bmt_file: UploadFile = File(...), palette: str = "iron"):
    """
    Re-render thermal image with a different color palette
    بازسازی تصویر حرارتی با پالت رنگی متفاوت
    """
    if not bmt_file:
        raise HTTPException(status_code=400, detail="No BMT file uploaded")

    filename = f"{uuid.uuid4().hex}_{bmt_file.filename}"
    temp_path = os.path.join(UPLOAD_DIR, filename)

    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(bmt_file.file, f)

        # اجرای برنامه C# با پالت جدید
        process = subprocess.run(
            [CSHARP_APP, temp_path, palette],
            capture_output=True,
            text=True,
            encoding="utf-8"
        )

        output = process.stdout.strip()
        logger.info(f"C# Re-render Output: {output}")

        try:
            result = json.loads(output)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Invalid JSON output from C# app")

        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        # Base URL
        base_url = str(request.base_url).rstrip('/')

        # فقط thermal image رو منتقل می‌کنیم
        if result["images"].get("thermal"):
            src = result["images"]["thermal"]
            if os.path.exists(src):
                dest = os.path.join(EXTRACT_DIR, os.path.basename(src))
                shutil.move(src, dest)
                thermal_url = f"{base_url}/static_images/{os.path.basename(src)}"
            else:
                raise HTTPException(status_code=500, detail="Thermal image not generated")
        else:
            raise HTTPException(status_code=500, detail="No thermal image in result")

        return {
            "success": True,
            "thermal_url": thermal_url,
            "palette": palette
        }

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.get("/static_images/{filename}")
async def serve_image(filename: str):
    file_path = os.path.join(EXTRACT_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)

@app.get("/")
async def root():
    return {"message": "Thermal API Server is running", "status": "ok"}

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Thermal API Server on http://127.0.0.1:8080")
    uvicorn.run(app, host="127.0.0.1", port=8080)


# import sys
# from fastapi import FastAPI, UploadFile, File, HTTPException, Request
# from fastapi.middleware.cors import CORSMiddleware
# from contextlib import asynccontextmanager
# from fastapi.responses import FileResponse, JSONResponse
# import shutil
# from PIL import Image
# from io import BytesIO
# import os
# import uuid
# import struct
# import logging
# import numpy as np

# import uvicorn

# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# # =============================
# # مسیرهای اصلی
# # =============================
# if getattr(sys, 'frozen', False):
#     BASE_DIR = os.path.dirname(sys.executable)
# else:
#     BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# UPLOAD_DIR = os.path.join(BASE_DIR, "temp_uploads")
# EXTRACT_DIR = os.path.join(BASE_DIR, "extracted_images")

# # =============================
# # Lifecycle
# # =============================
# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     os.makedirs(UPLOAD_DIR, exist_ok=True)
#     os.makedirs(EXTRACT_DIR, exist_ok=True)
#     logger.info("Server startup complete - directories initialized")
#     yield
#     logger.info("Server shutdown complete")


# app = FastAPI(lifespan=lifespan)

# # =============================
# # CORS
# # =============================
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # برای تست می‌تونی محدودتر کنی
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # =============================
# # Exception handler
# # =============================
# @app.exception_handler(Exception)
# async def global_exception_handler(request: Request, exc: Exception):
#     logger.error(f"Unhandled exception: {exc}", exc_info=True)
#     return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# # =============================
# # Static serving
# # =============================
# @app.get("/static_images/{filename}")
# async def serve_static_image(filename: str):
#     file_path = os.path.join(EXTRACT_DIR, filename)
#     if not os.path.exists(file_path):
#         raise HTTPException(status_code=404, detail="Image not found")
#     return FileResponse(
#         file_path,
#         headers={
#             "Access-Control-Allow-Origin": "*",
#             "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
#             "Access-Control-Allow-Headers": "*",
#             "Cache-Control": "no-cache"
#         }
#     )

# # =============================
# # 🧠 تابع استخراج دما از تصویر حرارتی
# # =============================
# def extract_temperature_data(bmp_path: str):
#     """
#     Reads a 16-bit thermal BMP and returns:
#     - min/max temperature
#     - 2D list of temperatures for all pixels
#     """
#     image = Image.open(bmp_path)
#     logger.info(f"[TEMP] Image mode: {image.mode}, size: {image.size}")

#     # اگر تصویر 16 بیتی نیست، یعنی داده دما نداره
#     if image.mode not in ["I;16", "I"]:
#         raise ValueError("This BMP image is not 16-bit, cannot extract temperature data.")

#     img_array = np.array(image, dtype=np.uint16)

#     # ⚙️ ضریب تبدیل به دما (قابل تنظیم برای هر دوربین)
#     # معمولاً هر مقدار × 0.04 = دما به سانتی‌گراد
#     temp_map = img_array.astype(np.float32) * 0.04

#     return {
#         "min_temp": float(temp_map.min()),
#         "max_temp": float(temp_map.max()),
#         "width": int(temp_map.shape[1]),
#         "height": int(temp_map.shape[0]),
#         "data": temp_map.tolist()
#     }

# # =============================
# # تابع استخراج BMPها از فایل ورودی
# # =============================
# def extract_bmps(file_path: str, original_filename: str):
#     with open(file_path, 'rb') as f:
#         data = f.read()

#     bmsig = b'BM'
#     offsets = []
#     idx = 0
#     while True:
#         idx = data.find(bmsig, idx)
#         if idx == -1:
#             break
#         offsets.append(idx)
#         idx += 2

#     results = []
#     unique = uuid.uuid4().hex
#     for i, offset in enumerate(offsets):
#         if offset + 6 > len(data):
#             continue
#         size = struct.unpack_from('<I', data, offset + 2)[0]
#         if offset + size > len(data):
#             logger.warning(f"[EXTRACT] Skipping offset {offset}: claimed size {size} is out of bounds.")
#             continue
#         segment = data[offset:offset + size]
#         name_part = "".join(c if c.isalnum() else "_" for c in original_filename.split('.')[0])
#         type_name = "thermal" if i == 0 else "real"

#         try:
#             if type_name == "thermal":
#                 filename = f"{unique}_{type_name}_{name_part}.bmp"
#                 output_path = os.path.join(EXTRACT_DIR, filename)
#                 with open(output_path, 'wb') as out:
#                     out.write(segment)

#                 # ✅ استخراج داده دما
#                 try:
#                     temp_data = extract_temperature_data(output_path)
#                 except Exception as e:
#                     logger.warning(f"[TEMP] Extraction failed: {e}")
#                     temp_data = None

#                 results.append({
#                     "type": type_name,
#                     "filename": filename,
#                     "url": f"/static_images/{filename}",
#                     "size": len(segment),
#                     "temperature": temp_data
#                 })
#                 logger.info(f"[EXTRACT] Saved thermal image: {filename}")
#             else:
#                 image = Image.open(BytesIO(segment))
#                 filename = f"{unique}_{type_name}_{name_part}.png"
#                 output_path = os.path.join(EXTRACT_DIR, filename)
#                 image.save(output_path, format='PNG')
#                 results.append({
#                     "type": type_name,
#                     "filename": filename,
#                     "url": f"/static_images/{filename}",
#                     "size": os.path.getsize(output_path)
#                 })
#                 logger.info(f"[EXTRACT] Saved real image as PNG: {filename}")
#         except Exception as e:
#             logger.error(f"[EXTRACT] Failed at offset {offset}: {e}")
#             continue

#     return results

# # =============================
# # Upload Endpoint
# # =============================
# @app.post("/api/extract-bmps-py")
# async def upload_file(request: Request, file: UploadFile = File(...)):
#     if not file:
#         raise HTTPException(status_code=400, detail="No file provided.")

#     filename = file.filename
#     temp_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}_{filename}")
#     logger.info(f"[UPLOAD] Received file: {filename}")

#     try:
#         # Save uploaded file to temp
#         with open(temp_path, "wb") as buffer:
#             shutil.copyfileobj(file.file, buffer)

#         # Extract images
#         extracted = extract_bmps(temp_path, filename)
#         if not extracted:
#             raise HTTPException(status_code=400, detail="No BMP found.")

#         base_url = str(request.base_url).rstrip('/')
#         for img in extracted:
#             img["url"] = base_url + img["url"]

#         return {
#             "success": True,
#             "message": "Images extracted successfully.",
#             "images": extracted
#         }

#     finally:
#         try:
#             os.remove(temp_path)
#             await file.close()
#             logger.info(f"[UPLOAD] Temp file removed: {temp_path}")
#         except Exception as e:
#             logger.warning(f"Failed to cleanup temp file: {e}")

# # =============================
# # Run
# # =============================
# if __name__ == "__main__":
#     uvicorn.run(app, host="127.0.0.1", port=8080)

# # import sys
# # from fastapi import FastAPI, UploadFile, File, HTTPException, Request
# # from fastapi.middleware.cors import CORSMiddleware
# # from contextlib import asynccontextmanager
# # from fastapi.responses import FileResponse, JSONResponse
# # import shutil
# # from PIL import Image
# # from io import BytesIO
# # import os
# # import uuid
# # import struct
# # import logging

# # import uvicorn 

# # logging.basicConfig(level=logging.INFO)
# # logger = logging.getLogger(__name__)


# # if getattr(sys, 'frozen', False):
# #     BASE_DIR = os.path.dirname(sys.executable)
# # else:
# #     BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# # UPLOAD_DIR = os.path.join(BASE_DIR, "temp_uploads")
# # EXTRACT_DIR = os.path.join(BASE_DIR, "extracted_images")

# # # BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# # # UPLOAD_DIR = os.path.join(BASE_DIR, "temp_uploads")
# # # EXTRACT_DIR = os.path.join(BASE_DIR, "extracted_images")


# # # Lifespan for startup/shutdown (replaces @app.on_event("startup"))
# # @asynccontextmanager
# # async def lifespan(app: FastAPI):
# #     os.makedirs(UPLOAD_DIR, exist_ok=True)
# #     os.makedirs(EXTRACT_DIR, exist_ok=True)
# #     logger.info("Server startup complete - directories initialized")
# #     yield
# #     logger.info("Server shutdown complete")


# # app = FastAPI(lifespan=lifespan)

# # # CORS Middleware
# # app.add_middleware(
# #     CORSMiddleware,
# #     allow_origins=["*"],  # Allow all origins for dev; adjust for prod
# #     allow_credentials=True,
# #     allow_methods=["*"],
# #     allow_headers=["*"],
# # )


# # # Global exception handler
# # @app.exception_handler(Exception)
# # async def global_exception_handler(request: Request, exc: Exception):
# #     logger.error(f"Unhandled exception: {exc}", exc_info=True)
# #     return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# # # Serve static images
# # @app.get("/static_images/{filename}")
# # async def serve_static_image(filename: str):
# #     file_path = os.path.join(EXTRACT_DIR, filename)
# #     if not os.path.exists(file_path):
# #         raise HTTPException(status_code=404, detail="Image not found")
# #     return FileResponse(
# #         file_path,
# #         headers={
# #             "Access-Control-Allow-Origin": "*",
# #             "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
# #             "Access-Control-Allow-Headers": "*",
# #             "Cache-Control": "no-cache"
# #         }
# #     )


# # # Extract BMPs from file
# # def extract_bmps(file_path: str, original_filename: str):
# #     with open(file_path, 'rb') as f:
# #         data = f.read()

# #     bmsig = b'BM'
# #     offsets = []
# #     idx = 0
# #     while True:
# #         idx = data.find(bmsig, idx)
# #         if idx == -1:
# #             break
# #         offsets.append(idx)
# #         idx += 2

# #     results = []
# #     unique = uuid.uuid4().hex
# #     for i, offset in enumerate(offsets):
# #         if offset + 6 > len(data):
# #             continue
# #         size = struct.unpack_from('<I', data, offset + 2)[0]
# #         if offset + size > len(data):
# #             logger.warning(f"[EXTRACT] Skipping offset {offset}: claimed size {size} is out of bounds.")
# #             continue
# #         segment = data[offset:offset + size]
# #         name_part = "".join(c if c.isalnum() else "_" for c in original_filename.split('.')[0])
# #         type_name = "thermal" if i == 0 else "real"

# #         try:
# #             if type_name == "thermal":
# #                 filename = f"{unique}_{type_name}_{name_part}.bmp"
# #                 output_path = os.path.join(EXTRACT_DIR, filename)
# #                 with open(output_path, 'wb') as out:
# #                     out.write(segment)
# #                 results.append({
# #                     "type": type_name,
# #                     "filename": filename,
# #                     "url": f"/static_images/{filename}",
# #                     "size": len(segment)
# #                 })
# #                 logger.info(f"[EXTRACT] Saved thermal image: {filename}")
# #             else:
# #                 image = Image.open(BytesIO(segment))
# #                 filename = f"{unique}_{type_name}_{name_part}.png"
# #                 output_path = os.path.join(EXTRACT_DIR, filename)
# #                 image.save(output_path, format='PNG')
# #                 results.append({
# #                     "type": type_name,
# #                     "filename": filename,
# #                     "url": f"/static_images/{filename}",
# #                     "size": os.path.getsize(output_path)
# #                 })
# #                 logger.info(f"[EXTRACT] Saved real image as PNG: {filename}")
# #         except Exception as e:
# #             logger.error(f"[EXTRACT] Failed at offset {offset}: {e}")
# #             continue

# #     return results


# # # Upload endpoint
# # @app.post("/api/extract-bmps-py")
# # async def upload_file(request: Request, file: UploadFile = File(...)):
# #     if not file:
# #         raise HTTPException(status_code=400, detail="No file provided.")

# #     filename = file.filename
# #     temp_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}_{filename}")
# #     logger.info(f"[UPLOAD] Received file: {filename}")

# #     try:
# #         # Save uploaded file to temp
# #         with open(temp_path, "wb") as buffer:
# #             shutil.copyfileobj(file.file, buffer)

# #         # Extract images
# #         extracted = extract_bmps(temp_path, filename)
# #         if not extracted:
# #             raise HTTPException(status_code=400, detail="No BMP found.")

# #         base_url = str(request.base_url).rstrip('/')
# #         for img in extracted:
# #             img["url"] = base_url + img["url"]

# #         return {
# #             "success": True,
# #             "message": "Images extracted.",
# #             "images": extracted
# #         }

# #     finally:
# #         # Cleanup
# #         try:
# #             os.remove(temp_path)
# #             await file.close()
# #             logger.info(f"[UPLOAD] Temp file removed: {temp_path}")
# #         except Exception as e:
# #             logger.warning(f"Failed to cleanup temp file: {e}")

