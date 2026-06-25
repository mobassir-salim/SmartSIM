import httpx
import logging
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.api.deps import get_current_token_and_user, get_current_user_role, TokenData
from app.models.order import Order, OrderItem, OrderStatus, OrderItemType
from app.schemas.order import (
    OrderCreate,
    OrderResponse,
    OrderListResponse,
)

router = APIRouter()

logger = logging.getLogger("order-service")


@router.get("/health", summary="Order service health check")
def orders_health():
    return {"status": "UP", "service": "order-service"}


@router.post("/cart", summary="Update cart (dummy endpoint for logging)")
def update_cart(
    token_and_user: tuple = Depends(get_current_token_and_user),
):
    _, current_user = token_and_user
    user_id = str(current_user.sub)
    logger.info("Cart updated", extra={"event": "cart_updates", "user_id": user_id})
    return {"message": "Cart updated successfully"}


# -------------------------
# POST /api/orders (Create Order)
# -------------------------
@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED, summary="Place a new order")
def create_order(
    body: OrderCreate,
    token_and_user: tuple = Depends(get_current_token_and_user),
    db: Session = Depends(get_db),
):
    """
    Create a new order:
    1. Verify items exist and fetch their prices (via SIM / Plan Service).
    2. Save order as PENDING.
    3. Call Wallet Service to debit user's account.
    4. Update status to CONFIRMED or FAILED depending on payment outcome.
    """
    token, current_user = token_and_user
    user_id = str(current_user.sub)

    # 1. Fetch prices and verify inventory
    total_amount = Decimal("0.00")
    order_items_to_create = []

    for item in body.items:
        item_id_str = item.item_id
        item_qty = item.quantity

        if item.item_type == OrderItemType.SIM:
            # Query SIM Service
            sim_url = f"{settings.SIM_SERVICE_URL}/api/sims/{item_id_str}"
            try:
                with httpx.Client(timeout=5.0) as client:
                    response = client.get(sim_url)
                if response.status_code == 404:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"SIM with ID {item_id_str} does not exist."
                    )
                response.raise_for_status()
                sim_data = response.json()
                price = Decimal(str(sim_data["price"]))
                name = sim_data["name"]
            except httpx.HTTPError as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Error connecting to SIM service: {str(exc)}"
                )
        elif item.item_type == OrderItemType.PLAN:
            # Query Plan Service
            plan_url = f"{settings.PLAN_SERVICE_URL}/api/plans/{item_id_str}"
            try:
                with httpx.Client(timeout=5.0) as client:
                    response = client.get(plan_url)
                if response.status_code == 404:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Plan with ID {item_id_str} does not exist."
                    )
                response.raise_for_status()
                plan_data = response.json()
                price = Decimal(str(plan_data["price"]))
                name = plan_data["name"]
            except httpx.HTTPError as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Error connecting to Plan service: {str(exc)}"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid item type: {item.item_type}"
            )

        unit_total = price * item_qty
        total_amount += unit_total

        order_items_to_create.append(
            OrderItem(
                item_type=item.item_type,
                item_id=item_id_str,
                item_name=name,
                quantity=item_qty,
                unit_price=price,
            )
        )

    # 2. Create the Order with PENDING status
    db_order = Order(
        user_id=user_id,
        status=OrderStatus.PENDING,
        total_amount=total_amount,
    )
    db.add(db_order)
    db.flush()  # Generate db_order.id

    for order_item in order_items_to_create:
        order_item.order_id = db_order.id
        db.add(order_item)

    db.commit()
    db.refresh(db_order)

    logger.info("Order created successfully", extra={"event": "order_created", "order_id": db_order.id, "user_id": user_id})

    # Run the journey lifecycle sequential steps
    from app.core.lifecycle import execute_order_lifecycle
    success = execute_order_lifecycle(db, db_order, token)
    
    if not success:
        # Retrieve the failed journey step to raise the correct error details
        from app.models.order_journey import OrderJourney
        failed_step = db.query(OrderJourney).filter(
            OrderJourney.order_id == db_order.id,
            OrderJourney.status == "FAILED"
        ).order_by(OrderJourney.id.desc()).first()
        err_msg = failed_step.error_message if failed_step else "Checkout failed."
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Checkout step failed. Reason: {err_msg}"
        )

    return db_order


# -------------------------
# GET /api/orders (List Orders)
# -------------------------
@router.get("", response_model=OrderListResponse, summary="List my orders")
def list_orders(
    token_and_user: tuple = Depends(get_current_token_and_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """Retrieve list of orders for the authenticated user."""
    _, current_user = token_and_user
    user_id = str(current_user.sub)

    # Admins can see all orders? Plan says "Admin Pages: Orders Management".
    # Let's check user role. If admin, we list all orders or let them filter.
    # For now, let's allow admins to see all, customers see their own.
    query = db.query(Order)
    if current_user.role != "admin":
        query = query.filter(Order.user_id == user_id)
        
    query = query.order_by(Order.created_at.desc())
    total = query.count()
    orders = query.offset(skip).limit(limit).all()

    return OrderListResponse(orders=orders, total=total)


# -------------------------
# GET /api/orders/{id} (Retrieve Order)
# -------------------------
@router.get("/{order_id}", response_model=OrderResponse, summary="Get order details")
def get_order(
    order_id: str,
    token_and_user: tuple = Depends(get_current_token_and_user),
    db: Session = Depends(get_db),
):
    """Retrieve order details by ID. Users can only view their own orders unless they are admins."""
    _, current_user = token_and_user
    user_id = str(current_user.sub)

    db_order = db.query(Order).filter(Order.id == order_id).first()
    if not db_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Permission check
    if current_user.role != "admin" and db_order.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this order"
        )

    return db_order
