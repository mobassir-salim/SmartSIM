import csv
import io
import random
import logging
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.api.deps import get_db, get_current_inventory_admin, TokenData
from app.models.sim_inventory import SimInventory
from app.models.sim_assignment import SimAssignment
from app.models.mobile_number_inventory import MobileNumberInventory
from app.schemas.inventory import (
    InventoryOut, InventoryDashboard, InventoryUploadResponse,
    AssignmentCreate, AssignmentOut
)

router = APIRouter()
logger = logging.getLogger("sim-service")


def generate_msisdn(db: Session) -> str:
    """Generate a unique 10-digit Indian mobile number starting with 9."""
    while True:
        msisdn = "9" + "".join([str(random.randint(0, 9)) for _ in range(9)])
        if not db.query(SimAssignment).filter(SimAssignment.msisdn == msisdn).first():
            return msisdn


@router.get("", response_model=InventoryDashboard)
def inventory_dashboard(
    admin: TokenData = Depends(get_current_inventory_admin),
    db: Session = Depends(get_db)
):
    """Get inventory status counts for the dashboard."""
    total = db.query(SimInventory).count()
    available = db.query(SimInventory).filter(SimInventory.status.in_(["AVAILABLE", "available"])).count()
    reserved = db.query(SimInventory).filter(SimInventory.status.in_(["RESERVED", "assigned"])).count()
    activated = db.query(SimInventory).filter(SimInventory.status == "ACTIVATED").count()
    blocked = db.query(SimInventory).filter(SimInventory.status == "BLOCKED").count()
    lost = db.query(SimInventory).filter(SimInventory.status == "LOST").count()
    
    logger.info("Inventory dashboard accessed", extra={"event": "inventory_dashboard"})
    return InventoryDashboard(
        total=total, available=available, reserved=reserved,
        activated=activated, blocked=blocked, lost=lost
    )


@router.post("/upload", response_model=InventoryUploadResponse)
async def upload_inventory(
    file: UploadFile = File(...),
    admin: TokenData = Depends(get_current_inventory_admin),
    db: Session = Depends(get_db)
):
    """
    Bulk upload SIM inventory via CSV file.
    Expected CSV format: ICCID,IMSI,SIM_TYPE,CIRCLE
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are accepted"
        )
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.reader(io.StringIO(decoded))
    
    uploaded = 0
    duplicates = 0
    errors = 0
    now = datetime.now(timezone.utc)
    
    for row_num, row in enumerate(reader):
        if row_num == 0 and row[0].upper().strip() in ('ICCID', 'ID'):
            continue
        
        if len(row) < 4:
            errors += 1
            continue
        
        iccid = row[0].strip()
        imsi = row[1].strip()
        sim_type = row[2].strip().upper()
        circle = row[3].strip().upper()
        
        if not iccid or not imsi:
            errors += 1
            continue
        
        existing = db.query(SimInventory).filter(
            or_(SimInventory.iccid == iccid, SimInventory.imsi == imsi)
        ).first()
        if existing:
            duplicates += 1
            continue
        
        db_item = SimInventory(
            sim_id=1,
            iccid=iccid,
            imsi=imsi,
            sim_type=sim_type,
            circle=circle,
            status="AVAILABLE",
            uploaded_at=now
        )
        db.add(db_item)
        uploaded += 1
    
    db.commit()
    
    logger.info(
        f"Inventory bulk upload: {uploaded} uploaded, {duplicates} duplicates, {errors} errors",
        extra={"event": "inventory_upload", "uploaded": uploaded, "duplicates": duplicates, "errors": errors}
    )
    
    return InventoryUploadResponse(
        uploaded=uploaded, duplicates=duplicates, errors=errors,
        message=f"Successfully uploaded {uploaded} SIM records."
    )


@router.post("/numbers/upload", response_model=InventoryUploadResponse)
async def upload_numbers(
    file: UploadFile = File(...),
    admin: TokenData = Depends(get_current_inventory_admin),
    db: Session = Depends(get_db)
):
    """
    Bulk upload mobile numbers via CSV file.
    Expected CSV format: MSISDN,CIRCLE,OPERATOR,CATEGORY
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are accepted"
        )
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.reader(io.StringIO(decoded))
    
    uploaded = 0
    duplicates = 0
    errors = 0
    
    for row_num, row in enumerate(reader):
        if row_num == 0 and row[0].upper().strip() in ('MSISDN', 'NUMBER'):
            continue
        
        if len(row) < 4:
            errors += 1
            continue
        
        msisdn = row[0].strip()
        circle = row[1].strip().upper()
        operator = row[2].strip()
        category = row[3].strip().capitalize() # Regular, Premium, VIP
        
        if not msisdn or not circle:
            errors += 1
            continue
        
        existing = db.query(MobileNumberInventory).filter(
            MobileNumberInventory.msisdn == msisdn
        ).first()
        if existing:
            duplicates += 1
            continue
        
        db_item = MobileNumberInventory(
            msisdn=msisdn,
            circle=circle,
            operator=operator,
            category=category,
            status="AVAILABLE"
        )
        db.add(db_item)
        uploaded += 1
    
    db.commit()
    
    logger.info(
        f"Number inventory bulk upload: {uploaded} uploaded, {duplicates} duplicates, {errors} errors",
        extra={"event": "numbers_upload", "uploaded": uploaded, "duplicates": duplicates, "errors": errors}
    )
    
    return InventoryUploadResponse(
        uploaded=uploaded, duplicates=duplicates, errors=errors,
        message=f"Successfully uploaded {uploaded} mobile numbers."
    )


