import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_admin, TokenData
from app.models.plan import Plan
from app.schemas.plan import PlanCreate, PlanUpdate, PlanOut

router = APIRouter()

logger = logging.getLogger("plan-service")

@router.get("/health")
def plans_health():
    return {"status": "UP"}

@router.get("", response_model=List[PlanOut])
def list_plans(
    type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    logger.info("Plans queried", extra={"event": "plan_queries"})
    query = db.query(Plan)
    if type:
        query = query.filter(Plan.type == type)
    if search:
        query = query.filter(
            Plan.name.ilike(f"%{search}%") | Plan.description.ilike(f"%{search}%")
        )
    return query.all()

@router.get("/{plan_id}", response_model=PlanOut)
def get_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    return plan

@router.post("", response_model=PlanOut, status_code=status.HTTP_201_CREATED)
def create_plan(
    plan_in: PlanCreate,
    admin: TokenData = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    db_plan = Plan(
        name=plan_in.name,
        price=plan_in.price,
        data_gb=plan_in.data_gb,
        validity_days=plan_in.validity_days,
        type=plan_in.type,
        description=plan_in.description
    )
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan

@router.put("/{plan_id}", response_model=PlanOut)
def update_plan(
    plan_id: int,
    plan_in: PlanUpdate,
    admin: TokenData = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    db_plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not db_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
        
    update_data = plan_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_plan, field, value)
        
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    logger.info("Plan updated", extra={"event": "plan_updated", "plan_id": plan_id})
    return db_plan

@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(
    plan_id: int,
    admin: TokenData = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    db_plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not db_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    db.delete(db_plan)
    db.commit()
    return None


import csv
import io

@router.post("/bulk-upload", response_model=List[PlanOut], summary="Bulk upload Plan products catalogue via CSV")
async def bulk_upload_plans(
    file: UploadFile = File(...),
    admin: TokenData = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Bulk upload Plan products catalogue via CSV file.
    Expected CSV columns: name, price, data_gb, validity_days, type, description
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are accepted"
        )
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.reader(io.StringIO(decoded))
    
    created_plans = []
    
    for row_num, row in enumerate(reader):
        if row_num == 0 and any(col.lower().strip() in ('name', 'price', 'type') for col in row):
            continue
            
        if len(row) < 6:
            continue
            
        name = row[0].strip()
        try:
            price = float(row[1].strip())
            data_gb = int(row[2].strip())
            validity_days = int(row[3].strip())
        except ValueError:
            continue
        plan_type = row[4].strip().lower()
        description = row[5].strip() if row[5].strip() else None
        
        if not name or not plan_type:
            continue
            
        db_plan = Plan(
            name=name,
            price=price,
            data_gb=data_gb,
            validity_days=validity_days,
            type=plan_type,
            description=description
        )
        db.add(db_plan)
        db.commit()
        db.refresh(db_plan)
        
        created_plans.append(db_plan)
        
    logger.info(f"Bulk uploaded {len(created_plans)} Plan products.")
    return created_plans
