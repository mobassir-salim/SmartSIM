from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class Sim(Base):
    __tablename__ = "sims"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # esim, prepaid, postpaid
    price = Column(Float, nullable=False)
    description = Column(String, nullable=True)
    iccid_prefix = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)  # SIM Status: active/inactive
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
