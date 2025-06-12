import struct
from io import BytesIO
import numpy as np
import streamlit as st
from PIL import Image
import plotly.express as px


def generate_thermal_from_bmp(img: Image.Image) -> Image.Image:
    """Convert a grayscale BMP image to a pseudocolor thermal image."""
    gray = img.convert("L")
    width, height = gray.size
    out = Image.new("RGB", (width, height))
    gray_pixels = gray.load()
    out_pixels = out.load()

    for y in range(height):
        for x in range(width):
            v = gray_pixels[x, y] / 255.0
            if v < 0.2:
                r, g, b = 0, 0, int(v * 5 * 255)
            elif v < 0.4:
                r, g, b = int((v - 0.2) * 5 * 255), 0, 255
            elif v < 0.6:
                r, g, b = 255, 0, int(255 - (v - 0.4) * 5 * 255)
            elif v < 0.8:
                r, g, b = 255, int((v - 0.6) * 5 * 255), 0
            else:
                r, g, b = 255, 255, int((v - 0.8) * 5 * 255)
            out_pixels[x, y] = (r, g, b)

    return out


def extract_images_from_bmt(path_or_file) -> tuple[Image.Image, Image.Image, int, int]:
    """Extract thermal and RGB images from a BMT file."""
    if isinstance(path_or_file, (str, bytes, bytearray)):
        with open(path_or_file, "rb") as f:
            data = f.read()
    else:
        data = path_or_file.read()

    offsets = []
    for i in range(len(data) - 1):
        if data[i] == 0x42 and data[i + 1] == 0x4D:  # 'BM'
            offsets.append(i)

    if len(offsets) < 2:
        raise ValueError("Expected two BMP images in BMT file")

    images = []
    for off in offsets:
        if off + 6 > len(data):
            continue
        file_size = struct.unpack_from("<I", data, off + 2)[0]
        if file_size <= 0 or off + file_size > len(data):
            continue
        slice_data = data[off : off + file_size]
        try:
            img = Image.open(BytesIO(slice_data))
            images.append(img)
        except Exception:
            continue

    thermal_img = generate_thermal_from_bmp(images[0])
    real_img = images[1]
    width, height = images[0].size
    return thermal_img, real_img, width, height

st.set_page_config(page_title="Thermal Analyzer Pro", layout="wide")

st.title("Thermal Analyzer Pro - Python Edition")

uploaded_file = st.file_uploader("Upload thermal image or BMT file", type=["png", "jpg", "jpeg", "bmt", "bmp"])

if uploaded_file is not None:
    if uploaded_file.name.lower().endswith(".bmt"):
        thermal_img, real_img, w, h = extract_images_from_bmt(uploaded_file)
    else:
        image = Image.open(uploaded_file)
        thermal_img = image.convert("RGB")
        real_img = None
        w, h = thermal_img.size

    st.subheader(f"Image Dimensions: {w}x{h}")

    col1, col2 = st.columns(2)
    with col1:
        st.image(thermal_img, caption="Thermal Image", use_column_width=True)
    if real_img is not None:
        with col2:
            st.image(real_img, caption="RGB Image", use_column_width=True)

    # Histogram
    arr = np.array(thermal_img.convert("L")).flatten()
    fig = px.histogram(arr, nbins=50, title="Thermal Histogram")
    st.plotly_chart(fig, use_container_width=True)
