import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, JSON, TEXT
from app.core.database import Base


class NotificationTemplate(Base):
    __tablename__ = "notification_templates"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), unique=True, index=True, nullable=False)
    channel = Column(String(50), nullable=False)  # WHATSAPP, SMS, EMAIL, ALL
    subject = Column(String(255), nullable=True)
    body = Column(TEXT, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class NotificationQueue(Base):
    __tablename__ = "notification_queue"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_type = Column(String(100), nullable=False)
    customer_id = Column(String(255), nullable=True)
    channel = Column(String(50), nullable=False)  # WHATSAPP, SMS, EMAIL
    destination = Column(String(255), nullable=False)
    payload = Column(JSON, nullable=True)
    priority = Column(String(50), nullable=False, default="MEDIUM")  # CRITICAL, HIGH, MEDIUM, LOW
    status = Column(String(50), nullable=False, default="PENDING")  # PENDING, PROCESSING, FAILED
    retry_count = Column(Integer, nullable=False, default=0)
    next_attempt_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class NotificationHistory(Base):
    __tablename__ = "notification_history"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = Column(String(255), nullable=True)
    channel = Column(String(50), nullable=False)
    provider = Column(String(100), nullable=True)
    destination = Column(String(255), nullable=False)
    template = Column(String(255), nullable=True)
    message = Column(TEXT, nullable=False)
    status = Column(String(50), nullable=False)  # SENT, FAILED
    sent_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class NotificationRouterLog(Base):
    __tablename__ = "notification_router_log"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    event = Column(String(100), nullable=False)
    selected_channel = Column(String(50), nullable=False)
    destination = Column(String(255), nullable=False)
    environment = Column(String(50), nullable=False)
    routing_reason = Column(TEXT, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class NotificationDLQ(Base):
    __tablename__ = "notification_dlq"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_type = Column(String(100), nullable=False)
    customer_id = Column(String(255), nullable=True)
    channel = Column(String(50), nullable=False)
    destination = Column(String(255), nullable=False)
    payload = Column(JSON, nullable=True)
    error_message = Column(TEXT, nullable=True)
    status = Column(String(50), nullable=False, default="FAILED")  # FAILED, RETRIED, CANCELLED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# Router Config Table
class RouterConfiguration(Base):
    __tablename__ = "notification_router_config"

    key = Column(String(255), primary_key=True)
    value = Column(String(255), nullable=False)
