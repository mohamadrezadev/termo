#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Thermal Analyzer API Server
Main entry point for running the FastAPI application
"""

import uvicorn
import sys
import os
from pathlib import Path

# Add app directory to path
BASE_DIR = Path(__file__).parent
sys.path.insert(0, str(BASE_DIR))

# Create required directories
REQUIRED_DIRS = [
    BASE_DIR / "temp_uploads",
    BASE_DIR / "extracted_images",
    BASE_DIR / "projects",
    BASE_DIR / "data"
]

for directory in REQUIRED_DIRS:
    directory.mkdir(exist_ok=True)

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 Starting Thermal Analyzer API Server")
    print("=" * 60)
    print(f"📍 Server URL: http://127.0.0.1:8000")
    print(f"📚 API Docs: http://127.0.0.1:8000/docs")
    print(f"📖 ReDoc: http://127.0.0.1:8000/redoc")
    print(f"📁 Base Directory: {BASE_DIR}")
    print("=" * 60)
    print("💡 Press Ctrl+C to stop the server")
    print("=" * 60)
    print()
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
