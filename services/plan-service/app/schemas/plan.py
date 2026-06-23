from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Plan schemas
class PlanBase(BaseModel):
    name: str
    price: float
    data_gb: int  # -1 for unlimited
    validity_days: int
    type: str  # recharge, combo, roaming
    description: Optional[str] = None

class PlanCreate(PlanBase):
    pass

class PlanUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    data_gb: Optional[int] = None
    validity_days: Optional[int] = None
    type: Optional[str] = None
    description: Optional[str] = None

class PlanOut(PlanBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
