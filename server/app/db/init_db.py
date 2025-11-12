# server/app/db/init_db.py
from sqlmodel import SQLModel

from app.db.session import engine
# Import all models to register them with SQLModel
from app.models import Project, ThermalImage, Marker, Region, Template


def init_db() -> None:
    """
    Initialize database by creating all tables.
    Should be called once at application startup.
    """
    print("[DB] Initializing database...")
    try:
        SQLModel.metadata.create_all(bind=engine)
        print("[DB] Database tables created successfully")
    except Exception as e:
        print(f"[DB] Error creating database tables: {e}")
        raise