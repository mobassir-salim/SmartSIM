from fastapi import APIRouter
from app.api.endpoints import sims

api_router = APIRouter()
api_router.include_router(sims.router, prefix="/sims", tags=["sims"])
