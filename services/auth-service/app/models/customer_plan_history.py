from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class CustomerPlanHistory(Base):
    __tablename__ = "customer_plan_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(Integer, nullable=False)
    plan_name = Column(String, nullable=False)
    activated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="ACTIVE", nullable=False)  # ACTIVE, EXPIRED
