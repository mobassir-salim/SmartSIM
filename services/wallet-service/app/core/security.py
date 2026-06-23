from jose import JWTError, jwt
from app.core.config import settings

def decode_token(token: str) -> dict:
    """Decode and validate a JWT token, returning its payload."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None
