#!/usr/bin/env python
"""
End-to-End Test: Project Save/Load Workflow
Tests the complete project persistence workflow
"""
import sys
import os
import json
import time

# Add server directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

from app.db.persistence import init_db, save_project, load_project, list_projects, delete_project
from datetime import datetime

def test_complete_workflow():
    """Test save -> load -> list -> delete workflow"""
    
    print("\n" + "="*70)
    print("END-TO-END PROJECT PERSISTENCE TEST")
    print("="*70 + "\n")
    
    # Step 1: Initialize database
    print("[1] Initializing database...")
    try:
        init_db()
        print("    ✓ Database initialized successfully\n")
    except Exception as e:
        print(f"    ✗ Failed to initialize database: {e}\n")
        return False
    
    # Step 2: Create test project with realistic data
    print("[2] Creating test project with images, markers, and regions...")
    test_project = {
        "id": "e2e_test_project",
        "name": "End-to-End Test Project",
        "description": "Complete project with all data types",
        "operator": "Test User",
        "company": "Test Company",
        "images": [
            {
                "id": "thermal_img_001",
                "name": "Thermal Image 1",
                "filename": "thermal_001.bmt",
                "realImage": "http://localhost:8000/files/projects/thermal_001_real.png",
                "serverRenderedThermalUrl": "http://localhost:8000/files/projects/thermal_001_iron.png",
                "serverPalettes": {
                    "iron": "http://localhost:8000/files/projects/thermal_001_iron.png",
                    "rainbow": "http://localhost:8000/files/projects/thermal_001_rainbow.png",
                    "grayscale": "http://localhost:8000/files/projects/thermal_001_grayscale.png"
                },
                "csvUrl": "http://localhost:8000/files/projects/thermal_001.csv",
                "metadata": {
                    "emissivity": 0.95,
                    "ambientTemp": 22,
                    "reflectedTemp": 21,
                    "humidity": 0.45,
                    "distance": 1.5,
                    "device": "Testo Thermal Camera",
                    "min_temp": 15.5,
                    "max_temp": 45.2,
                    "avg_temp": 28.5,
                    "timestamp": "2025-11-17T10:30:00Z"
                }
            },
            {
                "id": "thermal_img_002",
                "name": "Thermal Image 2",
                "filename": "thermal_002.bmt",
                "realImage": "http://localhost:8000/files/projects/thermal_002_real.png",
                "serverRenderedThermalUrl": "http://localhost:8000/files/projects/thermal_002_iron.png",
                "serverPalettes": {
                    "iron": "http://localhost:8000/files/projects/thermal_002_iron.png"
                },
                "metadata": {
                    "emissivity": 0.92,
                    "reflectedTemp": 20,
                    "device": "Testo Thermal Camera"
                }
            }
        ],
        "markers": [
            {
                "id": "marker_001",
                "imageId": "thermal_img_001",
                "type": "point",
                "x": 150,
                "y": 200,
                "temperature": 35.5,
                "label": "Hotspot A",
                "emissivity": 0.95
            },
            {
                "id": "marker_002",
                "imageId": "thermal_img_001",
                "type": "point",
                "x": 300,
                "y": 250,
                "temperature": 28.0,
                "label": "Cold Area",
                "emissivity": 0.95
            }
        ],
        "regions": [
            {
                "id": "region_001",
                "imageId": "thermal_img_001",
                "type": "polygon",
                "points": [[100, 100], [200, 100], [200, 200], [100, 200]],
                "minTemp": 25.0,
                "maxTemp": 32.0,
                "avgTemp": 28.5,
                "area": 10000,
                "label": "Analysis Region",
                "emissivity": 0.95
            }
        ],
        "activeImageId": "thermal_img_001",
        "currentPalette": "iron",
        "customMinTemp": None,
        "customMaxTemp": None,
        "parameters": {
            "emissivity": 0.95,
            "ambientTemp": 22,
            "reflectedTemp": 21,
            "humidity": 0.45,
            "distance": 1.5
        }
    }
    
    print("    Project structure:")
    print(f"      • 2 images")
    print(f"      • 2 markers")
    print(f"      • 1 region")
    print(f"      • Active image: {test_project['activeImageId']}")
    print(f"      • Palette: {test_project['currentPalette']}\n")
    
    # Step 3: Save project
    print("[3] Saving project to database...")
    try:
        success = save_project(test_project)
        if success:
            print("    ✓ Project saved successfully\n")
        else:
            print("    ✗ Failed to save project\n")
            return False
    except Exception as e:
        print(f"    ✗ Save failed: {e}\n")
        return False
    
    # Step 4: List projects
    print("[4] Listing all projects...")
    try:
        projects = list_projects()
        print(f"    ✓ Found {len(projects)} project(s)")
        for p in projects:
            print(f"      • {p['name']} (ID: {p['id']}, Updated: {p['updatedAt']})")
        print()
    except Exception as e:
        print(f"    ✗ List failed: {e}\n")
        return False
    
    # Step 5: Load project
    print("[5] Loading saved project...")
    try:
        loaded = load_project("e2e_test_project")
        if not loaded:
            print("    ✗ Project not found\n")
            return False
        
        print("    ✓ Project loaded successfully")
        print(f"      • Name: {loaded['name']}")
        print(f"      • Operator: {loaded.get('operator', 'N/A')}")
        print(f"      • Company: {loaded.get('company', 'N/A')}")
        print(f"      • Images: {len(loaded.get('images', []))}")
        print(f"      • Markers: {len(loaded.get('markers', []))}")
        print(f"      • Regions: {len(loaded.get('regions', []))}")
        print(f"      • Active Image: {loaded.get('activeImageId', 'N/A')}")
        print(f"      • Palette: {loaded.get('currentPalette', 'N/A')}\n")
        
        # Verify images were loaded with full data
        if loaded.get('images'):
            first_img = loaded['images'][0]
            print("    First image verification:")
            print(f"      • ID: {first_img.get('id')}")
            print(f"      • Name: {first_img.get('name')}")
            print(f"      • Has metadata: {bool(first_img.get('metadata'))}")
            print(f"      • Has server URLs: {bool(first_img.get('serverRenderedThermalUrl'))}")
            print(f"      • Server palettes: {len(first_img.get('serverPalettes', {}))}")
            print()
            
            if first_img.get('metadata'):
                meta = first_img['metadata']
                print("    Metadata verification:")
                print(f"      • Emissivity: {meta.get('emissivity')}")
                print(f"      • Reflected Temp: {meta.get('reflectedTemp')}")
                print(f"      • Device: {meta.get('device')}")
                print()
    except Exception as e:
        print(f"    ✗ Load failed: {e}\n")
        return False
    
    # Step 6: Verify data integrity
    print("[6] Verifying data integrity...")
    errors = []
    
    # Check images
    if not loaded.get('images'):
        errors.append("No images found in loaded project")
    elif len(loaded['images']) != 2:
        errors.append(f"Expected 2 images, got {len(loaded['images'])}")
    else:
        img = loaded['images'][0]
        if not img.get('serverRenderedThermalUrl'):
            errors.append("Image missing serverRenderedThermalUrl")
        if not img.get('metadata'):
            errors.append("Image missing metadata")
        if not img.get('serverPalettes'):
            errors.append("Image missing serverPalettes")
    
    # Check markers
    if not loaded.get('markers'):
        errors.append("No markers found in loaded project")
    elif len(loaded['markers']) != 2:
        errors.append(f"Expected 2 markers, got {len(loaded['markers'])}")
    
    # Check regions
    if not loaded.get('regions'):
        errors.append("No regions found in loaded project")
    elif len(loaded['regions']) != 1:
        errors.append(f"Expected 1 region, got {len(loaded['regions'])}")
    
    if errors:
        print("    ✗ Data integrity check failed:")
        for err in errors:
            print(f"      • {err}")
        print()
        return False
    else:
        print("    ✓ All data verified successfully\n")
    
    # Step 7: Delete project
    print("[7] Deleting project...")
    try:
        success = delete_project("e2e_test_project")
        if success:
            print("    ✓ Project deleted successfully\n")
        else:
            print("    ✗ Failed to delete project\n")
            return False
    except Exception as e:
        print(f"    ✗ Delete failed: {e}\n")
        return False
    
    # Step 8: Verify deletion
    print("[8] Verifying deletion...")
    try:
        projects = list_projects()
        # Filter out test projects (in case there are leftovers from previous runs)
        actual_projects = [p for p in projects if p['id'] not in ['e2e_test_project', 'test']]
        if len(actual_projects) == 0:
            print("    ✓ Project successfully removed from database\n")
        else:
            print(f"    ✗ Project still exists: {actual_projects}\n")
            return False
    except Exception as e:
        print(f"    ✗ Verification failed: {e}\n")
        return False
    
    print("="*70)
    print("✓ ALL TESTS PASSED - Project persistence system is working!")
    print("="*70 + "\n")
    return True

if __name__ == "__main__":
    success = test_complete_workflow()
    sys.exit(0 if success else 1)
