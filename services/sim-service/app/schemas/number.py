from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MobileNumberOut(BaseModel):
    id: int
    msisdn: str
    circle: str
    operator: str
    category: str
    status: str
    reserved_by_customer_id: Optional[int] = None
    reserved_at: Optional[datetime] = None
    reservation_expiry: Optional[datetime] = None
    inventory_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class NumberReserve(BaseModel):
    msisdn: str
