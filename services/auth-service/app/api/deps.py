from typing import Generator, Optional
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import TokenPayload

logger = logging.getLogger("auth-service")

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"  # We'll map OAuth2 login to this url or generic
)

class TokenData(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    type: Optional[str] = None

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        if token_data.sub is None or token_data.type != "access":
            logger.warning("JWT verification failed", extra={"event": "jwt_validation_failed"})
            raise credentials_exception
    except JWTError:
        logger.warning("JWT verification failed", extra={"event": "jwt_validation_failed"})
        raise credentials_exception
        
    user = db.query(User).filter(User.id == int(token_data.sub)).first()
    if not user:
        raise credentials_exception
    return user

def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have enough privileges"
        )
    return current_user

def get_current_admin(token: str = Depends(oauth2_scheme)) -> TokenData:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        token_data = TokenData(
            sub=payload.get("sub"),
            role=payload.get("role"),
            type=payload.get("type")
        )
        if token_data.sub is None or token_data.type != "access":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    if token_data.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have enough privileges"
        )
    return token_data

