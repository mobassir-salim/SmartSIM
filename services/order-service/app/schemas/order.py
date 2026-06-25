from decimal import Decimal
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.order import OrderStatus, OrderItemType


# ---- Order Item Schemas ----

class OrderItemCreate(BaseModel):
    item_type: OrderItemType
    item_id: str
    quantity: int = Field(default=1, ge=1)


class OrderItemResponse(BaseModel):
    id: str
    order_id: str
    item_type: OrderItemType
    item_id: str
    item_name: Optional[str] = None
    quantity: int
    unit_price: Decimal
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Order Schemas ----

class CustomerKycInfo(BaseModel):
    father_name: Optional[str] = None
    dob: str
    gender: str
    alternate_mobile: str
    address: str
    city: str
    state: str
    pin_code: str
    country: str
    id_type: str
    id_number: str
    id_issue_date: Optional[str] = None
    id_expiry_date: Optional[str] = None

class OrderCreate(BaseModel):
    items: List[OrderItemCreate] = Field(..., min_length=1)
    msisdn: Optional[str] = None
    customer_info: Optional[CustomerKycInfo] = None


class OrderResponse(BaseModel):
    id: str
    user_id: str
    status: OrderStatus
    total_amount: Decimal
    msisdn: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse]

    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    orders: List[OrderResponse]
    total: int
