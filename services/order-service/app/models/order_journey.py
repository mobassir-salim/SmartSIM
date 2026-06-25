from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from app.core.database import Base

class OrderJourney(Base):
    __tablename__ = "order_journey"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String, nullable=False, index=True)
    step_name = Column(String, nullable=False)
    system_name = Column(String, nullable=False)
    status = Column(String, nullable=False)  # PENDING, SUCCESS, FAILED
    request_payload = Column(Text, nullable=True)
    response_payload = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
