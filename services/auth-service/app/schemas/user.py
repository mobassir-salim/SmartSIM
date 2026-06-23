from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional

# Shared properties
class UserBase(BaseModel):
    name: str
    email: EmailStr
    mobile: str
    role: Optional[str] = "customer"

# Properties to receive on user creation
class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters long")

# Properties to return to client
class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Login request schema
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Token schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

# Token payload schema
class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    type: Optional[str] = None

# Refresh token request schema
class RefreshTokenRequest(BaseModel):
    refresh_token: str

# OTP Verification schema
class OTPVerify(BaseModel):
    email: EmailStr
    code: str
    purpose: str = "activation"  # 'activation' or 'reset'

# Forgot password request schema
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

# Reset password request schema
class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str = Field(..., min_length=6, description="New password must be at least 6 characters long")

# Resend OTP Request schema
class ResendOTPRequest(BaseModel):
    email: EmailStr
    purpose: str



