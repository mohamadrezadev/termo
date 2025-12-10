from sqlmodel import Session, create_engine, SQLModel
from app.core.config import settings
import os

# Ensure database directory exists
db_path = settings.DATABASE_URL.replace("sqlite:///", "")
db_dir = os.path.dirname(db_path)
if db_dir and not os.path.exists(db_dir):
    os.makedirs(db_dir, exist_ok=True)
    print(f"[DB] Created database directory: {db_dir}")

engine = create_engine(
    settings.DATABASE_URL,
    echo=True,
    connect_args={"check_same_thread": False}  # Needed for SQLite
)

def init_db() -> None:
    """
    Initialize database by creating all tables.
    Should be called once at application startup.
    """
    # Import all models to register them with SQLModel
    from app.models import Project, ThermalImage, Marker, Region, Template
    
    print("[DB] Initializing database...")
    try:
        SQLModel.metadata.create_all(bind=engine)
        print("[DB] ✅ Database tables created successfully")
        print(f"[DB] ✅ Database location: {db_path}")
    except Exception as e:
        print(f"[DB] ❌ Error creating database tables: {e}")
        raise

# Dependency to get a database session
def get_db() -> Session: # type: ignore
    """
    Provides a database session for FastAPI dependencies.
    The session is closed after the request is finished.
    """
    with Session(engine) as session:
        yield session

def get_session():
    with Session(engine) as session:
        yield session