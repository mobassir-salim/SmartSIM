import time
import requests
import logging
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Any, Dict

from app.core.config import settings
from app.core.database import engine, Base, get_db, SessionLocal
from app.models.router import (
    NotificationRouterLog,
    NotificationHistory,
    NotificationDLQ,
    NotificationQueue,
    RouterConfiguration
)

# Auto-create tables
Base.metadata.create_all(bind=engine)

# Seed configurations
def seed_config():
    db = SessionLocal()
    try:
        defaults = {
            "notification_mode": settings.NOTIFICATION_MODE,
            "whatsapp_test_number": settings.WHATSAPP_TEST_NUMBER,
            "sms_test_number": settings.SMS_TEST_NUMBER,
            "email_test_address": settings.EMAIL_TEST_ADDRESS,
            "fallback_channel": "SMS",
            "max_retries": "4"
        }
        for k, v in defaults.items():
            existing = db.query(RouterConfiguration).filter(RouterConfiguration.key == k).first()
            if not existing:
                config = RouterConfiguration(key=k, value=v)
                db.add(config)
        db.commit()
    except Exception as e:
        print(f"Error seeding router config: {e}")
        db.rollback()
    finally:
        db.close()

seed_config()

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper function to get config value
def get_config_val(db: Session, key: str, default: str) -> str:
    cfg = db.query(RouterConfiguration).filter(RouterConfiguration.key == key).first()
    return cfg.value if cfg else default

# Request & Response schemas
class RouteRequest(BaseModel):
    event_type: str
    customer_id: Optional[str] = None
    channel: str # WHATSAPP, SMS, EMAIL
    destination: str
    template_name: str
    subject: Optional[str] = None
    message: str
    payload: Optional[Dict[str, Any]] = None
    priority: str = "MEDIUM"

@app.get("/health")
def health():
    return {"status": "UP", "service": "notification-router"}

@app.get(f"{settings.API_V1_STR}/router/config")
def get_router_config(db: Session = Depends(get_db)):
    configs = db.query(RouterConfiguration).all()
    return {c.key: c.value for c in configs}

class ConfigUpdate(BaseModel):
    configs: Dict[str, str]

@app.put(f"{settings.API_V1_STR}/router/config")
def update_router_config(payload: ConfigUpdate, db: Session = Depends(get_db)):
    for k, v in payload.configs.items():
        existing = db.query(RouterConfiguration).filter(RouterConfiguration.key == k).first()
        if existing:
            existing.value = v
        else:
            db.add(RouterConfiguration(key=k, value=v))
    db.commit()
    return {"status": "success", "message": "Configuration updated successfully"}

# Downstream routing helper
def dispatch_to_channel(channel: str, destination: str, subject: Optional[str], message: str) -> bool:
    try:
        if channel.upper() == "WHATSAPP":
            url = f"{settings.WHATSAPP_SERVICE_URL}/messages/send"
            res = requests.post(url, json={"recipient": destination, "message": message}, timeout=10)
            return res.status_code == 200
        elif channel.upper() == "SMS":
            url = f"{settings.SMS_SERVICE_URL}/sms/send"
            res = requests.post(url, json={"recipient": destination, "message": message}, timeout=10)
            return res.status_code == 200
        elif channel.upper() == "EMAIL":
            url = f"{settings.EMAIL_SERVICE_URL}/email/send"
            res = requests.post(url, json={"recipient": destination, "subject": subject or "Notification", "body": message}, timeout=10)
            return res.status_code == 200
    except Exception as e:
        print(f"Error calling {channel} service: {e}")
    return False

