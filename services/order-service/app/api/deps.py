from typing import Optional, Tuple
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import BaseModel
from app.core.config import settings
from app.core.database import get_db

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login"
)

class TokenData(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    type: Optional[str] = None

def get_current_token_and_user(token: str = Depends(oauth2_scheme)) -> Tuple[str, TokenData]:
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
        
    return token, token_data

def get_current_user_role(token: str = Depends(oauth2_scheme)) -> TokenData:
    _, token_data = get_current_token_and_user(token)
    return token_data

def get_current_admin(token_data: TokenData = Depends(get_current_user_role)) -> TokenData:
    allowed_admin_roles = ("admin", "super_admin", "support_agent", "operations_admin", "system_admin", "inventory_admin",
                           "SUPER_ADMIN", "SUPPORT_AGENT", "OPERATIONS_ADMIN", "SYSTEM_ADMIN", "INVENTORY_ADMIN")
    if token_data.role not in allowed_admin_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have enough privileges"
        )
    return token_data

def get_current_oms_admin(token_data: TokenData = Depends(get_current_admin)) -> TokenData:
    allowed_oms_roles = ("admin", "super_admin", "operations_admin", "system_admin",
                         "SUPER_ADMIN", "OPERATIONS_ADMIN", "SYSTEM_ADMIN")
    if token_data.role not in allowed_oms_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access OMS resources"
        )
    return token_data
