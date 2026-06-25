import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, Integer, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base


class OrderStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class OrderItemType(str, enum.Enum):
    SIM = "SIM"
    PLAN = "PLAN"


class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    status = Column(SAEnum(OrderStatus), default=OrderStatus.PENDING, nullable=False)
    total_amount = Column(Numeric(precision=12, scale=2), default=0.00, nullable=False)
    msisdn = Column(String, nullable=True) # Selected preferred mobile number
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to order items
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    item_type = Column(SAEnum(OrderItemType), nullable=False)
    item_id = Column(String, nullable=False)  # We store as string, can be parsed to int for SIM/Plan queries
    item_name = Column(String(255), nullable=True)  # Cached item name
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Numeric(precision=12, scale=2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship back to order
    order = relationship("Order", back_populates="items")
