import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.notification import Notification
from app.schemas.notification import (
    NotificationSendRequest,
    NotificationResponse,
    NotificationListResponse,
)

router = APIRouter()

logger = logging.getLogger("notification-service")


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
        status="SENT",  # In production, this would interface with SMTP / SMS gateway APIs
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
