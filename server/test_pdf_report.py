#!/usr/bin/env python3
"""Test script for generating a sample PDF report with Persian text"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.report_generator import ReportGenerator
from datetime import datetime

def test_persian_pdf_generation():
    print("=" * 60)
    print("Testing Persian PDF Report Generation")
    print("=" * 60)
    
    rg = ReportGenerator()
    
    # Sample metadata in Persian
    metadata = {
        "title": "گزارش تحلیل حرارتی",
        "project_name": "پروژه تست",
        "operator": "محمد رضا",
        "company": "شرکت دانش بنیان",
        "customer": "مشتری نمونه",
        "device": "testo 882",
        "serial_no": "1970326",
        "lens": "32° x 23°",
        "measuring_site": "ساختمان اداری",
        "task": "این بررسی بر اساس استاندارد EN 13187 با استفاده از دوربین حرارتی انجام شده است.",
        "date": datetime.now().strftime('%Y-%m-%d'),
        "time": datetime.now().strftime('%H:%M:%S')
    }
    
    # Sample images data
    images = [
        {
            "name": "تصویر اول",
            "thermal_base64": None,  # No actual image for this test
            "real_base64": None
        }
    ]
    
    # Sample markers
    markers = [
        {
            "id": "m1",
            "label": "نقطه گرم",
            "temperature": 42.5,
            "x": 100,
            "y": 150
        }
    ]
    
    # Sample regions
    regions = [
        {
            "id": "r1",
            "label": "منطقه A",
            "min_temp": 20.0,
            "max_temp": 35.0,
            "avg_temp": 27.5
        }
    ]
    
    notes = "این یک گزارش تستی است برای بررسی عملکرد سیستم با متن فارسی."
    
    try:
        print("\n🔄 Generating PDF report in Persian...")
        pdf_path = rg.generate_pdf_report(
            project_id="test_project_fa",
            metadata=metadata,
            images=images,
            markers=markers,
            regions=regions,
            notes=notes,
            language="fa"
        )
        
        print(f"\n✅ SUCCESS!")
        print(f"📄 PDF generated at: {pdf_path}")
        print(f"📦 File size: {Path(pdf_path).stat().st_size / 1024:.2f} KB")
        
        # Test English version too
        print("\n" + "=" * 60)
        print("Testing English PDF Report Generation")
        print("=" * 60)
        
        metadata_en = {
            "title": "Thermal Analysis Report",
            "project_name": "Test Project",
            "operator": "Mohammad Reza",
            "company": "Tech Company",
            "customer": "Sample Customer",
            "device": "testo 882",
            "serial_no": "1970326",
            "lens": "32° x 23°",
            "measuring_site": "Office Building",
            "task": "This examination was carried out according to EN 13187 using a thermal imager.",
            "date": datetime.now().strftime('%Y-%m-%d'),
            "time": datetime.now().strftime('%H:%M:%S')
        }
        
        print("\n🔄 Generating PDF report in English...")
        pdf_path_en = rg.generate_pdf_report(
            project_id="test_project_en",
            metadata=metadata_en,
            images=[{"name": "Image 1"}],
            markers=[{"id": "m1", "label": "Hot Spot", "temperature": 42.5, "x": 100, "y": 150}],
            regions=[{"id": "r1", "label": "Region A", "min_temp": 20.0, "max_temp": 35.0, "avg_temp": 27.5}],
            notes="This is a test report.",
            language="en"
        )
        
        print(f"\n✅ SUCCESS!")
        print(f"📄 PDF generated at: {pdf_path_en}")
        print(f"📦 File size: {Path(pdf_path_en).stat().st_size / 1024:.2f} KB")
        
        print("\n" + "=" * 60)
        print("✨ Both PDF reports generated successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = test_persian_pdf_generation()
    sys.exit(0 if success else 1)
