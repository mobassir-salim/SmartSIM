from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.api import api_router

from app.core.logging import setup_logging

from app.models.order import Order, OrderItem
from app.models.order_journey import OrderJourney

# Auto-create tables
Base.metadata.create_all(bind=engine)

setup_logging("order-service")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
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


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:80",
        "http://localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {"message": "Welcome to SmartSIM Order Service API"}


@app.get("/health")
def health():
    return {"status": "UP", "service": "order-service"}


@app.get(f"{settings.API_V1_STR}/health")
def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
    }