@router.get("/search", response_model=List[InventoryOut])
def search_inventory(
    iccid: Optional[str] = Query(None),
    imsi: Optional[str] = Query(None),
    msisdn: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    circle: Optional[str] = Query(None),
    sim_type: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    admin: TokenData = Depends(get_current_inventory_admin),
    db: Session = Depends(get_db)
):
    """Search inventory by ICCID, IMSI, MSISDN, status, circle, or sim_type."""
    query = db.query(SimInventory)
    
    if iccid:
        query = query.filter(SimInventory.iccid.ilike(f"%{iccid}%"))
    if imsi:
        query = query.filter(SimInventory.imsi.ilike(f"%{imsi}%"))
    if status_filter:
        query = query.filter(SimInventory.status == status_filter.upper())
    if circle:
        query = query.filter(SimInventory.circle == circle.upper())
    if sim_type:
        query = query.filter(SimInventory.sim_type == sim_type.upper())
    
    if msisdn:
        assignment = db.query(SimAssignment).filter(
            SimAssignment.msisdn.ilike(f"%{msisdn}%")
        ).first()
        if assignment:
            query = query.filter(SimInventory.id == assignment.inventory_id)
        else:
            return []
    
    results = query.order_by(SimInventory.id.desc()).limit(limit).all()
    logger.info("Inventory search performed", extra={"event": "inventory_search", "results": len(results)})
    return results


@router.post("/assign", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
def assign_sim(
    assignment_in: AssignmentCreate,
    admin: TokenData = Depends(get_current_inventory_admin),
    db: Session = Depends(get_db)
):
    """
    Assign a SIM from inventory to a customer.
    Steps: Find AVAILABLE -> Lock/Reserve -> Generate MSISDN -> Create Assignment -> Update Status.
    """
    inv_item = db.query(SimInventory).filter(
        SimInventory.id == assignment_in.inventory_id
    ).first()
    if not inv_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    
    if inv_item.status not in ("AVAILABLE", "available"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"SIM is not available for assignment. Current status: {inv_item.status}"
        )
    
    inv_item.status = "RESERVED"
    msisdn = generate_msisdn(db)
    
    db_assignment = SimAssignment(
        inventory_id=assignment_in.inventory_id,
        customer_id=assignment_in.customer_id,
        order_id=assignment_in.order_id,
        msisdn=msisdn
    )
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    
    logger.info(
        f"SIM assigned to customer {assignment_in.customer_id}",
        extra={
            "event": "sim_assigned",
            "inventory_id": assignment_in.inventory_id,
            "customer_id": assignment_in.customer_id,
            "msisdn": msisdn
        }
    )
    
    return db_assignment
