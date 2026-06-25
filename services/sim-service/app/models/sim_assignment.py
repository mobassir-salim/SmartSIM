from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class SimAssignment(Base):
    __tablename__ = "sim_assignment"

    id = Column(Integer, primary_key=True, index=True)
    inventory_id = Column(Integer, ForeignKey("sim_inventory.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(Integer, nullable=False)
    order_id = Column(String, nullable=True)
    msisdn = Column(String, unique=True, index=True, nullable=False)
    iccid = Column(String, nullable=False)
    imsi = Column(String, nullable=False)
    assignment_status = Column(String, default="ALLOCATED", nullable=False)  # ALLOCATED, ACTIVATED, DEACTIVATED
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
