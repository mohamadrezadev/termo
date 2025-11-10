from sqlmodel import Session, create_engine
from core.config import settings

# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    echo=False,  # Set True for debug SQL logs
    future=True
)

# Dependency to get a database session
def get_db() -> Session:
    """
    Provides a database session for FastAPI dependencies.
    The session is closed after the request is finished.
    """
    with Session(engine) as session:
        yield session
