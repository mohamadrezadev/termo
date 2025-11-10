from sqlmodel import Session, create_engine
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=True,
    connect_args={"check_same_thread": False}  # Needed for SQLite
)

def get_session():
    with Session(engine) as session:
        yield session