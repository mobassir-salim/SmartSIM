from decimal import Decimal
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.wallet import Wallet, WalletTransaction, TransactionType, TransactionStatus
from app.schemas.wallet import (
    WalletResponse,
    AddMoneyRequest,
    DebitRequest,
    TransactionResponse,
    TransactionListResponse,
)

router = APIRouter()

logger = logging.getLogger("wallet-service")


@router.get("/health", summary="Wallet service health check")
def wallet_health():
    return {"status": "UP", "service": "wallet-service"}


def _get_or_create_wallet(user_id: str, db: Session) -> Wallet:
    """Get wallet for user, auto-creating it if it doesn't exist."""
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if not wallet:
        wallet = Wallet(user_id=user_id, balance=Decimal("0.00"))
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
    return wallet


# -------------------------
# GET /api/wallet
# -------------------------
@router.get("", response_model=WalletResponse, summary="Get my wallet")
def get_wallet(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return wallet balance for the authenticated user. Auto-creates wallet on first access."""
    user_id = str(current_user.get("sub") or current_user.get("user_id"))
    wallet = _get_or_create_wallet(user_id, db)
    return wallet


# -------------------------
# POST /api/wallet/add-money
# -------------------------
@router.post("/add-money", response_model=WalletResponse, summary="Add money to wallet")
def add_money(
    body: AddMoneyRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Credit the wallet with the given amount and record a CREDIT transaction."""
    user_id = str(current_user.get("sub") or current_user.get("user_id"))
    wallet = _get_or_create_wallet(user_id, db)

    wallet.balance = Decimal(str(wallet.balance)) + body.amount

    txn = WalletTransaction(
        wallet_id=wallet.id,
        transaction_type=TransactionType.CREDIT,
        amount=body.amount,
        description=body.description or "Wallet top-up",
        reference_id=body.reference_id,
        status=TransactionStatus.SUCCESS,
    )
    db.add(txn)
    db.commit()
    db.refresh(wallet)

    logger.info("Wallet credited successfully", extra={"event": "wallet_credited", "user_id": user_id, "amount": float(body.amount)})

    try:
        from app.core.rabbitmq import publish_event
        publish_event("WalletCredited", {"user_id": user_id, "amount": float(body.amount)})
    except Exception:
        pass

    return wallet


# -------------------------
# POST /api/wallet/debit
# -------------------------
@router.post("/debit", response_model=WalletResponse, summary="Debit money from wallet")
def debit_wallet(
    body: DebitRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Debit the wallet. Returns 402 if balance is insufficient."""
    user_id = str(current_user.get("sub") or current_user.get("user_id"))
    wallet = _get_or_create_wallet(user_id, db)

    current_balance = Decimal(str(wallet.balance))
    if current_balance < body.amount:
        # Record a failed transaction
        txn = WalletTransaction(
            wallet_id=wallet.id,
            transaction_type=TransactionType.DEBIT,
            amount=body.amount,
            description=body.description or "Debit attempt",
            reference_id=body.reference_id,
            status=TransactionStatus.FAILED,
        )
        db.add(txn)
        db.commit()
        logger.error("Wallet debit failed due to insufficient funds", extra={"event": "wallet_deduction_failure", "user_id": user_id, "amount": float(body.amount)})
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient balance. Available: {current_balance}, Required: {body.amount}",
        )

    wallet.balance = current_balance - body.amount

    txn = WalletTransaction(
        wallet_id=wallet.id,
        transaction_type=TransactionType.DEBIT,
        amount=body.amount,
        description=body.description or "Wallet debit",
        reference_id=body.reference_id,
        status=TransactionStatus.SUCCESS,
    )
    db.add(txn)
    db.commit()
    db.refresh(wallet)
    logger.info("Wallet debited successfully", extra={"event": "wallet_debited", "user_id": user_id, "amount": float(body.amount)})
    return wallet


# -------------------------
# GET /api/wallet/transactions
# -------------------------
@router.get("/transactions", response_model=TransactionListResponse, summary="Get transaction history")
def get_transactions(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """Return paginated transaction history for the authenticated user's wallet."""
    user_id = str(current_user.get("sub") or current_user.get("user_id"))
    wallet = _get_or_create_wallet(user_id, db)

    query = (
        db.query(WalletTransaction)
        .filter(WalletTransaction.wallet_id == wallet.id)
        .order_by(WalletTransaction.created_at.desc())
    )
    total = query.count()
    transactions = query.offset(skip).limit(limit).all()

    return TransactionListResponse(transactions=transactions, total=total)
