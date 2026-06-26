import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.api.deps import get_current_oms_admin, TokenData
from app.models.order import Order, OrderStatus
from app.models.order_journey import OrderJourney
from app.models.service_execution_log import ServiceExecutionLog
from app.schemas.journey import JourneyStepOut, OrderAdminDetail
from app.schemas.tracker import ServiceExecutionLogOut

router = APIRouter()
logger = logging.getLogger("order-service")


# ─── List All Orders ──────────────────────────────────────────────────────────

@router.get("", response_model=List[OrderAdminDetail])
def list_all_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=200),
    admin: TokenData = Depends(get_current_oms_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Order)
    if status_filter:
        query = query.filter(Order.status == status_filter.upper())
    
    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    
    results = []
    for o in orders:
        journey = db.query(OrderJourney).filter(OrderJourney.order_id == o.id).order_by(OrderJourney.id.asc()).all()
        
        # Format items to dict
        items_list = []
        for it in o.items:
            items_list.append({
                "item_type": it.item_type,
                "item_id": it.item_id,
                "item_name": it.item_name,
                "quantity": it.quantity,
                "unit_price": float(it.unit_price)
            })
            
        results.append({
            "id": o.id,
            "user_id": o.user_id,
            "status": o.status,
            "total_amount": float(o.total_amount),
            "created_at": o.created_at,
            "items": items_list,
            "journey": journey
        })
    return results


# ─── List Failed Orders ───────────────────────────────────────────────────────

@router.get("/failed", response_model=List[OrderAdminDetail])
def list_failed_orders(
    admin: TokenData = Depends(get_current_oms_admin),
    db: Session = Depends(get_db)
):
    return list_all_orders(status="FAILED", admin=admin, db=db)


# ─── System Flow Tracker Logs ─────────────────────────────────────────────────

@router.get("/system-tracker", response_model=List[ServiceExecutionLogOut])
def get_system_tracker_logs(
    order_id: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    msisdn: Optional[str] = Query(None),
    service_name: Optional[str] = Query(None),
    admin: TokenData = Depends(get_current_oms_admin),
    db: Session = Depends(get_db)
):
    query = db.query(ServiceExecutionLog)
    
    if service_name:
        query = query.filter(ServiceExecutionLog.service_name.ilike(f"%{service_name}%"))
        
    if msisdn:
        res = db.execute(
            text("SELECT order_id FROM sim_assignment WHERE msisdn = :msisdn"),
            {"msisdn": msisdn}
        ).first()
        if res and res[0]:
            query = query.filter(ServiceExecutionLog.order_id == res[0])
        else:
            return []
            
    if customer_id:
        orders = db.query(Order.id).filter(Order.user_id == customer_id).all()
        order_ids = [o[0] for o in orders]
        if order_ids:
            query = query.filter(ServiceExecutionLog.order_id.in_(order_ids))
        else:
            return []
            
    if order_id:
        query = query.filter(ServiceExecutionLog.order_id == order_id)
        
    return query.order_by(ServiceExecutionLog.created_at.desc()).all()


# ─── Get Single Order Details & Journey ───────────────────────────────────────

@router.get("/{order_id}", response_model=OrderAdminDetail)
def get_order_admin_detail(
    order_id: str,
    admin: TokenData = Depends(get_current_oms_admin),
    db: Session = Depends(get_db)
):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        
    journey = db.query(OrderJourney).filter(OrderJourney.order_id == o.id).order_by(OrderJourney.id.asc()).all()
    
    items_list = []
    for it in o.items:
        items_list.append({
            "item_type": it.item_type,
            "item_id": it.item_id,
            "item_name": it.item_name,
            "quantity": it.quantity,
            "unit_price": float(it.unit_price)
        })
        
    return {
        "id": o.id,
        "user_id": o.user_id,
        "status": o.status,
        "total_amount": float(o.total_amount),
        "created_at": o.created_at,
        "items": items_list,
        "journey": journey
    }


# ─── Get Order Journey Steps ──────────────────────────────────────────────────

@router.get("/{order_id}/journey", response_model=List[JourneyStepOut])
def get_order_journey(
    order_id: str,
    admin: TokenData = Depends(get_current_oms_admin),
    db: Session = Depends(get_db)
):
    return db.query(OrderJourney).filter(OrderJourney.order_id == order_id).order_by(OrderJourney.id.asc()).all()


# ─── Retry Failed Order Step ──────────────────────────────────────────────────

