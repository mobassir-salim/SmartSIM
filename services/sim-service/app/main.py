from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.api import api_router

from app.core.logging import setup_logging

# Import all models here so SQLAlchemy detects them
from app.models.sim import Sim
from app.models.sim_inventory import SimInventory
from app.models.sim_assignment import SimAssignment
from app.models.mobile_number_inventory import MobileNumberInventory

# Create DB tables
Base.metadata.create_all(bind=engine)

setup_logging("sim-service")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST, REGISTRY
from fastapi import Request, Response
import time

if "http_requests_total" not in REGISTRY._names_to_collectors:
    HTTP_REQUESTS_TOTAL = Counter(
        "http_requests_total",
        "Total number of HTTP requests",
        ["method", "status", "handler"]
    )
else:
    HTTP_REQUESTS_TOTAL = REGISTRY._names_to_collectors["http_requests_total"]

if "http_request_duration_seconds" not in REGISTRY._names_to_collectors:
    HTTP_REQUEST_DURATION_SECONDS = Histogram(
        "http_request_duration_seconds",
        "HTTP request latency in seconds",
        ["method", "handler"]
    )
else:
    HTTP_REQUEST_DURATION_SECONDS = REGISTRY._names_to_collectors["http_request_duration_seconds"]

@app.middleware("http")
async def prometheus_middleware(request: Request, call_next):
    if request.url.path == "/metrics":
        return await call_next(request)
    start_time = time.time()
    status_code = 200
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    except Exception as e:
        status_code = 500
        raise e
    finally:
        latency = time.time() - start_time
        path = request.url.path
        HTTP_REQUESTS_TOTAL.labels(method=request.method, status=status_code, handler=path).inc()
        HTTP_REQUEST_DURATION_SECONDS.labels(method=request.method, handler=path).observe(latency)

@app.get("/metrics")
def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

import threading
from sqlalchemy.sql import text
from app.core.database import SessionLocal

def release_expired_reservations_worker():
    while True:
        try:
            db = SessionLocal()
            # Update expired reservations
            db.execute(
                text(
                    "UPDATE mobile_number_inventory "
                    "SET status = 'AVAILABLE', reserved_by_customer_id = NULL, "
                    "reserved_at = NULL, reservation_expiry = NULL "
                    "WHERE status = 'RESERVED' AND reservation_expiry < NOW()"
                )
            )
            db.commit()
            db.close()
        except Exception as e:
            pass
        time.sleep(60)

@app.on_event("startup")
def startup_event():
    thread = threading.Thread(target=release_expired_reservations_worker, daemon=True)
    thread.start()

@app.get("/")
def root():
    return {"message": "Welcome to SmartSIM API"}

@app.get("/health")
def health():
    return {"status": "UP"}

@app.get(f"{settings.API_V1_STR}/health")
def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME
    }
