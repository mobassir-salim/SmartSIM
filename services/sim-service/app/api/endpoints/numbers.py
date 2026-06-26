import logging
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.api.deps import get_db, get_current_user_role, TokenData
from app.models.mobile_number_inventory import MobileNumberInventory
from app.schemas.number import MobileNumberOut, NumberReserve

router = APIRouter()
logger = logging.getLogger("sim-service")

@router.get("", response_model=List[MobileNumberOut])
def list_available_numbers(
    circle: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    pattern: Optional[str] = Query(None, description="Search pattern like 98% or %123%"),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    """
    List available mobile numbers.
    Numbers whose reservations have expired are also treated as available.
    """
    now = datetime.now(timezone.utc)
    
    # Query numbers that are AVAILABLE OR RESERVED but expired
    query = db.query(MobileNumberInventory).filter(
        or_(
            MobileNumberInventory.status == "AVAILABLE",
            and_(
                MobileNumberInventory.status == "RESERVED",
                MobileNumberInventory.reservation_expiry < now
            )
        )
    )
    
    if circle:
        query = query.filter(MobileNumberInventory.circle == circle.upper())
    if category:
        query = query.filter(MobileNumberInventory.category == category.capitalize())
    if pattern:
        query = query.filter(MobileNumberInventory.msisdn.like(pattern))
        
    results = query.limit(limit).all()
    
    # Enrich responses - if a number was reserved but expired, we internally view it as available here
    for r in results:
        if r.status == "RESERVED" and r.reservation_expiry < now:
            r.status = "AVAILABLE"
            r.reserved_by_customer_id = None
            r.reserved_at = None
            r.reservation_expiry = None
            
    return results

@router.get("/active-reservation", response_model=Optional[MobileNumberOut])
def get_active_reservation(
    token_data: TokenData = Depends(get_current_user_role),
    db: Session = Depends(get_db)
):
    """
    Get the currently active reserved number for the authenticated customer.
    """
    customer_id = int(token_data.sub)
    now = datetime.now(timezone.utc)
    
    record = db.query(MobileNumberInventory).filter(
        MobileNumberInventory.status == "RESERVED",
        MobileNumberInventory.reserved_by_customer_id == customer_id,
        MobileNumberInventory.reservation_expiry > now
    ).first()
    
    return record

@router.post("/reserve", response_model=MobileNumberOut)
def reserve_number(
    payload: NumberReserve,
    token_data: TokenData = Depends(get_current_user_role),
    db: Session = Depends(get_db)
):
    """
    Reserve a mobile number for 30 minutes.
    Locks the database record to prevent concurrent reservations.
    """
    customer_id = int(token_data.sub)
    now = datetime.now(timezone.utc)
    expiry = now + timedelta(minutes=30)
    
    # Lock the row
    num_record = db.query(MobileNumberInventory).filter(
        MobileNumberInventory.msisdn == payload.msisdn
    ).with_for_update().first()
    
    if not num_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mobile number not found in inventory."
        )
        
    # Check if currently reserved by another customer and NOT expired
    if num_record.status != "AVAILABLE":
        if num_record.status == "RESERVED" and num_record.reservation_expiry < now:
            # Reservation expired, we can take it
            pass
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This number has already been reserved."
            )
            
    num_record.status = "RESERVED"
    num_record.reserved_by_customer_id = customer_id
    num_record.reserved_at = now
    num_record.reservation_expiry = expiry
    
    db.commit()
    db.refresh(num_record)
    
    logger.info(
        f"Number {payload.msisdn} reserved by customer {customer_id}",
        extra={"event": "number_reserved", "msisdn": payload.msisdn, "customer_id": customer_id}
    )
    return num_record

@router.post("/release", response_model=MobileNumberOut)
def release_number(
    payload: NumberReserve,
    token_data: TokenData = Depends(get_current_user_role),
    db: Session = Depends(get_db)
):
    """
    Release a reserved mobile number.
    Only the customer who reserved it can release it.
    """
    customer_id = int(token_data.sub)
    
    num_record = db.query(MobileNumberInventory).filter(
        MobileNumberInventory.msisdn == payload.msisdn
    ).first()
    
    if not num_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mobile number not found."
        )
        
    if num_record.status == "RESERVED" and num_record.reserved_by_customer_id == customer_id:
        num_record.status = "AVAILABLE"
        num_record.reserved_by_customer_id = None
        num_record.reserved_at = None
        num_record.reservation_expiry = None
        db.commit()
        db.refresh(num_record)
        logger.info(
            f"Number {payload.msisdn} released by customer {customer_id}",
            extra={"event": "number_released", "msisdn": payload.msisdn, "customer_id": customer_id}
        )
        return num_record
        
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="You do not have an active reservation for this number."
    )


