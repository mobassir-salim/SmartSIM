import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base


class TransactionType(str, enum.Enum):
    CREDIT = "CREDIT"
    DEBIT = "DEBIT"


class TransactionStatus(str, enum.Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    PENDING = "PENDING"


class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, unique=True, nullable=False, index=True)
    balance = Column(Numeric(precision=12, scale=2), default=0.00, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to transactions
    transactions = relationship("WalletTransaction", back_populates="wallet", cascade="all, delete-orphan")


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    wallet_id = Column(String, ForeignKey("wallets.id"), nullable=False, index=True)
    transaction_type = Column(SAEnum(TransactionType), nullable=False)
    amount = Column(Numeric(precision=12, scale=2), nullable=False)
    description = Column(String(255), nullable=True)
    reference_id = Column(String, nullable=True)  # e.g. order ID
    status = Column(SAEnum(TransactionStatus), default=TransactionStatus.SUCCESS, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship back to wallet
    wallet = relationship("Wallet", back_populates="transactions")
