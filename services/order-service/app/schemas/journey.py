from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class JourneyStepOut(BaseModel):
    id: int
    order_id: str
    step_name: str
    system_name: str
    status: str
    request_payload: Optional[str] = None
    response_payload: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class OrderAdminDetail(BaseModel):
    id: str
    user_id: str
    status: str
    total_amount: float
    created_at: datetime
    items: List[dict] = []
    journey: List[JourneyStepOut] = []

    class Config:
        from_attributes = True