# Asynchronous background retry processor
def process_retry(queue_id: str, db_session_maker):
    db = db_session_maker()
    try:
        item = db.query(NotificationQueue).filter(NotificationQueue.id == queue_id).first()
        if not item or item.status != "PENDING":
            return

        item.status = "PROCESSING"
        db.commit()

        success = dispatch_to_channel(item.channel, item.destination, item.payload.get("subject") if item.payload else None, item.payload.get("message") if item.payload else "")
        
        if success:
            # Move to history
            history = NotificationHistory(
                customer_id=item.customer_id,
                channel=item.channel,
                provider=item.channel.lower() + "_default",
                destination=item.destination,
                template=item.event_type,
                message=item.payload.get("message", "") if item.payload else "",
                status="SENT"
            )
            db.add(history)
            db.delete(item)
            db.commit()
        else:
            max_retries = int(get_config_val(db, "max_retries", "4"))
            item.retry_count += 1
            
            if item.retry_count >= max_retries:
                # Escalate to DLQ
                dlq = NotificationDLQ(
                    event_type=item.event_type,
                    customer_id=item.customer_id,
                    channel=item.channel,
                    destination=item.destination,
                    payload=item.payload,
                    error_message="Failed after maximum retries",
                    status="FAILED"
                )
                db.add(dlq)
                db.delete(item)
                db.commit()
            else:
                # Calculate next attempt time (1 min, 5 min, 15 min, 30 min)
                backoffs = [60, 300, 900, 1800]
                idx = min(item.retry_count - 1, len(backoffs) - 1)
                delay = backoffs[idx]
                item.next_attempt_at = datetime.utcnow() + timedelta(seconds=delay)
                item.status = "PENDING"
                db.commit()
    except Exception as e:
        print(f"Exception in retry runner: {e}")
        db.rollback()
    finally:
        db.close()

@app.post(f"{settings.API_V1_STR}/router/route")
def route_notification(req: RouteRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # 1. Determine environment-aware routing destination
    env = settings.APP_ENV.lower()
    mode = get_config_val(db, "notification_mode", "TEST")
    
    selected_destination = req.destination
    routing_reason = f"Routed to customer destination in {env} mode"

    if mode == "TEST" or env != "production":
        if req.channel.upper() == "WHATSAPP":
            selected_destination = get_config_val(db, "whatsapp_test_number", settings.WHATSAPP_TEST_NUMBER)
            routing_reason = f"Development mode redirect from {req.destination} to test WhatsApp"
        elif req.channel.upper() == "SMS":
            selected_destination = get_config_val(db, "sms_test_number", settings.SMS_TEST_NUMBER)
            routing_reason = f"Development mode redirect from {req.destination} to test SMS"
        elif req.channel.upper() == "EMAIL":
            selected_destination = get_config_val(db, "email_test_address", settings.EMAIL_TEST_ADDRESS)
            routing_reason = f"Development mode redirect from {req.destination} to test Email"

    # 2. Log Routing Decision
    router_log = NotificationRouterLog(
        event=req.event_type,
        selected_channel=req.channel,
        destination=selected_destination,
        environment=env,
        routing_reason=routing_reason
    )
    db.add(router_log)
    db.commit()

    # 3. Dispatch to Channel Service
    success = dispatch_to_channel(req.channel, selected_destination, req.subject, req.message)

    if success:
        # Save to history
        history = NotificationHistory(
            customer_id=req.customer_id,
            channel=req.channel,
            provider=req.channel.lower() + "_default",
            destination=selected_destination,
            template=req.template_name,
            message=req.message,
            status="SENT"
        )
        db.add(history)
        db.commit()
        return {"status": "success", "message": "Notification routed and delivered successfully"}
    else:
        # Insert into queue for retry
        queue_item = NotificationQueue(
            event_type=req.event_type,
            customer_id=req.customer_id,
            channel=req.channel,
            destination=selected_destination,
            payload={
                "subject": req.subject,
                "message": req.message,
                "template_name": req.template_name,
                "original_destination": req.destination
            },
            priority=req.priority,
            status="PENDING",
            retry_count=0,
            next_attempt_at=datetime.utcnow() + timedelta(minutes=1) # Retry after 1 minute
        )
        db.add(queue_item)
        db.commit()

        # Trigger first retry async
        background_tasks.add_task(process_retry, queue_item.id, SessionLocal)
        return {"status": "queued", "message": "Notification delivery failed, scheduled for retry"}
