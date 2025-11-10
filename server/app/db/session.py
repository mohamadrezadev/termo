from sqlmodel import Session, create_engine
from core.config import settings

# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    echo=False,  # Set True for debug SQL logs
    future=True
)

# Session factory
def SessionLocal() -> Session:
    """
    Returns a new SQLModel session bound to the engine.
    Used in FastAPI dependencies:
        db: Session = Depends(get_db)
    """
    return Session(engine)
