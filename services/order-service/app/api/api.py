from fastapi import APIRouter
from app.api.endpoints import orders, admin_orders

api_router = APIRouter()
api_router.include_router(orders.router, prefix="/orders", tags=["Orders"])
api_router.include_router(admin_orders.router, prefix="/admin/orders", tags=["AdminOrders"])
