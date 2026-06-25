from sqlalchemy import Column, Integer, String, DateTime, Float, Text
from sqlalchemy.sql import func
from app.core.database import Base

class ServiceExecutionLog(Base):
    __tablename__ = "service_execution_log"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String, nullable=False, index=True)
    service_name = Column(String, nullable=False, index=True)
    api_name = Column(String, nullable=False)
    execution_time = Column(Float, nullable=False)  # Duration in milliseconds
    status = Column(String, nullable=False)  # SUCCESS, FAILED
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
