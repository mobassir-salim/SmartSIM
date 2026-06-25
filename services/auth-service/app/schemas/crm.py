from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class CustomerBasicInfo(BaseModel):
    id: int
    name: str
    email: EmailStr
    mobile: str
    role: str
    is_active: bool
    created_at: datetime
    address: Optional[str] = None
    notes: Optional[str] = None
    profile_status: Optional[str] = "ACTIVE"


class CustomerSIMInfo(BaseModel):
    msisdn: str
    iccid: str
    imsi: Optional[str] = None
    status: str
    activated_at: datetime


class CustomerPlanInfo(BaseModel):
    plan_id: int
    plan_name: str
    activated_at: datetime
    expires_at: Optional[datetime] = None
    status: str


class CustomerWalletInfo(BaseModel):
    balance: float
    currency: str
    transactions: List[dict] = []


class CustomerOrderInfo(BaseModel):
    id: str
    status: str
    total_amount: float
    created_at: datetime
    items: List[dict] = []


class CustomerProfileOut(BaseModel):
    basic_info: CustomerBasicInfo
    sim_info: List[CustomerSIMInfo] = []
    plan_info: List[CustomerPlanInfo] = []
    wallet_info: Optional[CustomerWalletInfo] = None
    order_info: List[CustomerOrderInfo] = []


class CustomerUpdate(BaseModel):
    customer_id: int
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
