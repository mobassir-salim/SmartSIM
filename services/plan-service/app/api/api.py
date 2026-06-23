from fastapi import APIRouter
from app.api.endpoints import plans, offers

api_router = APIRouter()
api_router.include_router(plans.router, prefix="/plans", tags=["plans"])
api_router.include_router(offers.router, prefix="/offers", tags=["offers"])
