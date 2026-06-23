from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class NotificationSendRequest(BaseModel):
    recipient: str = Field(..., description="Recipient email address or mobile number")
    type: str = Field(..., description="Type of notification (EMAIL or SMS)")
    title: Optional[str] = Field(None, max_length=255)
    body: str = Field(..., description="Body of the notification")


class NotificationResponse(BaseModel):
    id: str
    recipient: str
    type: str
    title: Optional[str]
    body: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    total: int
