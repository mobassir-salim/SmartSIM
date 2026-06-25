import random
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user_role, get_current_admin, TokenData
from app.models.sim import Sim
from app.models.sim_inventory import SimInventory
from app.schemas.sim import SimCreate, SimUpdate, SimOut, SimInventoryOut, SimAvailability

router = APIRouter()

logger = logging.getLogger("sim-service")

# ─── Helpers ──────────────────────────────────────────────────────────────────

def generate_dummy_inventory(db: Session, sim_id: int, prefix: str, count: int = 5):
    """Seed dummy ICCID inventory records when a SIM product is created."""
    for _ in range(count):
        suffix = "".join([str(random.randint(0, 9)) for _ in range(15)])
        iccid = f"{prefix}{suffix}"
        while db.query(SimInventory).filter(SimInventory.iccid == iccid).first():
            suffix = "".join([str(random.randint(0, 9)) for _ in range(15)])
            iccid = f"{prefix}{suffix}"
        db_inventory = SimInventory(sim_id=sim_id, iccid=iccid, status="available")
        db.add(db_inventory)
    db.commit()
    logger.info("SIM inventory updated", extra={"event": "inventory_updated", "sim_id": sim_id})


def enrich_sim_with_stock(sim: Sim, db: Session) -> SimOut:
    """Attach available_stock count to a SimOut response."""
    available_stock = db.query(SimInventory).filter(
        SimInventory.sim_id == sim.id,
        SimInventory.status == "available"
    ).count()
    out = SimOut.model_validate(sim)
    out.available_stock = available_stock
    return out


# ─── Health ───────────────────────────────────────────────────────────────────

@router.get("/health")
def sims_health():
    return {"status": "UP"}


# ─── SIM Inventory (public) ───────────────────────────────────────────────────

@router.get("", response_model=List[SimOut])
def list_sims(
    type: Optional[str] = None,
    search: Optional[str] = None,
    include_inactive: Optional[bool] = False,
    db: Session = Depends(get_db)
):
    """
    SIM Inventory — list all SIM products.
    - Supports filtering by type and keyword search (SIM Search).
    - By default only active SIMs are returned (SIM Status).
    - Pass include_inactive=true (admin use) to see all.
    """
    logger.info("SIM search queried", extra={"event": "sim_search"})
    query = db.query(Sim)
    if not include_inactive:
        query = query.filter(Sim.is_active == True)
    if type:
        query = query.filter(Sim.type == type)
    if search:
        query = query.filter(
            Sim.name.ilike(f"%{search}%") | Sim.description.ilike(f"%{search}%")
        )
    sims = query.all()
    return [enrich_sim_with_stock(s, db) for s in sims]


@router.get("/assignments")
def get_customer_assignments(
    token_data: TokenData = Depends(get_current_user_role),
    db: Session = Depends(get_db)
):
    """
    Get all active SIM assignments for the authenticated customer.
    """
    from app.models.sim_assignment import SimAssignment
    customer_id = int(token_data.sub)
    assignments = db.query(SimAssignment).filter(
        SimAssignment.customer_id == customer_id
    ).all()
    
    result = []
    for a in assignments:
        result.append({
            "id": a.id,
            "msisdn": a.msisdn,
            "iccid": a.iccid,
            "imsi": a.imsi,
            "assignment_status": a.assignment_status,
            "assigned_at": a.assigned_at
        })
    return result


@router.get("/{sim_id}", response_model=SimOut)
def get_sim(sim_id: int, db: Session = Depends(get_db)):
    """Get a single SIM with its current available_stock count (SIM Availability)."""
    sim = db.query(Sim).filter(Sim.id == sim_id).first()
    if not sim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SIM not found")
    return enrich_sim_with_stock(sim, db)


# ─── SIM Availability (dedicated endpoint) ────────────────────────────────────

@router.get("/{sim_id}/availability", response_model=SimAvailability)
def get_sim_availability(sim_id: int, db: Session = Depends(get_db)):
    """
    SIM Availability — returns a full stock breakdown for a SIM product:
    available, assigned, and total inventory units.
    """
    sim = db.query(Sim).filter(Sim.id == sim_id).first()
    if not sim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SIM not found")

    available = db.query(SimInventory).filter(
        SimInventory.sim_id == sim_id, SimInventory.status == "available"
    ).count()
    assigned = db.query(SimInventory).filter(
        SimInventory.sim_id == sim_id, SimInventory.status == "assigned"
    ).count()
    total = db.query(SimInventory).filter(SimInventory.sim_id == sim_id).count()

    logger.info(
        "SIM availability checked",
        extra={"event": "sim_availability_check", "sim_id": sim_id, "available": available}
    )
    return SimAvailability(
        sim_id=sim.id,
        name=sim.name,
        is_active=sim.is_active,
        available_stock=available,
        assigned_stock=assigned,
        total_stock=total,
    )