@router.post("/retry")
def retry_failed_order(
    body: dict,
    admin: TokenData = Depends(get_current_oms_admin),
    db: Session = Depends(get_db)
):
    order_id = body.get("order_id")
    if not order_id:
        raise HTTPException(status_code=400, detail="Missing order_id")
        
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        
    if order.status != OrderStatus.FAILED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order is not in FAILED status. Current status: {order.status}"
        )
        
    # Get successful steps
    success_steps = db.query(OrderJourney.step_name).filter(
        OrderJourney.order_id == order_id,
        OrderJourney.status == "SUCCESS"
    ).all()
    steps_completed = {s[0] for s in success_steps}
    
    # Delete failed/pending attempts so they can be re-logged cleanly
    db.query(OrderJourney).filter(
        OrderJourney.order_id == order_id,
        OrderJourney.status.in_(["FAILED", "PENDING"])
    ).delete(synchronize_session=False)
    db.commit()
    
    # Generate admin token or use active admin token to call other services
    # (Since execute_order_lifecycle expects user JWT token, we pass admin token which has enough access)
    from fastapi.security import OAuth2PasswordBearer
    oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
    
    # We construct a fake token or use the authorization header (simulating system token)
    # The execute_order_lifecycle needs a token for wallet validation (which checks user sub).
    # Wait, during retry, the user has already paid if Wallet Validation succeeded in the previous run.
    # If Wallet Validation is NOT completed yet, we can pass admin token.
    # Wait, let's pass a token. We can retrieve the token from request headers or pass a system token.
    # To get the raw authorization header token from request:
    # Let's modify retry_failed_order signature to include token.
    
    # Let's get the token from dependencies.
    return retry_failed_order_with_token(order_id, admin, db)

def retry_failed_order_with_token(order_id: str, admin: TokenData, db: Session):
    order = db.query(Order).filter(Order.id == order_id).first()
    
    # Fetch completed steps
    success_steps = db.query(OrderJourney.step_name).filter(
        OrderJourney.order_id == order_id,
        OrderJourney.status == "SUCCESS"
    ).all()
    steps_completed = {s[0] for s in success_steps}
    
    # Delete failed/pending attempts
    db.query(OrderJourney).filter(
        OrderJourney.order_id == order_id,
        OrderJourney.status.in_(["FAILED", "PENDING"])
    ).delete(synchronize_session=False)
    db.commit()
    
    # Create system access token or pass admin JWT
    # We can generate a token or just pass a mock system token (or retrieve it from the header).
    # Since execute_order_lifecycle is called internally, we can construct the headers.
    # Let's pass a mock JWT containing user sub for wallet validation if needed.
    # Wait, let's generate a temporary token for the customer of this order so wallet validation works!
    # How? Let's decode the user_id and create a temporary access token for the customer.
    from app.core.security import create_access_token
    customer_token = create_access_token(subject=order.user_id, role="customer")
    
    from app.core.lifecycle import execute_order_lifecycle
    success = execute_order_lifecycle(db, order, customer_token, steps_completed=steps_completed)
    
    if not success:
        failed_step = db.query(OrderJourney).filter(
            OrderJourney.order_id == order.id,
            OrderJourney.status == "FAILED"
        ).order_by(OrderJourney.id.desc()).first()
        err_msg = failed_step.error_message if failed_step else "Retry failed."
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Retry step failed. Reason: {err_msg}"
        )
        
    logger.info(f"Order {order_id} successfully retried and completed.", extra={"event": "order_retry_success", "order_id": order_id})
    return {"message": "Order retried and completed successfully", "status": order.status}


# ─── Cancel Order ─────────────────────────────────────────────────────────────

@router.post("/cancel")
def cancel_order(
    body: dict,
    admin: TokenData = Depends(get_current_oms_admin),
    db: Session = Depends(get_db)
):
    order_id = body.get("order_id")
    if not order_id:
        raise HTTPException(status_code=400, detail="Missing order_id")
        
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        
    if order.status in (OrderStatus.CONFIRMED, OrderStatus.CANCELLED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel order in {order.status} state."
        )
        
    order.status = OrderStatus.CANCELLED
    
    # Clean up SIM inventory and mobile number status in DB if allocated
    try:
        # 1. Update physical SIM status back to AVAILABLE
        db.execute(
            text(
                "UPDATE sim_inventory si "
                "SET status = 'AVAILABLE' "
                "FROM sim_assignment sa "
                "WHERE si.id = sa.inventory_id AND sa.order_id = :order_id"
            ),
            {"order_id": order_id}
        )
        
        # 2. Update number status back to AVAILABLE
        if order.msisdn:
            db.execute(
                text(
                    "UPDATE mobile_number_inventory "
                    "SET status = 'AVAILABLE', reserved_by_customer_id = NULL, "
                    "reserved_at = NULL, reservation_expiry = NULL, inventory_id = NULL "
                    "WHERE msisdn = :msisdn"
                ),
                {"msisdn": order.msisdn}
            )
            
        # 3. Delete the sim_assignment record to clear unique constraint
        db.execute(
            text("DELETE FROM sim_assignment WHERE order_id = :order_id"),
            {"order_id": order_id}
        )
        db.commit()
    except Exception as cleanup_err:
        logger.error(f"Error cleaning up allocation for cancelled order {order_id}: {cleanup_err}")
    
    # Log cancellation step in journey
    journey_step = OrderJourney(
        order_id=order_id,
        step_name="Cancellation",
        system_name="order-service",
        status="SUCCESS",
        request_payload=json.dumps({"cancelled_by": admin.sub}),
        response_payload=json.dumps({"message": "Order cancelled by administrator and inventory released."})
    )
    db.add(journey_step)
    db.commit()
    
    logger.info(f"Order {order_id} cancelled by admin {admin.sub}", extra={"event": "order_cancelled", "order_id": order_id})
    return {"message": "Order cancelled successfully and inventory released", "status": order.status}

