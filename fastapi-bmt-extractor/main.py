from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware # Keep for later
import shutil
import os
import struct
# from PIL import Image # Not strictly needed for extraction, but good for validation
import logging
import uuid # For unique filenames

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# TODO: Add CORS middleware if needed (depending on frontend connection strategy)
# Ensure this is uncommented and configured if you're calling from a different port
# and not using Next.js proxy for the Python server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Assuming Next.js dev server runs on port 3000
    allow_credentials=True, # May not be strictly necessary for GETting images, but often included
    allow_methods=["GET", "POST", "OPTIONS"], # POST for the API endpoint, GET for images, OPTIONS for preflight
    allow_headers=["*"], # Or specify headers if needed, '*' is common for development
)

# Define directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "temp_uploads")
EXTRACT_DIR = os.path.join(BASE_DIR, "extracted_images_py")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(EXTRACT_DIR, exist_ok=True)

# Mount static directory to serve extracted images
# The path "/static_images" will be the URL prefix
app.mount("/static_images", StaticFiles(directory=EXTRACT_DIR), name="static_images")

def perform_extraction(input_path: str, original_filename: str):
    """
    Extracts up to two BMP images from the given input_path.
    Saves them to EXTRACT_DIR with names derived from original_filename and a unique prefix.
    Returns information about extracted files.
    """
    try:
        with open(input_path, 'rb') as f:
            data = f.read()
    except Exception as e:
        logger.error(f"Error reading uploaded file {input_path}: {e}")
        raise HTTPException(status_code=500, detail=f"Could not read uploaded file: {str(e)}")

    bmsig = b'BM'
    offsets = []
    idx = 0
    length = len(data)
    # Find all potential BMP headers
    while True:
        idx = data.find(bmsig, idx)
        if idx == -1:
            break
        offsets.append(idx)
        idx += 2 # Move past the 'BM' to start search for next one

    found_count = 0
    extracted_files_info = []

    unique_prefix = uuid.uuid4().hex

    for off in offsets:
        if found_count >= 2: # We only want the first two valid BMPs
            break

        if off + 6 > length: # Must have at least 6 bytes for BM signature and size field
            logger.warning(f"BM signature at offset {off} is too close to EOF to read size. Skipping.")
            continue

        try:
            size = struct.unpack_from('<I', data, off + 2)[0]
        except struct.error as e:
            logger.warning(f"Could not unpack size at offset {off+2} for file {original_filename}. Error: {e}. Skipping.")
            continue

        if size < 54:
            logger.warning(f"Reported BMP size {size} at offset {off} is too small for {original_filename}. Skipping.")
            continue
        if off + size > length:
            logger.warning(f"Reported BMP size {size} from offset {off} exceeds data length ({length}) for {original_filename}. Skipping.")
            continue

        segment = data[off : off + size]

        image_type = 'thermal' if found_count == 0 else 'real'

        safe_original_filename_part = "".join(c if c.isalnum() else "_" for c in original_filename.split('.')[0])
        extracted_filename = f"{unique_prefix}_{image_type}_{safe_original_filename_part}.bmp"
        output_path = os.path.join(EXTRACT_DIR, extracted_filename)

        try:
            with open(output_path, 'wb') as out_f:
                out_f.write(segment)
            logger.info(f"Saved {image_type} image for {original_filename} -> {output_path}")

            file_url = f"/static_images/{extracted_filename}"

            extracted_files_info.append({
                "type": image_type,
                "filename": extracted_filename,
                "url": file_url,
                "size": len(segment)
            })
            found_count += 1
        except Exception as e:
            logger.error(f"Error writing extracted BMP {output_path}: {e}")

    return found_count, extracted_files_info

@app.get("/")
async def read_root():
    return {"message": "FastAPI BMT Extractor is running."}

@app.post("/api/extract-bmps-py")
async def extract_bmps_endpoint(request: Request, file: UploadFile = File(...)):
    logger.info(f"Received file: {file.filename} of type {file.content_type} for extraction.")

    original_filename = file.filename
    temp_filename = f"{uuid.uuid4().hex}_{original_filename}"
    temp_file_path = os.path.join(UPLOAD_DIR, temp_filename)

    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"Temporarily saved uploaded file '{original_filename}' as {temp_file_path}")

        found_count, extracted_images = perform_extraction(temp_file_path, original_filename)

        if found_count == 0:
            logger.warning(f"No BMP images could be extracted from file: {original_filename}")
            raise HTTPException(status_code=400, detail="No BMP images could be extracted from the provided file.")

        base_url = str(request.base_url).strip('/')
        for img_info in extracted_images:
            img_info['url'] = f"{base_url}{img_info['url']}"

        logger.info(f"Successfully extracted {found_count} images for file {original_filename}.")
        return {
            "success": True,
            "message": f"Successfully extracted {found_count} image(s).",
            "images": extracted_images
        }

    except HTTPException as e_http:
        raise e_http
    except Exception as e_general:
        logger.error(f"An unexpected error occurred during extraction for {original_filename}: {e_general}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected server error occurred: {str(e_general)}")
    finally:
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                logger.info(f"Cleaned up temporary file: {temp_file_path}")
            except Exception as e_cleanup:
                logger.error(f"Error cleaning up temporary file {temp_file_path}: {e_cleanup}")
        if hasattr(file, 'file') and file.file and not file.file.closed:
             await file.close()


if __name__ == "__main__":
    import uvicorn
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(EXTRACT_DIR, exist_ok=True)

    logger.info(f"FastAPI server starting. Listening on port 8000.")
    logger.info(f"Temporary uploads will be stored in: {UPLOAD_DIR}")
    logger.info(f"Extracted images will be stored in: {EXTRACT_DIR}")
    logger.info(f"Extracted images will be served from URL path: /static_images")

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
