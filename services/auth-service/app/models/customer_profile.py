from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class CustomerProfile(Base):
    __tablename__ = "customer_profile"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    father_name = Column(String, nullable=True)
    dob = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    alternate_mobile = Column(String, nullable=True)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    pin_code = Column(String, nullable=True)
    country = Column(String, nullable=True)
    
    # ID Verification
    id_type = Column(String, nullable=True)  # Aadhaar, PAN, Passport, Driving License, Voter ID
    id_number = Column(String, nullable=True)
    id_issue_date = Column(String, nullable=True)
    id_expiry_date = Column(String, nullable=True)

    status = Column(String, default="ACTIVE", nullable=False)  # ACTIVE, SUSPENDED
    notes = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
