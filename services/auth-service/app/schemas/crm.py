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
    father_name: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    alternate_mobile: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[str] = None
    country: Optional[str] = None
    id_type: Optional[str] = None
    id_number: Optional[str] = None
    id_issue_date: Optional[str] = None
    id_expiry_date: Optional[str] = None
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
    father_name: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    alternate_mobile: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[str] = None
    country: Optional[str] = None
    id_type: Optional[str] = None
    id_number: Optional[str] = None
    id_issue_date: Optional[str] = None
    id_expiry_date: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
