from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class MobileNumberInventory(Base):
    __tablename__ = "mobile_number_inventory"

    id = Column(Integer, primary_key=True, index=True)
    msisdn = Column(String, unique=True, index=True, nullable=False)
    circle = Column(String, nullable=False)
    operator = Column(String, nullable=False)
    category = Column(String, default="Regular")  # Regular, Premium, VIP
    status = Column(String, default="AVAILABLE", nullable=False)  # AVAILABLE, RESERVED, ALLOCATED, ACTIVATED, BLOCKED, RETIRED
    reserved_by_customer_id = Column(Integer, nullable=True)
    reserved_at = Column(DateTime(timezone=True), nullable=True)
    reservation_expiry = Column(DateTime(timezone=True), nullable=True)
    inventory_id = Column(Integer, ForeignKey("sim_inventory.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
