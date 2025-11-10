from sqlmodel import SQLModel
from app.db.session import engine
from app.models import project, image, marker, region, template


def init_db() -> None:
    """
    Initializes the database by creating all tables.
    Should be called once at startup.
    """
    print("🗄️  Initializing database...")
    SQLModel.metadata.create_all(bind=engine)
    print("✅ Database initialized successfully.")