# ─── Admin CRUD ───────────────────────────────────────────────────────────────

@router.post("", response_model=SimOut, status_code=status.HTTP_201_CREATED)
def create_sim(
    sim_in: SimCreate,
    admin: TokenData = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    db_sim = Sim(
        name=sim_in.name,
        type=sim_in.type,
        price=sim_in.price,
        description=sim_in.description,
        iccid_prefix=sim_in.iccid_prefix,
        is_active=True,
    )
    db.add(db_sim)
    db.commit()
    db.refresh(db_sim)
    generate_dummy_inventory(db, db_sim.id, db_sim.iccid_prefix)
    logger.info("SIM created", extra={"event": "sim_created", "sim_id": db_sim.id})
    return enrich_sim_with_stock(db_sim, db)


@router.put("/{sim_id}", response_model=SimOut)
def update_sim(
    sim_id: int,
    sim_in: SimUpdate,
    admin: TokenData = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    db_sim = db.query(Sim).filter(Sim.id == sim_id).first()
    if not db_sim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SIM not found")
    update_data = sim_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_sim, field, value)
    db.add(db_sim)
    db.commit()
    db.refresh(db_sim)
    return enrich_sim_with_stock(db_sim, db)


@router.delete("/{sim_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sim(
    sim_id: int,
    admin: TokenData = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    db_sim = db.query(Sim).filter(Sim.id == sim_id).first()
    if not db_sim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SIM not found")
    db.delete(db_sim)
    db.commit()
    return None


# ─── SIM Status — Activate / Deactivate ──────────────────────────────────────

@router.post("/{sim_id}/activate", response_model=SimOut, summary="Activate a SIM product")
def activate_sim(
    sim_id: int,
    admin: TokenData = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """SIM Status — mark a SIM product as active so it appears in the public catalog."""
    db_sim = db.query(Sim).filter(Sim.id == sim_id).first()
    if not db_sim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SIM not found")
    db_sim.is_active = True
    db.commit()
    db.refresh(db_sim)
    logger.info("SIM activated", extra={"event": "sim_status_changed", "sim_id": sim_id, "status": "active"})
    return enrich_sim_with_stock(db_sim, db)


@router.post("/{sim_id}/deactivate", response_model=SimOut, summary="Deactivate a SIM product")
def deactivate_sim(
    sim_id: int,
    admin: TokenData = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """SIM Status — mark a SIM product as inactive so it is hidden from the public catalog."""
    db_sim = db.query(Sim).filter(Sim.id == sim_id).first()
    if not db_sim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SIM not found")
    db_sim.is_active = False
    db.commit()
    db.refresh(db_sim)
    logger.info("SIM deactivated", extra={"event": "sim_status_changed", "sim_id": sim_id, "status": "inactive"})
    return enrich_sim_with_stock(db_sim, db)


# ─── Admin — Inventory detail view ───────────────────────────────────────────

@router.get("/{sim_id}/inventory", response_model=List[SimInventoryOut])
def get_sim_inventory(
    sim_id: int,
    admin: TokenData = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin-only — view raw ICCID inventory records for a SIM."""
    return db.query(SimInventory).filter(SimInventory.sim_id == sim_id).all()


# ─── Purchase (called internally by Order Service) ────────────────────────────

@router.post("/{sim_id}/purchase", response_model=SimOut, summary="Purchase a SIM")
def purchase_sim(sim_id: int, db: Session = Depends(get_db)):
    """
    Assign the next available ICCID inventory slot for this SIM to a customer.
    Called by the Order Service during checkout.
    """
    sim = db.query(Sim).filter(Sim.id == sim_id).first()
    if not sim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SIM not found")
    if not sim.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SIM is not currently active")
    
    # Support both case-sensitive AVAILABLE and legacy available status
    inventory_item = db.query(SimInventory).filter(
        SimInventory.sim_id == sim_id,
        SimInventory.status.in_(["AVAILABLE", "available"])
    ).first()
    
    if not inventory_item:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No available stock for this SIM")
    
    # Mark as RESERVED to follow Module 1 specs
    inventory_item.status = "RESERVED"
    db.commit()
    logger.info("SIM purchased", extra={"event": "sim_purchase", "sim_id": sim_id})
    logger.info("SIM inventory updated", extra={"event": "inventory_updated", "sim_id": sim_id})
    return enrich_sim_with_stock(sim, db)
