from sqlmodel import Session, create_engine
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=True,
    connect_args={"check_same_thread": False}  # Needed for SQLite
)

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