import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    recipient = Column(String(255), nullable=False, index=True)
    type = Column(String(50), nullable=False)  # EMAIL, SMS
    title = Column(String(255), nullable=True)
    body = Column(String, nullable=False)
    status = Column(String(50), default="SENT", nullable=False)  # SENT, FAILED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
