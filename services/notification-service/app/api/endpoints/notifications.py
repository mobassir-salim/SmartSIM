import logging
import requests
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from app.core.database import get_db
from app.models.notification import (
    Notification,
    NotificationTemplate,
    NotificationQueue,
    NotificationHistory,
    NotificationDLQ
)
from app.schemas.notification import (
    NotificationSendRequest,
    NotificationResponse,
    NotificationListResponse,
)

router = APIRouter()
v1_router = APIRouter()

logger = logging.getLogger("notification-service")
ROUTER_URL = "http://notification-router:8013/api/v1/router/route"


@router.get("/health", summary="Notification service health check")
def notifications_health():
    return {"status": "UP", "service": "notification-service"}


# -------------------------
# POST /api/notifications/send
# -------------------------
@router.post("/send", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED, summary="Send a notification manually")
def send_notification(
    body: NotificationSendRequest,
    db: Session = Depends(get_db)
):
    """
    Manually send a notification (Email or SMS) and save a log of it in the database.
    """
    db_notif = Notification(
        recipient=body.recipient,
        type=body.type.upper(),
        title=body.title,
        body=body.body,
        status="SENT",
    )
    try:
        db.add(db_notif)
        db.commit()
        db.refresh(db_notif)
        logger.info("Message published", extra={"event": "message_published", "event_type": db_notif.type})
    except Exception as e:
        db.rollback()
        logger.error("Notification delivery failed", extra={"event": "notification_failure", "recipient": body.recipient, "error_details": str(e)})
        raise HTTPException(status_code=500, detail=f"Failed to send notification: {str(e)}")

    # Print to logs to simulate notification delivery
    print(f"[{db_notif.type} NOTIFICATION SENT] to {db_notif.recipient} | Title: {db_notif.title} | Body: {db_notif.body}")
    
    return db_notif


# -------------------------
# GET /api/notifications (List notifications for testing/verification)
# -------------------------
@router.get("", response_model=NotificationListResponse, summary="Get notification history")
def list_notifications(
    db: Session = Depends(get_db),
    recipient: str = Query(None, description="Filter by recipient"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """
    Retrieve logs of all sent notifications, ordered by creation time descending.
    """
    query = db.query(Notification)
    if recipient:
        query = query.filter(Notification.recipient == recipient)
        
    query = query.order_by(Notification.created_at.desc())
    total = query.count()
    notifications = query.offset(skip).limit(limit).all()

    return NotificationListResponse(notifications=notifications, total=total)


# ==========================================
# Centralized Notification Platform V1 APIs
# ==========================================

class NotificationV1Request(BaseModel):
    event_type: str
    customer_id: Optional[str] = None
    channel: str # WHATSAPP, SMS, EMAIL
    destination: str
    payload: Dict[str, Any]
    priority: Optional[str] = "MEDIUM"

@v1_router.post("", status_code=201)
def trigger_notification_v1(req: NotificationV1Request, db: Session = Depends(get_db)):
    # 1. Fetch template
    template_name = req.event_type.lower()
    template = db.query(NotificationTemplate).filter(NotificationTemplate.name == template_name).first()
    
    if not template:
        # Fallback default templates
        body_template = "Notification event: {{event_type}}. Data: {{payload}}"
        subject = f"Notification: {req.event_type}"
    else:
        body_template = template.body
        subject = template.subject or f"SmartSIM {req.event_type}"

    # 2. Render Template
    message_body = body_template
    for k, v in req.payload.items():
        message_body = message_body.replace("{{" + str(k) + "}}", str(v))

    # 3. Call Router
    router_payload = {
        "event_type": req.event_type,
        "customer_id": req.customer_id,
        "channel": req.channel.upper(),
        "destination": req.destination,
        "template_name": template_name,
        "subject": subject,
        "message": message_body,
        "payload": req.payload,
        "priority": req.priority or "MEDIUM"
    }

    try:
        res = requests.post(ROUTER_URL, json=router_payload, timeout=10)
        if res.status_code == 200:
            return res.json()
        else:
            raise HTTPException(status_code=res.status_code, detail=f"Router error: {res.text}")
    except Exception as e:
        logger.error(f"Failed to call notification-router: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to communicate with router: {str(e)}")


@v1_router.get("/status")
def get_notification_status(
    notification_id: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    if not notification_id and not customer_id:
        raise HTTPException(status_code=400, detail="Must provide notification_id or customer_id")

    results = []

    # 1. Check history
    q_history = db.query(NotificationHistory)
    if notification_id:
        q_history = q_history.filter(NotificationHistory.id == notification_id)
    if customer_id:
        q_history = q_history.filter(NotificationHistory.customer_id == customer_id)
    for item in q_history.all():
        results.append({
            "id": item.id,
            "customer_id": item.customer_id,
            "channel": item.channel,
            "destination": item.destination,
            "status": item.status,
            "sent_at": item.sent_at,
            "message": item.message,
            "queue_type": "history"
        })

    # 2. Check active queue
    q_queue = db.query(NotificationQueue)
    if notification_id:
        q_queue = q_queue.filter(NotificationQueue.id == notification_id)
    if customer_id:
        q_queue = q_queue.filter(NotificationQueue.customer_id == customer_id)
    for item in q_queue.all():
        results.append({
            "id": item.id,
            "customer_id": item.customer_id,
            "channel": item.channel,
            "destination": item.destination,
            "status": item.status,
            "retry_count": item.retry_count,
            "next_attempt_at": item.next_attempt_at,
            "queue_type": "active_queue"
        })

    # 3. Check DLQ
    q_dlq = db.query(NotificationDLQ)
    if notification_id:
        q_dlq = q_dlq.filter(NotificationDLQ.id == notification_id)
    if customer_id:
        q_dlq = q_dlq.filter(NotificationDLQ.customer_id == customer_id)
    for item in q_dlq.all():
        results.append({
            "id": item.id,
            "customer_id": item.customer_id,
            "channel": item.channel,
            "destination": item.destination,
            "status": item.status,
            "error_message": item.error_message,
            "created_at": item.created_at,
            "queue_type": "dlq"
        })

    return {"results": results, "total": len(results)}

