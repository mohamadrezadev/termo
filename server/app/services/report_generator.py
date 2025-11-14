import os
import base64
import io
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image

from app.core.config import settings
from app.services.file_manager import FileManager

class ReportGenerator:
    """Service for generating PDF and DOCX reports"""
    
    def __init__(self):
        self.file_manager = FileManager()
        self.fonts_dir = Path(settings.FONTS_DIR)
        
        # Register Persian font if available
        vazir_font = self.fonts_dir / "Vazir-Regular.ttf"
        if vazir_font.exists():
            pdfmetrics.registerFont(TTFont('Vazir', str(vazir_font)))
    
    def _base64_to_image(self, base64_string: str) -> Image.Image:
        """Convert base64 string to PIL Image"""
        if not base64_string:
            return None

        try:
            # Remove data URI prefix if present
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]

            image_data = base64.b64decode(base64_string)
            image = Image.open(io.BytesIO(image_data))
            return image
        except Exception as e:
            print(f"Error decoding base64 image: {e}")
            return None

    def generate_pdf_report(
        self,
        project_id: str,
        metadata: Dict[str, Any],
        images: List[Dict[str, Any]],
        markers: List[Dict[str, Any]],
        regions: List[Dict[str, Any]],
        notes: Optional[str] = None,
        language: str = "en"
    ) -> str:
        """
        Generate PDF report
        Returns: Path to generated PDF file
        """
        # Create report directory
        dirs = self.file_manager.create_project_directories(project_id)
        report_dir = dirs["reports"]

        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        pdf_filename = f"report_{timestamp}.pdf"
        pdf_path = report_dir / pdf_filename

        # Create PDF
        c = canvas.Canvas(str(pdf_path), pagesize=A4)
        width, height = A4

        # Set font
        font_name = 'Vazir' if language == 'fa' else 'Helvetica'

        # Title
        c.setFont(f"{font_name}-Bold" if language == 'en' else font_name, 18)
        title = metadata.get("title", "Thermal Analysis Report")
        c.drawCentredString(width/2, height - 50, title)

        # Project Information
        y = height - 100
        c.setFont(font_name, 12)

        info_items = [
            ("Project", metadata.get("project_name", "")),
            ("Operator", metadata.get("operator", "")),
            ("Company", metadata.get("company", "")),
            ("Date", metadata.get("date", datetime.utcnow().strftime('%Y-%m-%d'))),
        ]

        for label, value in info_items:
            c.drawString(50, y, f"{label}: {value}")
            y -= 20

        y -= 20

        # Images
        for img_data in images:
            if y < 200:
                c.showPage()
                y = height - 50

            # Image title
            c.setFont(f"{font_name}-Bold" if language == 'en' else font_name, 14)
            c.drawString(50, y, f"Image: {img_data.get('name', '')}")
            y -= 20

            # Thermal image - support both path and base64
            thermal_image = None
            if img_data.get("thermal_base64"):
                thermal_image = self._base64_to_image(img_data["thermal_base64"])
            elif img_data.get("thermal_path") and os.path.exists(img_data["thermal_path"]):
                thermal_image = Image.open(img_data["thermal_path"])

            if thermal_image:
                try:
                    img_reader = ImageReader(thermal_image)
                    c.drawImage(img_reader, 50, y - 250, width=500, height=250)
                    y -= 270
                except Exception as e:
                    print(f"Error adding thermal image: {e}")

            # Real image - support both path and base64
            real_image = None
            if img_data.get("real_base64"):
                real_image = self._base64_to_image(img_data["real_base64"])
            elif img_data.get("real_path") and os.path.exists(img_data["real_path"]):
                real_image = Image.open(img_data["real_path"])

            if real_image:
                if y < 300:
                    c.showPage()
                    y = height - 50

                try:
                    img_reader = ImageReader(real_image)
                    c.drawImage(img_reader, 50, y - 250, width=500, height=250)
                    y -= 270
                except Exception as e:
                    print(f"Error adding real image: {e}")
        
        # Markers Table
        if markers:
            if y < 200:
                c.showPage()
                y = height - 50
            
            c.setFont(f"{font_name}-Bold" if language == 'en' else font_name, 14)
            c.drawString(50, y, "Temperature Markers")
            y -= 20
            
            c.setFont(font_name, 10)
            for marker in markers:
                marker_text = f"{marker.get('label', '')} - ({marker.get('x', 0):.1f}, {marker.get('y', 0):.1f}) - {marker.get('temperature', 0):.2f}°C"
                c.drawString(50, y, marker_text)
                y -= 15
                
                if y < 100:
                    c.showPage()
                    y = height - 50
        
        # Regions Table
        if regions:
            if y < 200:
                c.showPage()
                y = height - 50
            
            c.setFont(f"{font_name}-Bold" if language == 'en' else font_name, 14)
            c.drawString(50, y, "Analysis Regions")
            y -= 20
            
            c.setFont(font_name, 10)
            for region in regions:
                region_text = f"{region.get('label', '')} ({region.get('type', '')}) - Min: {region.get('min_temp', 0):.2f}°C, Max: {region.get('max_temp', 0):.2f}°C, Avg: {region.get('avg_temp', 0):.2f}°C"
                c.drawString(50, y, region_text)
                y -= 15
                
                if y < 100:
                    c.showPage()
                    y = height - 50
        
        # Notes
        if notes:
            if y < 150:
                c.showPage()
                y = height - 50
            
            c.setFont(f"{font_name}-Bold" if language == 'en' else font_name, 14)
            c.drawString(50, y, "Notes")
            y -= 20
            
            c.setFont(font_name, 10)
            # Simple text wrapping
            max_width = 500
            words = notes.split()
            line = ""
            for word in words:
                test_line = line + word + " "
                if c.stringWidth(test_line, font_name, 10) < max_width:
                    line = test_line
                else:
                    c.drawString(50, y, line)
                    y -= 15
                    line = word + " "
                    
                    if y < 100:
                        c.showPage()
                        y = height - 50
            
            if line:
                c.drawString(50, y, line)
        
        # Footer
        c.setFont(font_name, 8)
        footer_text = f"Generated by Thermal Analyzer Pro - {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"
        c.drawCentredString(width/2, 30, footer_text)
        
        # Save PDF
        c.showPage()
        c.save()

        return str(pdf_path)

    def generate_docx_report(
        self,
        project_id: str,
        metadata: Dict[str, Any],
        images: List[Dict[str, Any]],
        markers: List[Dict[str, Any]],
        regions: List[Dict[str, Any]],
        notes: Optional[str] = None,
        language: str = "en"
    ) -> str:
        """
        Generate DOCX report
        Returns: Path to generated DOCX file
        """
        from docx import Document
        from docx.shared import Inches, Pt, RGBColor
        from docx.enum.text import WD_ALIGN_PARAGRAPH

        # Create report directory
        dirs = self.file_manager.create_project_directories(project_id)
        report_dir = dirs["reports"]

        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        docx_filename = f"report_{timestamp}.docx"
        docx_path = report_dir / docx_filename

        # Create document
        document = Document()

        # Title
        title = document.add_heading(metadata.get("title", "Thermal Analysis Report"), 0)
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER

        # Project Information
        document.add_heading("Project Information", level=1)
        info_table = document.add_table(rows=4, cols=2)
        info_table.style = 'Light Grid Accent 1'

        info_data = [
            ("Project", metadata.get("project_name", "")),
            ("Operator", metadata.get("operator", "")),
            ("Company", metadata.get("company", "")),
            ("Date", metadata.get("date", datetime.utcnow().strftime('%Y-%m-%d'))),
        ]

        for idx, (label, value) in enumerate(info_data):
            info_table.rows[idx].cells[0].text = label
            info_table.rows[idx].cells[1].text = str(value)

        # Images
        if images:
            document.add_page_break()
            document.add_heading("Thermal Images", level=1)

            for img_data in images:
                # Image name
                document.add_heading(f"Image: {img_data.get('name', 'Unnamed')}", level=2)

                # Thermal image
                thermal_image = None
                if img_data.get("thermal_base64"):
                    thermal_image = self._base64_to_image(img_data["thermal_base64"])
                elif img_data.get("thermal_path") and os.path.exists(img_data["thermal_path"]):
                    thermal_image = Image.open(img_data["thermal_path"])

                if thermal_image:
                    try:
                        # Save temp image
                        temp_thermal_path = report_dir / f"temp_thermal_{img_data['id']}.png"
                        thermal_image.save(temp_thermal_path)
                        document.add_paragraph("Thermal Image:")
                        document.add_picture(str(temp_thermal_path), width=Inches(5))
                        # Clean up temp file
                        temp_thermal_path.unlink()
                    except Exception as e:
                        print(f"Error adding thermal image to DOCX: {e}")
                        document.add_paragraph(f"[Thermal image could not be loaded: {e}]")

                # Real image
                real_image = None
                if img_data.get("real_base64"):
                    real_image = self._base64_to_image(img_data["real_base64"])
                elif img_data.get("real_path") and os.path.exists(img_data["real_path"]):
                    real_image = Image.open(img_data["real_path"])

                if real_image:
                    try:
                        # Save temp image
                        temp_real_path = report_dir / f"temp_real_{img_data['id']}.png"
                        real_image.save(temp_real_path)
                        document.add_paragraph("Real Image:")
                        document.add_picture(str(temp_real_path), width=Inches(5))
                        # Clean up temp file
                        temp_real_path.unlink()
                    except Exception as e:
                        print(f"Error adding real image to DOCX: {e}")
                        document.add_paragraph(f"[Real image could not be loaded: {e}]")

                document.add_paragraph()  # Add spacing

        # Markers
        if markers:
            document.add_page_break()
            document.add_heading("Temperature Markers", level=1)

            markers_table = document.add_table(rows=len(markers) + 1, cols=4)
            markers_table.style = 'Light Grid Accent 1'

            # Headers
            headers = ["Label", "Position (X, Y)", "Temperature (°C)", "Image"]
            for idx, header in enumerate(headers):
                markers_table.rows[0].cells[idx].text = header

            # Data
            for idx, marker in enumerate(markers, 1):
                markers_table.rows[idx].cells[0].text = marker.get('label', '')
                markers_table.rows[idx].cells[1].text = f"({marker.get('x', 0):.1f}, {marker.get('y', 0):.1f})"
                markers_table.rows[idx].cells[2].text = f"{marker.get('temperature', 0):.2f}"
                markers_table.rows[idx].cells[3].text = marker.get('image_id', '')[:8]

        # Regions
        if regions:
            document.add_page_break()
            document.add_heading("Analysis Regions", level=1)

            regions_table = document.add_table(rows=len(regions) + 1, cols=5)
            regions_table.style = 'Light Grid Accent 1'

            # Headers
            headers = ["Label", "Type", "Min Temp (°C)", "Max Temp (°C)", "Avg Temp (°C)"]
            for idx, header in enumerate(headers):
                regions_table.rows[0].cells[idx].text = header

            # Data
            for idx, region in enumerate(regions, 1):
                regions_table.rows[idx].cells[0].text = region.get('label', '')
                regions_table.rows[idx].cells[1].text = region.get('type', '')
                regions_table.rows[idx].cells[2].text = f"{region.get('min_temp', 0):.2f}"
                regions_table.rows[idx].cells[3].text = f"{region.get('max_temp', 0):.2f}"
                regions_table.rows[idx].cells[4].text = f"{region.get('avg_temp', 0):.2f}"

        # Notes
        if notes:
            document.add_page_break()
            document.add_heading("Notes", level=1)
            document.add_paragraph(notes)

        # Footer
        section = document.sections[0]
        footer = section.footer
        footer_para = footer.paragraphs[0]
        footer_para.text = f"Generated by Thermal Analyzer Pro - {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"
        footer_para.alignment = WD_ALIGN_PARAGRAPH.CENTER

        # Save document
        document.save(str(docx_path))

        return str(docx_path)