from typing import Generator

# from app.db.session import SessionLocal
from app.core.config import settings

from app.db.session import get_session as get_db

# Dependency: get database session
def get_db() -> Generator:
    """
    Creates a new SQLAlchemy session for each request and closes it automatically.
    Usage: 
        db: Session = Depends(get_db)
    """
    db = get_db()
    try:
        yield db
    finally:
        db.close()


# Dependency: get settings (if you want to inject config globally)
def get_settings():
    """
    Provides app settings (loaded from environment variables).
    Usage:
        config = Depends(get_settings)
    """
    return settings


# Example placeholder for future auth dependency
# You can later extend this for JWT or API key checks
def get_current_user():
    """
    Dummy user dependency (placeholder for authentication).
    Replace with your own user logic when ready.
    """
    # e.g., decode JWT, fetch user from DB, etc.
    return {"id": 1, "username": "admin"}
