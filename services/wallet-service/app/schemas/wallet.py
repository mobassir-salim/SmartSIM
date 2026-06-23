from decimal import Decimal
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.wallet import TransactionType, TransactionStatus


# ---- Wallet Schemas ----

class WalletResponse(BaseModel):
    id: str
    user_id: str
    balance: Decimal
    currency: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---- Transaction Schemas ----

class AddMoneyRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, description="Amount to add (must be positive)")
    description: Optional[str] = Field(None, max_length=255)
    reference_id: Optional[str] = None


class DebitRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, description="Amount to debit (must be positive)")
    description: Optional[str] = Field(None, max_length=255)
    reference_id: Optional[str] = None


class TransactionResponse(BaseModel):
    id: str
    wallet_id: str
    transaction_type: TransactionType
    amount: Decimal
    description: Optional[str]
    reference_id: Optional[str]
    status: TransactionStatus
    created_at: datetime

    class Config:
        from_attributes = True


class TransactionListResponse(BaseModel):
    transactions: List[TransactionResponse]
    total: int
