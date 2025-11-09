import pytest
from fastapi.testclient import TestClient
from main import app
import os
from PIL import Image
import io
import numpy as np

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_environment():
    """Create temp directories before each test and clean up after."""
    from main import UPLOAD_DIR, EXTRACT_DIR
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(EXTRACT_DIR, exist_ok=True)
    yield
    # Cleanup is not strictly necessary for this app as it cleans up its own temp files
    # but it's good practice.

import struct

# Create a dummy BMT file for testing
def create_dummy_bmt():
    # Create a dummy 16-bit thermal image (raw data)
    thermal_data = np.full((10, 10), 30000, dtype=np.uint16)

    # Create a more compliant BMP header for a 16-bit grayscale image
    file_header = b'BM'
    file_size = 14 + 40 + (10 * 10 * 2)
    file_header += struct.pack('<I', file_size)
    file_header += b'\x00\x00\x00\x00' # Reserved
    file_header += struct.pack('<I', 54) # Data offset

    info_header = struct.pack('<I', 40) # Header size
    info_header += struct.pack('<i', 10) # Width
    info_header += struct.pack('<i', 10) # Height
    info_header += struct.pack('<H', 1) # Planes
    info_header += struct.pack('<H', 16) # Bits per pixel
    info_header += struct.pack('<I', 0) # Compression (BI_RGB)
    info_header += struct.pack('<I', 10 * 10 * 2) # Image size
    info_header += b'\x00\x00\x00\x00' * 4 # Other fields (X/Y pixels per meter, colors used/important)

    header = file_header + info_header

    thermal_bmp_content = header + thermal_data.tobytes()

    # Create a dummy 8-bit BMP (visual)
    visual_img = Image.new('RGB', (10, 10), 'red')
    visual_bytes = io.BytesIO()
    visual_img.save(visual_bytes, format='BMP')
    visual_bytes.seek(0)
    visual_bmp_content = visual_bytes.read()

    # Combine them into a single file
    bmt_content = thermal_bmp_content + visual_bmp_content
    return io.BytesIO(bmt_content)

def test_upload_and_extract_bmt():
    dummy_bmt = create_dummy_bmt()

    response = client.post(
        "/api/extract-bmt",
        files={"file": ("test.bmt", dummy_bmt, "application/octet-stream")}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True
    assert len(data["images"]) == 2

    thermal_image = next((img for img in data["images"] if img["type"] == "thermal"), None)
    visual_image = next((img for img in data["images"] if img["type"] == "real"), None)

    assert thermal_image is not None
    assert visual_image is not None

    assert "url" in thermal_image
    assert thermal_image["url"].endswith(".png") # Check that it's a PNG
    assert "stats" in thermal_image["metadata"]
    assert "min" in thermal_image["metadata"]["stats"]

    assert "url" in visual_image
    assert visual_image["url"].endswith(".png") # Check that visual image is converted to PNG

def test_rerender_palette():
    dummy_bmt = create_dummy_bmt()

    response = client.post(
        "/api/rerender-palette?palette=rainbow",
        files={"file": ("test.bmt", dummy_bmt, "application/octet-stream")}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True
    assert data["palette"] == "rainbow"
    assert "thermal_url" in data
    assert data["thermal_url"].endswith(".png")
