from fastapi import APIRouter
from app.api.endpoints import wallet

api_router = APIRouter()

api_router.include_router(wallet.router, prefix="/wallet", tags=["Wallet"])
