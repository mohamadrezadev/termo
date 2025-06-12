import io
import numpy as np
import streamlit as st
from PIL import Image
import plotly.express as px
from scripts.bmt_convert import extract_images_from_bmt

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
