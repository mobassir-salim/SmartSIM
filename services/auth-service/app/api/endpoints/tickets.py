import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, get_current_crm_admin, TokenData
from app.models.user import User
from app.models.support_ticket import SupportTicket
from app.schemas.support_ticket import SupportTicketCreate, SupportTicketOut, SupportTicketAssign, SupportTicketAdminCreate

router = APIRouter()
logger = logging.getLogger("auth-service")

# ─── Customer Endpoints ───────────────────────────────────────────────────────

@router.post("", response_model=SupportTicketOut, status_code=status.HTTP_201_CREATED)
def raise_ticket(
    ticket_in: SupportTicketCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Customer endpoint to raise a support ticket."""
    db_ticket = SupportTicket(
        customer_id=current_user.id,
        type=ticket_in.type,
        description=ticket_in.description,
        status="Open"
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    
    logger.info(
        f"Support ticket raised: ID {db_ticket.id} by customer {current_user.id}",
        extra={"event": "ticket_created", "ticket_id": db_ticket.id, "customer_id": current_user.id}
    )
    return db_ticket

@router.get("", response_model=List[SupportTicketOut])
def list_my_tickets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Customer endpoint to retrieve all their support tickets."""
    return db.query(SupportTicket).filter(SupportTicket.customer_id == current_user.id).order_by(SupportTicket.created_at.desc()).all()


# ─── Admin Endpoints ──────────────────────────────────────────────────────────

@router.get("/admin/all", response_model=List[SupportTicketOut])
def list_all_tickets(
    admin: TokenData = Depends(get_current_crm_admin),
    db: Session = Depends(get_db)
):
    """Admin/Support endpoint to list all support tickets."""
    return db.query(SupportTicket).order_by(SupportTicket.created_at.desc()).all()

@router.post("/admin/assign", response_model=SupportTicketOut)
def assign_ticket(
    payload: SupportTicketAssign,
    admin: TokenData = Depends(get_current_crm_admin),
    db: Session = Depends(get_db)
):
    """Admin/Support endpoint to assign a ticket to a support agent."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == payload.ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    # Verify that assigned agent exists
    agent = db.query(User).filter(User.id == payload.assigned_to).first()
    if not agent:
        raise HTTPException(status_code=400, detail="Assigned agent does not exist")
        
    ticket.assigned_to = payload.assigned_to
    ticket.status = "In Progress"
    db.commit()
    db.refresh(ticket)
    
    logger.info(
        f"Ticket {ticket.id} assigned to agent {payload.assigned_to} by admin {admin.sub}",
        extra={"event": "ticket_assigned", "ticket_id": ticket.id, "assigned_to": payload.assigned_to}
    )
    return ticket

from pydantic import BaseModel

class TicketResolvePayload(BaseModel):
    ticket_id: int

@router.post("/admin/resolve", response_model=SupportTicketOut)
def resolve_ticket(
    payload: TicketResolvePayload,
    admin: TokenData = Depends(get_current_crm_admin),
    db: Session = Depends(get_db)
):
    """Admin/Support endpoint to mark a ticket as resolved."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == payload.ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    ticket.status = "Resolved"
    db.commit()
    db.refresh(ticket)
    
    logger.info(
        f"Ticket {ticket.id} resolved by admin {admin.sub}",
        extra={"event": "ticket_resolved", "ticket_id": ticket.id}
    )
    return ticket

@router.post("/admin/create", response_model=SupportTicketOut, status_code=status.HTTP_201_CREATED)
def admin_create_ticket(
    ticket_in: SupportTicketAdminCreate,
    admin: TokenData = Depends(get_current_crm_admin),
    db: Session = Depends(get_db)
):
    """Admin/Support endpoint to raise a ticket for a customer."""
    customer = db.query(User).filter(User.id == ticket_in.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    db_ticket = SupportTicket(
        customer_id=ticket_in.customer_id,
        type=ticket_in.type,
        description=ticket_in.description,
        status="Open"
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    
    logger.info(
        f"Support ticket raised by admin {admin.sub} for customer {ticket_in.customer_id}",
        extra={"event": "ticket_created_by_admin", "ticket_id": db_ticket.id, "customer_id": ticket_in.customer_id}
    )
    return db_ticket

from typing import Optional

class TicketUpdatePayload(BaseModel):
    ticket_id: int
    status: Optional[str] = None
    assigned_to: Optional[int] = None

@router.post("/admin/update", response_model=SupportTicketOut)
def update_ticket(
    payload: TicketUpdatePayload,
    admin: TokenData = Depends(get_current_crm_admin),
    db: Session = Depends(get_db)
):
    """Admin/Support endpoint to update ticket status and/or assignee."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == payload.ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    if payload.status is not None:
        allowed_statuses = ["Open", "In Progress", "Pending", "Resolved"]
        if payload.status not in allowed_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {allowed_statuses}")
        ticket.status = payload.status
        
    if payload.assigned_to is not None:
        if payload.assigned_to <= 0: # 0 or negative to unassign
            ticket.assigned_to = None
        else:
            agent = db.query(User).filter(User.id == payload.assigned_to).first()
            if not agent:
                raise HTTPException(status_code=400, detail="Assigned agent does not exist")
            ticket.assigned_to = payload.assigned_to
            
    db.commit()
    db.refresh(ticket)
    
    logger.info(
        f"Ticket {ticket.id} updated by admin {admin.sub}: status={payload.status}, assigned_to={payload.assigned_to}",
        extra={"event": "ticket_updated", "ticket_id": ticket.id, "status": payload.status, "assigned_to": payload.assigned_to}
    )
    return ticket


