#!/usr/bin/env python
"""
Test script to verify project persistence system
"""
import sys
import os

# Add server directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

from app.db.persistence import init_db, save_project, load_project, list_projects, delete_project
import json
from datetime import datetime

def test_persistence():
    """Test the complete persistence workflow"""
    
    print("[TEST] Initializing database...")
    init_db()
    print("[✓] Database initialized")
    
    # Create a test project
    test_project = {
        "id": "test_project_001",
        "name": "Test Thermal Analysis",
        "description": "Testing project persistence",
        "images": [
            {
                "id": "img_001",
                "filename": "thermal_image_01.png",
                "url": "data:image/png;base64,iVBORw0KGgo...",
                "metadata": {
                    "min_temp": 15.5,
                    "max_temp": 35.2,
                    "avg_temp": 25.0,
                    "emissivity": 0.95,
                    "reflected_temp": 20.0
                }
            }
        ],
        "markers": [
            {
                "id": "marker_001",
                "imageId": "img_001",
                "x": 100,
                "y": 150,
                "temperature": 28.5,
                "label": "Hotspot 1"
            }
        ],
        "regions": [
            {
                "id": "region_001",
                "imageId": "img_001",
                "type": "polygon",
                "points": [[100, 100], [200, 100], [200, 200], [100, 200]],
                "minTemp": 20.0,
                "maxTemp": 32.0,
                "avgTemp": 26.0,
                "label": "Region A"
            }
        ],
        "activeImageId": "img_001",
        "currentPalette": "iron",
        "customMinTemp": None,
        "customMaxTemp": None
    }
    
    print("\n[TEST] Saving project...")
    success = save_project(test_project)
    if success:
        print("[✓] Project saved successfully")
    else:
        print("[✗] Failed to save project")
        return False
    
    print("\n[TEST] Listing projects...")
    projects = list_projects()
    print(f"[✓] Found {len(projects)} project(s)")
    for p in projects:
        print(f"  - {p['name']} (ID: {p['id']}, Updated: {p['updatedAt']})")
    
    print("\n[TEST] Loading project...")
    loaded = load_project("test_project_001")
    if loaded:
        print("[✓] Project loaded successfully")
        print(f"  - Name: {loaded['name']}")
        print(f"  - Images: {len(loaded.get('images', []))}")
        print(f"  - Markers: {len(loaded.get('markers', []))}")
        print(f"  - Regions: {len(loaded.get('regions', []))}")
    else:
        print("[✗] Failed to load project")
        return False
    
    print("\n[TEST] Deleting project...")
    success = delete_project("test_project_001")
    if success:
        print("[✓] Project deleted successfully")
    else:
        print("[✗] Failed to delete project")
        return False
    
    print("\n[TEST] Verifying deletion...")
    projects = list_projects()
    if len(projects) == 0:
        print("[✓] Project deletion verified")
    else:
        print(f"[✗] Project still exists: {projects}")
        return False
    
    print("\n[SUCCESS] All tests passed!")
    return True

if __name__ == "__main__":
    test_persistence()
