import random
import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, get_current_admin_user
from app.core.config import settings
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token
from app.models.user import User
from app.models.otp import OTPCode
from app.schemas.user import (
    UserCreate, UserOut, UserLogin, Token, RefreshTokenRequest, TokenPayload,
    OTPVerify, ForgotPasswordRequest, ResetPasswordRequest, ResendOTPRequest
)

router = APIRouter()

logger = logging.getLogger("auth-service")

@router.get("/health")
def auth_health():
    return {"status": "UP"}

@router.post("/resend-otp")
def resend_otp(request: ResendOTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    # Generate and print OTP
    create_and_print_otp(db, request.email, request.purpose)
    return {"message": "OTP has been resent successfully."}

def create_and_print_otp(db: Session, email: str, purpose: str) -> str:
    # Delete any existing OTP codes for this email and purpose to avoid bloat
    db.query(OTPCode).filter(OTPCode.email == email, OTPCode.purpose == purpose).delete()
    
    # Generate random 6-digit code
    otp_code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    db_otp = OTPCode(
        email=email,
        code=otp_code,
        purpose=purpose,
        expires_at=expires_at
    )
    db.add(db_otp)
    db.commit()
    
    # Print the OTP to terminal logs
    border = "=" * 50
    print(f"\n{border}")
    print(f"[{purpose.upper()}] OTP CODE FOR {email}: {otp_code}")
    print(f"Expires in 10 minutes")
    print(f"{border}\n")
    
    # Send to centralized logging (Kibana)
    logger.info(f"[{purpose.upper()}] OTP CODE FOR {email}: {otp_code}", extra={
        "event": "otp_created",
        "email": email,
        "purpose": purpose
    })

    try:
        from app.core.rabbitmq import publish_event
        publish_event("OTPCreated", {"email": email, "otp": otp_code, "purpose": purpose})
    except Exception as e:
        logger.warning(f"Failed to publish OTPCreated event to RabbitMQ: {e}")
    
    return otp_code

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user with same email exists
    user_by_email = db.query(User).filter(User.email == user_in.email).first()
    if user_by_email:
        # Check if user exists but is not active (was never activated via OTP)
        # We can let them re-register or trigger OTP. Let's delete the old inactive record to restart registration.
        if not user_by_email.is_active:
            db.delete(user_by_email)
            db.commit()
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists."
            )
    
    # Check if user with same mobile exists
    user_by_mobile = db.query(User).filter(User.mobile == user_in.mobile).first()
    if user_by_mobile:
        if not user_by_mobile.is_active:
            db.delete(user_by_mobile)
            db.commit()
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this mobile number already exists."
            )
    
    # Create the user (defaults to is_active=False)
    hashed_password = get_password_hash(user_in.password)
    db_user = User(
        name=user_in.name,
        email=user_in.email,
        mobile=user_in.mobile,
        password_hash=hashed_password,
        role=user_in.role,
        is_active=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    logger.info("User registered successfully", extra={"event": "user_registered", "email": db_user.email, "user_id": db_user.id})

    # Generate and print OTP for account activation
    create_and_print_otp(db, db_user.email, "activation")
    
    return db_user

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        logger.warning("User login failed", extra={"event": "login_failure", "email": login_data.email})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    
    # Ensure user is activated
    if not user.is_active:
        # Re-send activation OTP just in case
        create_and_print_otp(db, user.email, "activation")
        logger.warning("User login failed", extra={"event": "login_failure", "email": login_data.email})
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not activated. Please verify the OTP sent to your email."
        )
    
    # Generate tokens
    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id, role=user.role)
    logger.info("User login successful", extra={"event": "login_success", "email": user.email, "user_id": user.id})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/verify-otp", response_model=Token)
def verify_otp(request: OTPVerify, db: Session = Depends(get_db)):
    # Find OTP
    db_otp = db.query(OTPCode).filter(
        OTPCode.email == request.email,
        OTPCode.code == request.code,
        OTPCode.purpose == request.purpose
    ).first()
    
    if not db_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code"
        )
        
    # Check expiry
    # Make db_otp.expires_at timezone aware for comparison if needed
    now = datetime.now(timezone.utc)
    # Check if expires_at has tzinfo, if not make it tz-aware
    expires_at = db_otp.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
        
    if now > expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP code has expired"
        )
        
    # Find user
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found"
        )
        
    # Activate user if this is an activation OTP
    if request.purpose == "activation":
        user.is_active = True
        db.add(user)
        try:
            from app.core.rabbitmq import publish_event
            publish_event("UserRegistered", {"email": user.email, "name": user.name})
        except Exception:
            pass
        
    # Clean up verified OTP code
    db.delete(db_otp)
    db.commit()
    
    # Generate and return active tokens
    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id, role=user.role)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if user:
        # Generate and print reset OTP
        create_and_print_otp(db, user.email, "reset")
        
    # Always return a success response to avoid email enumeration
    return {"message": "If the email is registered, an OTP has been generated."}

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    # Validate OTP
    db_otp = db.query(OTPCode).filter(
        OTPCode.email == request.email,
        OTPCode.code == request.code,
        OTPCode.purpose == "reset"
    ).first()
    
    if not db_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset OTP code"
        )
        
    now = datetime.now(timezone.utc)
    expires_at = db_otp.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
        
    if now > expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset OTP code has expired"
        )
        
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found"
        )
        
    # Reset password
    user.password_hash = get_password_hash(request.new_password)
    user.is_active = True  # Automatically active user if they reset password
    db.add(user)
    
    # Delete OTP code
    db.delete(db_otp)
    db.commit()
    
    return {"message": "Password has been reset successfully."}

@router.post("/refresh", response_model=Token)
def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            request.refresh_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        if token_data.sub is None or token_data.type != "refresh":
            logger.warning("JWT verification failed", extra={"event": "jwt_validation_failed"})
            raise credentials_exception
    except JWTError:
        logger.warning("JWT verification failed", extra={"event": "jwt_validation_failed"})
        raise credentials_exception
        
    user = db.query(User).filter(User.id == int(token_data.sub)).first()
    if not user or not user.is_active:
        raise credentials_exception
        
    access_token = create_access_token(subject=user.id, role=user.role)
    new_refresh_token = create_refresh_token(subject=user.id, role=user.role)
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.get("/profile", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/users", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    List all registered users (Admin only).
    """
    return db.query(User).all()
