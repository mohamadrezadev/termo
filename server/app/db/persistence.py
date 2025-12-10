"""
Database initialization and utilities for project persistence
"""
import sqlite3
import json
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parents[2]
DB_PATH = BASE_DIR / "data" / "thermal_analyzer.db"
DB_PATH.parent.mkdir(exist_ok=True)


def get_db_connection():
    """Get a database connection"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize database with tables"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Projects table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                active_image_id TEXT,
                current_palette TEXT DEFAULT 'iron',
                custom_min_temp REAL,
                custom_max_temp REAL,
                parameters TEXT DEFAULT '{}',
                data_json TEXT NOT NULL
            )
        ''')
        
        # Images table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS images (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                name TEXT NOT NULL,
                thermal_data TEXT,
                real_image_url TEXT,
                server_rendered_url TEXT,
                server_palettes TEXT DEFAULT '{}',
                csv_url TEXT,
                metadata TEXT DEFAULT '{}',
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            )
        ''')
        
        # Markers table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS markers (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                image_id TEXT NOT NULL,
                type TEXT DEFAULT 'point',
                x REAL NOT NULL,
                y REAL NOT NULL,
                temperature REAL,
                label TEXT,
                emissivity REAL DEFAULT 0.95,
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id),
                FOREIGN KEY (image_id) REFERENCES images(id)
            )
        ''')
        
        # Regions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS regions (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                image_id TEXT NOT NULL,
                type TEXT NOT NULL,
                points TEXT NOT NULL,
                min_temp REAL DEFAULT 0,
                max_temp REAL DEFAULT 0,
                avg_temp REAL DEFAULT 0,
                area REAL DEFAULT 0,
                label TEXT,
                emissivity REAL DEFAULT 0.95,
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id),
                FOREIGN KEY (image_id) REFERENCES images(id)
            )
        ''')
        
        conn.commit()
        logger.info(f"Database initialized at {DB_PATH}")
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


def save_project(project_data: Dict[str, Any]) -> bool:
    """Save project and all its data to database"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        project_id = project_data.get('id')
        now = datetime.now().isoformat()
        
        # Check if project exists
        cursor.execute('SELECT id FROM projects WHERE id = ?', (project_id,))
        exists = cursor.fetchone() is not None
        
        if exists:
            # Update project
            cursor.execute('''
                UPDATE projects 
                SET name=?, description=?, updated_at=?, active_image_id=?, 
                    current_palette=?, custom_min_temp=?, custom_max_temp=?,
                    parameters=?, data_json=?
                WHERE id=?
            ''', (
                project_data.get('name'),
                project_data.get('description'),
                now,
                project_data.get('activeImageId'),
                project_data.get('currentPalette', 'iron'),
                project_data.get('customMinTemp'),
                project_data.get('customMaxTemp'),
                json.dumps(project_data.get('parameters', {})),
                json.dumps(project_data),
                project_id
            ))
        else:
            # Insert new project
            cursor.execute('''
                INSERT INTO projects 
                (id, name, description, created_at, updated_at, active_image_id,
                 current_palette, custom_min_temp, custom_max_temp, parameters, data_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                project_id,
                project_data.get('name'),
                project_data.get('description'),
                now,
                now,
                project_data.get('activeImageId'),
                project_data.get('currentPalette', 'iron'),
                project_data.get('customMinTemp'),
                project_data.get('customMaxTemp'),
                json.dumps(project_data.get('parameters', {})),
                json.dumps(project_data)
            ))
        
        # Save images
        images = project_data.get('images', [])
        for image in images:
            # Get image name from 'name' or 'filename' field
            image_name = image.get('name') or image.get('filename') or f"image_{image.get('id')}"
            cursor.execute('''
                INSERT OR REPLACE INTO images
                (id, project_id, name, thermal_data, real_image_url, server_rendered_url,
                 server_palettes, csv_url, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                image.get('id'),
                project_id,
                image_name,
                json.dumps(image.get('thermalData')) if image.get('thermalData') else None,
                image.get('realImage') or image.get('url'),
                image.get('serverRenderedThermalUrl'),
                json.dumps(image.get('serverPalettes', {})),
                image.get('csvUrl'),
                json.dumps(image.get('metadata', {})),
                datetime.now().isoformat()
            ))
        
        # Save markers
        markers = project_data.get('markers', [])
        for marker in markers:
            cursor.execute('''
                INSERT OR REPLACE INTO markers
                (id, project_id, image_id, type, x, y, temperature, label, emissivity, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                marker.get('id'),
                project_id,
                marker.get('imageId'),
                marker.get('type', 'point'),
                marker.get('x'),
                marker.get('y'),
                marker.get('temperature'),
                marker.get('label'),
                marker.get('emissivity', 0.95),
                datetime.now().isoformat()
            ))
        
        # Save regions
        regions = project_data.get('regions', [])
        for region in regions:
            cursor.execute('''
                INSERT OR REPLACE INTO regions
                (id, project_id, image_id, type, points, min_temp, max_temp, avg_temp, area, label, emissivity, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                region.get('id'),
                project_id,
                region.get('imageId'),
                region.get('type'),
                json.dumps(region.get('points', [])),
                region.get('minTemp', 0),
                region.get('maxTemp', 0),
                region.get('avgTemp', 0),
                region.get('area', 0),
                region.get('label'),
                region.get('emissivity', 0.95),
                datetime.now().isoformat()
            ))
        
        conn.commit()
        logger.info(f"Project {project_id} saved successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to save project: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


def load_project(project_id: str) -> Optional[Dict[str, Any]]:
    """Load project and all its data from database"""
    from app.services.file_manager import FileManager
    import base64
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Load project
        cursor.execute('SELECT * FROM projects WHERE id = ?', (project_id,))
        project_row = cursor.fetchone()
        
        if not project_row:
            logger.warning(f"Project {project_id} not found")
            return None
        
        # Parse full project data from data_json
        project_data = json.loads(project_row['data_json'])
        
        # Load and update images
        cursor.execute('SELECT * FROM images WHERE project_id = ?', (project_id,))
        images = []
        file_manager = FileManager()
        
        for image_row in cursor.fetchall():
            print(f"[LOAD_PROJECT] Processing image from DB: {image_row['name']}")
            print(f"[LOAD_PROJECT] Real image URL: {image_row['real_image_url']}")
            print(f"[LOAD_PROJECT] Server rendered URL: {image_row['server_rendered_url']}")
            print(f"[LOAD_PROJECT] Server palettes: {image_row['server_palettes']}")
            
            # Parse metadata and normalize field names
            metadata = json.loads(image_row['metadata']) if image_row['metadata'] else {}
            # Convert snake_case to camelCase for client compatibility
            if 'reflected_temp' in metadata and 'reflectedTemp' not in metadata:
                metadata['reflectedTemp'] = metadata.pop('reflected_temp')
            
            # Convert file paths to base64
            real_image_base64 = image_row['real_image_url']
            if real_image_base64 and not real_image_base64.startswith('data:'):
                try:
                    real_path = file_manager.get_file_path(real_image_base64)
                    print(f"[LOAD_PROJECT] Real image path resolved to: {real_path}")
                    if real_path and real_path.exists():
                        with open(real_path, 'rb') as f:
                            real_data = f.read()
                            real_b64 = base64.b64encode(real_data).decode('utf-8')
                            ext = real_path.suffix.lower()
                            mime_type = 'image/jpeg' if ext in ['.jpg', '.jpeg'] else 'image/png' if ext == '.png' else 'image/bmp'
                            real_image_base64 = f'data:{mime_type};base64,{real_b64}'
                            print(f"[LOAD_PROJECT] Real image converted to base64: {len(real_b64)} bytes")
                except Exception as e:
                    print(f"[LOAD_PROJECT] Error loading real image: {e}")
                    real_image_base64 = None
            
            thermal_image_base64 = image_row['server_rendered_url']
            if thermal_image_base64 and not thermal_image_base64.startswith('data:'):
                try:
                    thermal_path = file_manager.get_file_path(thermal_image_base64)
                    print(f"[LOAD_PROJECT] Thermal image path resolved to: {thermal_path}")
                    if thermal_path and thermal_path.exists():
                        with open(thermal_path, 'rb') as f:
                            thermal_data = f.read()
                            thermal_b64 = base64.b64encode(thermal_data).decode('utf-8')
                            ext = thermal_path.suffix.lower()
                            mime_type = 'image/jpeg' if ext in ['.jpg', '.jpeg'] else 'image/png' if ext == '.png' else 'image/bmp'
                            thermal_image_base64 = f'data:{mime_type};base64,{thermal_b64}'
                            print(f"[LOAD_PROJECT] Thermal image converted to base64: {len(thermal_b64)} bytes")
                except Exception as e:
                    print(f"[LOAD_PROJECT] Error loading thermal image: {e}")
                    thermal_image_base64 = None
            
            # Convert server palettes to base64
            server_palettes_dict = json.loads(image_row['server_palettes']) if image_row['server_palettes'] else {}
            converted_palettes = {}
            for palette_name, palette_path in server_palettes_dict.items():
                if palette_path and not palette_path.startswith('data:'):
                    try:
                        p_path = file_manager.get_file_path(palette_path)
                        if p_path and p_path.exists():
                            with open(p_path, 'rb') as f:
                                p_data = f.read()
                                p_b64 = base64.b64encode(p_data).decode('utf-8')
                                ext = p_path.suffix.lower()
                                mime_type = 'image/jpeg' if ext in ['.jpg', '.jpeg'] else 'image/png' if ext == '.png' else 'image/bmp'
                                converted_palettes[palette_name] = f'data:{mime_type};base64,{p_b64}'
                                print(f"[LOAD_PROJECT] Palette '{palette_name}' converted to base64")
                    except Exception as e:
                        print(f"[LOAD_PROJECT] Error loading palette {palette_name}: {e}")
                else:
                    converted_palettes[palette_name] = palette_path
            
            image = {
                'id': image_row['id'],
                'name': image_row['name'],
                'thermalData': json.loads(image_row['thermal_data']) if image_row['thermal_data'] else None,
                'realImage': real_image_base64,
                'serverRenderedThermalUrl': thermal_image_base64,
                'serverPalettes': converted_palettes,
                'csvUrl': image_row['csv_url'],
                'metadata': metadata
            }
            print(f"[LOAD_PROJECT] Image '{image_row['name']}' loaded:")
            print(f"  - Real image: {'base64' if real_image_base64 and real_image_base64.startswith('data:') else real_image_base64}")
            print(f"  - Thermal image: {'base64' if thermal_image_base64 and thermal_image_base64.startswith('data:') else thermal_image_base64}")
            print(f"  - Palettes: {list(converted_palettes.keys())}")
            images.append(image)
        project_data['images'] = images
        
        # Load markers
        cursor.execute('SELECT * FROM markers WHERE project_id = ?', (project_id,))
        markers = []
        for marker_row in cursor.fetchall():
            marker = {
                'id': marker_row['id'],
                'type': marker_row['type'],
                'x': marker_row['x'],
                'y': marker_row['y'],
                'temperature': marker_row['temperature'],
                'label': marker_row['label'],
                'emissivity': marker_row['emissivity'],
                'imageId': marker_row['image_id']
            }
            markers.append(marker)
        project_data['markers'] = markers
        
        # Load regions
        cursor.execute('SELECT * FROM regions WHERE project_id = ?', (project_id,))
        regions = []
        for region_row in cursor.fetchall():
            region = {
                'id': region_row['id'],
                'type': region_row['type'],
                'points': json.loads(region_row['points']),
                'minTemp': region_row['min_temp'],
                'maxTemp': region_row['max_temp'],
                'avgTemp': region_row['avg_temp'],
                'area': region_row['area'],
                'label': region_row['label'],
                'emissivity': region_row['emissivity'],
                'imageId': region_row['image_id']
            }
            regions.append(region)
        project_data['regions'] = regions
        
        logger.info(f"Project {project_id} loaded successfully")
        return project_data
        
    except Exception as e:
        logger.error(f"Failed to load project: {e}")
        return None
    finally:
        conn.close()


def list_projects() -> List[Dict[str, Any]]:
    """List all projects"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT id, name, description, created_at, updated_at 
            FROM projects 
            ORDER BY updated_at DESC
        ''')
        
        projects = []
        for row in cursor.fetchall():
            projects.append({
                'id': row['id'],
                'name': row['name'],
                'description': row['description'],
                'createdAt': row['created_at'],
                'updatedAt': row['updated_at']
            })
        
        return projects
        
    except Exception as e:
        logger.error(f"Failed to list projects: {e}")
        return []
    finally:
        conn.close()


def delete_project(project_id: str) -> bool:
    """Delete project and all related data"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Delete related data first
        cursor.execute('DELETE FROM markers WHERE project_id = ?', (project_id,))
        cursor.execute('DELETE FROM regions WHERE project_id = ?', (project_id,))
        cursor.execute('DELETE FROM images WHERE project_id = ?', (project_id,))
        cursor.execute('DELETE FROM projects WHERE id = ?', (project_id,))
        
        conn.commit()
        logger.info(f"Project {project_id} deleted successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to delete project: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()
