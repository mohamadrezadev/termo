import os
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECTS_DIR = os.path.join(BASE_DIR, "..", "..", "data", "projects")
FONTS_DIR = os.path.join(BASE_DIR, "assets", "fonts")
DB_FILE = os.path.join(BASE_DIR, "..", "..", "data", "app.db")

os.makedirs(PROJECTS_DIR, exist_ok=True)
os.makedirs(FONTS_DIR, exist_ok=True)
os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
