import os
import base64
import io
from datetime import datetime
from app.core.config import FONTS_DIR, PROJECTS_DIR
from app.core.file_utils import save_bytes
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import matplotlib.pyplot as plt
# from docx import Document


from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

VAZIR_TTF = os.path.join(FONTS_DIR, "Vazir-Regular.ttf")

class ReportService:
    def __init__(self):
        self.font_path = VAZIR_TTF

    # ---------------- Heatmap Overlay ----------------
    def _overlay_markers(self, image_base64: str, markers: list):
        header = "data:image/png;base64,"
        if not image_base64:
            return None
        b = base64.b64decode(image_base64[len(header):]) if image_base64.startswith(header) else base64.b64decode(image_base64)
        img = Image.open(io.BytesIO(b)).convert("RGBA")
        draw = ImageDraw.Draw(img)
        try:
            fnt = ImageFont.truetype(self.font_path, 14)
        except Exception:
            fnt = ImageFont.load_default()

        for m in markers or []:
            x = int(m.get("x", 0))
            y = int(m.get("y", 0))
            r = int(m.get("radius", 6))
            draw.ellipse((x-r, y-r, x+r, y+r), outline=(255,0,0,255), width=3)
            txt = f"{m.get('label','')} {(' - ' + str(m.get('temp'))) if m.get('temp') is not None else ''}"
            draw.text((x+r+4, y-7), txt, font=fnt, fill=(0,0,0,255))

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return "data:image/png;base64," + base64.b64encode(buf.read()).decode("utf-8")

    # ---------------- Histogram ----------------
    def _make_histogram(self, project_id: str, temperatures):
        arr = np.array(temperatures)
        fig = plt.figure(figsize=(6,2.5))
        plt.hist(arr.flatten(), bins=50)
        plt.title("توزیع دما")
        plt.xlabel("°C")
        plt.tight_layout()
        buf = io.BytesIO()
        fig.savefig(buf, format="png", bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        b = buf.read()
        fname = f"hist_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.png"
        path = save_bytes(project_id, b, fname, subdir="extracted")
        return path

    # ---------------- PDF Generation ----------------
    def generate_pdf(self, project_id: str, metadata: dict, data: dict, filename_base: str):
        # overlay markers on heatmap
        heat_b64 = data.get("image_base64")
        markers = data.get("markers", [])
        if heat_b64 and markers:
            try:
                heat_b64 = self._overlay_markers(heat_b64, markers)
            except Exception:
                pass

        # histogram
        hist_path = None
        if data.get("temperatures"):
            try:
                hist_path = self._make_histogram(project_id, data["temperatures"])
            except Exception:
                hist_path = None

        out_dir = os.path.join(PROJECTS_DIR, project_id, "reports")
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, f"{filename_base}.pdf")

        c = canvas.Canvas(out_path, pagesize=A4)
        width, height = A4

        # Title
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(width/2, height - 50, metadata.get("title", "گزارش بازرسی حرارتی"))

        # Meta table
        c.setFont("Helvetica", 12)
        y = height - 80
        meta_items = {
            "پروژه": metadata.get("project_name",""),
            "مشتری": metadata.get("customer",""),
            "دستگاه": metadata.get("device",""),
            "تاریخ": metadata.get("date", datetime.utcnow().strftime('%Y-%m-%d')),
            "ساعت": metadata.get("time", datetime.utcnow().strftime('%H:%M')),
        }
        for k,v in meta_items.items():
            c.drawString(50, y, f"{k}: {v}")
            y -= 20

        # Visual image
        if metadata.get("visual_path") and os.path.exists(metadata["visual_path"]):
            img = ImageReader(metadata["visual_path"])
            c.drawImage(img, 50, y-200, width=500, height=200)
            y -= 220

        # Heatmap
        if heat_b64:
            b = base64.b64decode(heat_b64.split("base64,")[-1])
            img = ImageReader(io.BytesIO(b))
            c.drawImage(img, 50, y-300, width=500, height=300)
            y -= 320

        # Histogram
        if hist_path and os.path.exists(hist_path):
            img = ImageReader(hist_path)
            c.drawImage(img, 50, y-200, width=500, height=200)
            y -= 220

        # Markers table (simple layout)
        if markers:
            c.setFont("Helvetica-Bold", 12)
            c.drawString(50, y, "نقاط اندازه‌گیری:")
            y -= 20
            c.setFont("Helvetica", 10)
            for m in markers:
                coord = f"{m.get('x')},{m.get('y')}"
                line = f"{m.get('marker_id')} - {m.get('label')} - {coord} - {m.get('temp')} - {m.get('note','')}"
                c.drawString(50, y, line)
                y -= 15
                if y < 100:
                    c.showPage()
                    y = height - 50

        # Notes
        if data.get("notes"):
            c.setFont("Helvetica-Bold", 12)
            c.drawString(50, y, "یادداشت‌ها:")
            y -= 20
            c.setFont("Helvetica", 10)
            c.drawString(50, y, data["notes"])
            y -= 15

        c.showPage()
        c.save()
        return out_path

    # ---------------- DOCX Generation ----------------
    def generate_docx(self, project_id: str, metadata: dict, data: dict, filename_base: str):
        doc = Document()
        doc.add_heading(metadata.get('title','گزارش بازرسی حرارتی'), level=1)
        if metadata.get("logo_path") and os.path.exists(metadata["logo_path"]):
            try:
                doc.add_picture(metadata["logo_path"], width=Inches(1.5))
            except Exception:
                pass

        # Meta table
        table = doc.add_table(rows=1, cols=2)
        table.rows[0].cells[0].text = "فیلد"
        table.rows[0].cells[1].text = "مقدار"
        meta_items = {
            "پروژه": metadata.get("project_name",""),
            "مشتری": metadata.get("customer",""),
            "دستگاه": metadata.get("device",""),
            "تاریخ": metadata.get("date",""),
            "ساعت": metadata.get("time",""),
        }
        for k,v in meta_items.items():
            row = table.add_row().cells
            row[0].text = k
            row[1].text = str(v)

        # Visual image
        if metadata.get("visual_path") and os.path.exists(metadata["visual_path"]):
            doc.add_paragraph("عکس واقعی:")
            doc.add_picture(metadata["visual_path"], width=Inches(5.5))

        # Heatmap image
        if data.get("image_base64"):
            header = "data:image/png;base64,"
            b = base64.b64decode(data["image_base64"][len(header):]) if data["image_base64"].startswith(header) else base64.b64decode(data["image_base64"])
            img_path = save_bytes(project_id, b, filename_base + "_heat.png", subdir="reports")
            doc.add_paragraph("نقشه حرارتی:")
            doc.add_picture(img_path, width=Inches(5.5))

        # Markers table
        mtable = doc.add_table(rows=1, cols=5)
        hdr = mtable.rows[0].cells
        hdr[0].text = "ID"; hdr[1].text = "توضیح"; hdr[2].text = "مختصات"; hdr[3].text = "دما"; hdr[4].text = "یادداشت"
        for m in data.get("markers", []):
            row = mtable.add_row().cells
            row[0].text = str(m.get("marker_id"))
            row[1].text = str(m.get("label"))
            row[2].text = f"{m.get('x')},{m.get('y')}"
            row[3].text = str(m.get("temp"))
            row[4].text = str(m.get("note",""))

        # Save DOCX
        out_dir = os.path.join(PROJECTS_DIR, project_id, "reports")
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, f"{filename_base}.docx")
        doc.save(out_path)
        return out_path
