from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Offer schemas
class OfferBase(BaseModel):
    plan_id: Optional[int] = None
    promo_code: str
    discount_percentage: float
    active: Optional[bool] = True
    description: Optional[str] = None
    expires_at: Optional[datetime] = None

class OfferCreate(OfferBase):
    pass

class OfferUpdate(BaseModel):
    plan_id: Optional[int] = None
    promo_code: Optional[str] = None
    discount_percentage: Optional[float] = None
    active: Optional[bool] = None
    description: Optional[str] = None
    expires_at: Optional[datetime] = None

class OfferOut(OfferBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