from pydantic import BaseModel

class ReservationVerify(BaseModel):
    msisdn: str
    customer_id: int

class AllocationRequest(BaseModel):
    msisdn: str
    customer_id: int
    order_id: str
    sim_id: int

from app.models.sim_inventory import SimInventory
from app.models.sim_assignment import SimAssignment

@router.post("/verify-reservation")
def verify_reservation(payload: ReservationVerify, db: Session = Depends(get_db)):
    """
    Verify if a mobile number is currently reserved by a customer.
    Called internally by Order Service.
    """
    now = datetime.now(timezone.utc)
    record = db.query(MobileNumberInventory).filter(
        MobileNumberInventory.msisdn == payload.msisdn
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Number not found")
        
    if record.status != "RESERVED" or record.reserved_by_customer_id != payload.customer_id:
        raise HTTPException(status_code=400, detail="Number is not reserved by this customer")
        
    if record.reservation_expiry and record.reservation_expiry < now:
        raise HTTPException(status_code=400, detail="Reservation has expired")
        
    return {"message": "Reservation is valid"}

@router.post("/allocate")
def allocate_number_to_sim(payload: AllocationRequest, db: Session = Depends(get_db)):
    """
    SIM Allocation - find an available SIM, link it to the selected MSISDN,
    and create a SimAssignment record.
    Called internally by Order Service.
    """
    # 1. Lock the number record
    now = datetime.now(timezone.utc)
    num_record = db.query(MobileNumberInventory).filter(
        MobileNumberInventory.msisdn == payload.msisdn
    ).with_for_update().first()
    
    if not num_record:
        raise HTTPException(status_code=404, detail="Number not found")
        
    # Allow allocation if reserved by this customer (and not expired) OR if status is AVAILABLE
    is_reserved_by_me = (
        num_record.status == "RESERVED" and 
        num_record.reserved_by_customer_id == payload.customer_id and
        (not num_record.reservation_expiry or num_record.reservation_expiry >= now)
    )
    is_available = (num_record.status == "AVAILABLE")
    
    if not (is_reserved_by_me or is_available):
        if num_record.status == "RESERVED" and num_record.reservation_expiry and num_record.reservation_expiry < now:
            raise HTTPException(status_code=400, detail="Reservation has expired")
        raise HTTPException(status_code=400, detail="Number is not reserved by this customer or is not available")
        
    # 2. Find available SIM in sim_inventory
    sim_item = db.query(SimInventory).filter(
        SimInventory.sim_id == payload.sim_id,
        SimInventory.status.in_(["AVAILABLE", "available"])
    ).with_for_update().first()
    
    if not sim_item:
        raise HTTPException(status_code=400, detail="No available physical SIM stock in inventory for this SIM product")
        
    # 3. Update SIM status to RESERVED
    sim_item.status = "RESERVED"
    
    # 4. Update Number status to ALLOCATED and reference the SIM inventory
    num_record.status = "ALLOCATED"
    num_record.inventory_id = sim_item.id
    
    # 5. Create SimAssignment
    db_assignment = SimAssignment(
        inventory_id=sim_item.id,
        customer_id=payload.customer_id,
        order_id=payload.order_id,
        msisdn=payload.msisdn,
        iccid=sim_item.iccid,
        imsi=sim_item.imsi,
        assignment_status="ALLOCATED"
    )
    db.add(db_assignment)
    db.commit()
    
    logger.info(
        f"SIM allocated to MSISDN {payload.msisdn}: ICCID={sim_item.iccid}",
        extra={"event": "sim_allocated", "msisdn": payload.msisdn, "iccid": sim_item.iccid}
    )
    return {"message": "SIM allocated successfully", "iccid": sim_item.iccid, "imsi": sim_item.imsi}
