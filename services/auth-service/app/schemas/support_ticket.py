from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class SupportTicketCreate(BaseModel):
    type: str
    description: str

class SupportTicketOut(BaseModel):
    id: int
    customer_id: int
    type: str
    description: str
    status: str
    created_at: datetime
    updated_at: datetime
    assigned_to: Optional[int] = None

    class Config:
        from_attributes = True

class SupportTicketAssign(BaseModel):
    ticket_id: int
    assigned_to: int

class SupportTicketAdminCreate(BaseModel):
    customer_id: int
    type: str
    description: str

