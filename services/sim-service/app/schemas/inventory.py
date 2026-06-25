from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class InventoryOut(BaseModel):
    id: int
    sim_id: int
    iccid: str
    imsi: Optional[str] = None
    sim_type: Optional[str] = None
    circle: Optional[str] = None
    status: str
    created_at: datetime
    uploaded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InventoryDashboard(BaseModel):
    total: int
    available: int
    reserved: int
    activated: int
    blocked: int
    lost: int


class InventoryUploadResponse(BaseModel):
    uploaded: int
    duplicates: int
    errors: int
    message: str


class AssignmentCreate(BaseModel):
    inventory_id: int
    customer_id: int
    order_id: Optional[int] = None


class AssignmentOut(BaseModel):
    id: int
    inventory_id: int
    customer_id: int
    order_id: Optional[int] = None
    msisdn: str
    assigned_at: datetime

    class Config:
        from_attributes = True
