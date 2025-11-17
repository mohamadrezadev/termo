#!/usr/bin/env python3
"""Test script to verify Persian font loading"""

from app.services.report_generator import ReportGenerator

def test_font_loading():
    print("=" * 50)
    print("Testing Persian Font Loading")
    print("=" * 50)
    
    rg = ReportGenerator()
    
    print(f"\nFont Status:")
    print(f"  - Has Persian Font: {rg.has_persian_font}")
    
    if rg.has_persian_font:
        print(f"  - Font Name: {rg.persian_font_name}")
        print(f"  - Bold Font: {rg.persian_font_bold}")
        print("\n✅ SUCCESS: Persian fonts loaded correctly!")
    else:
        print("\n❌ FAILED: Persian fonts not loaded")
        print("   Please check:")
        print("   1. Font files exist in server/app/assets/fonts/")
        print("   2. Font files are named correctly (Vazirmatn-*.ttf or Vazir-*.ttf)")
    
    print("=" * 50)

if __name__ == "__main__":
    test_font_loading()
