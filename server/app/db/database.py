from sqlmodel import SQLModel, create_engine, Session
from app.core.config import DB_FILE

# Create SQLite engine
engine = create_engine(f"sqlite:///{DB_FILE}", echo=True)  # set echo=True for debug

# Import all models here so tables are created
from  ..models import project_model

def init_db():
    """Create all tables in the database."""
    SQLModel.metadata.create_all(engine)

def get_session() -> Session:
    """Dependency for FastAPI routes."""
    with Session(engine) as session:
        yield session
