from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class SimInventory(Base):
    __tablename__ = "sim_inventory"

    id = Column(Integer, primary_key=True, index=True)
    sim_id = Column(Integer, ForeignKey("sims.id", ondelete="CASCADE"), nullable=False)
    iccid = Column(String, unique=True, index=True, nullable=False)
    status = Column(String, default="available", nullable=False)  # available, assigned, deactivated
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
