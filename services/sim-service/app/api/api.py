from fastapi import APIRouter
from app.api.endpoints import sims
from app.api.endpoints import inventory

api_router = APIRouter()
api_router.include_router(sims.router, prefix="/sims", tags=["sims"])
api_router.include_router(inventory.router, prefix="/admin/inventory", tags=["admin-inventory"])
