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
            
            # Thermal image
            if img_data.get("thermal_path") and os.path.exists(img_data["thermal_path"]):
                try:
                    img = ImageReader(img_data["thermal_path"])
                    c.drawImage(img, 50, y - 250, width=500, height=250)
                    y -= 270
                except Exception as e:
                    print(f"Error adding thermal image: {e}")
            
            # Real image
            if img_data.get("real_path") and os.path.exists(img_data["real_path"]):
                if y < 300:
                    c.showPage()
                    y = height - 50
                
                try:
                    img = ImageReader(img_data["real_path"])
                    c.drawImage(img, 50, y - 250, width=500, height=250)
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