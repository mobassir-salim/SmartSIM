from fastapi import APIRouter
from app.api.endpoints import notifications

api_router = APIRouter()

api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
