from fastapi import APIRouter
from app.api.endpoints import auth, crm

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(crm.router, prefix="/admin/crm", tags=["admin-crm"])

