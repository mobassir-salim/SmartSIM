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

class OrderCreate(BaseModel):
    items: List[OrderItemCreate] = Field(..., min_length=1)


class OrderResponse(BaseModel):
    id: str
    user_id: str
    status: OrderStatus
    total_amount: Decimal
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse]

    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    orders: List[OrderResponse]
    total: int
