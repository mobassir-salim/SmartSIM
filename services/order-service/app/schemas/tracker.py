from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ServiceExecutionLogOut(BaseModel):
    id: int
    order_id: str
    service_name: str
    api_name: str
    execution_time: float
    status: str
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
