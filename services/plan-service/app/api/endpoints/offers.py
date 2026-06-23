from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_admin, TokenData
from app.models.offer import Offer
from app.schemas.offer import OfferCreate, OfferUpdate, OfferOut

router = APIRouter()

@router.get("", response_model=List[OfferOut])
def list_offers(
    active_only: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Offer)
    if active_only is not None:
        query = query.filter(Offer.active == active_only)
    return query.all()

@router.get("/validate/{promo_code}", response_model=OfferOut)
def validate_promo(promo_code: str, db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.promo_code == promo_code, Offer.active == True).first()
    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Promo code is invalid or inactive"
        )
        
    # Check expiration if set
    if offer.expires_at:
        # Normalize timezone awareness
        expires_at = offer.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
            
        now = datetime.now(timezone.utc)
        if now > expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Promo code has expired"
            )
            
    return offer

@router.get("/{offer_id}", response_model=OfferOut)
def get_offer(offer_id: int, db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found"
        )
    return offer

@router.post("", response_model=OfferOut, status_code=status.HTTP_201_CREATED)
def create_offer(
    offer_in: OfferCreate,
    admin: TokenData = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Check unique promo_code
    existing = db.query(Offer).filter(Offer.promo_code == offer_in.promo_code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Offer with this promo code already exists"
        )
        
    db_offer = Offer(
        plan_id=offer_in.plan_id,
        promo_code=offer_in.promo_code,
        discount_percentage=offer_in.discount_percentage,
        active=offer_in.active,
        description=offer_in.description,
        expires_at=offer_in.expires_at
    )
    db.add(db_offer)
    db.commit()
    db.refresh(db_offer)
    return db_offer

@router.put("/{offer_id}", response_model=OfferOut)
def update_offer(
    offer_id: int,
    offer_in: OfferUpdate,
    admin: TokenData = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    db_offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not db_offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found"
        )
        
    update_data = offer_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_offer, field, value)
        
    db.add(db_offer)
    db.commit()
    db.refresh(db_offer)
    return db_offer

@router.delete("/{offer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_offer(
    offer_id: int,
    admin: TokenData = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    db_offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not db_offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found"
        )
    db.delete(db_offer)
    db.commit()
    return None
