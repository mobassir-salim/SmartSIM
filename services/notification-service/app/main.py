from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.api import api_router
from app.worker import run_worker_in_background

from app.core.logging import setup_logging

# Import models so SQLAlchemy creates the tables on startup
from app.models.notification import (
    Notification,
    NotificationTemplate,
    NotificationQueue,
    NotificationHistory,
    NotificationRouterLog,
    NotificationDLQ
)

# Auto-create tables
Base.metadata.create_all(bind=engine)

def seed_templates():
    from app.core.database import SessionLocal
    from app.models.notification import NotificationTemplate
    db = SessionLocal()
    try:
        defaults = [
            {"name": "customer_registered", "channel": "EMAIL", "subject": "Welcome to SmartSIM!", "body": "Hello {{name}},\n\nWelcome to SmartSIM. Your account {{email}} has been successfully registered. We are thrilled to have you with us!"},
            {"name": "otp", "channel": "ALL", "subject": "Your Verification Code", "body": "Your verification code is {{otp}}. It is valid for 10 minutes."},
            {"name": "number_reserved", "channel": "ALL", "subject": "Mobile Number Reserved", "body": "Your selected mobile number {{msisdn}} has been reserved. Reservation expires in 30 minutes. Please complete your order soon."},
            {"name": "sim_activated", "channel": "ALL", "subject": "SIM Activated Successfully", "body": "Your SIM is now active. MSISDN: {{msisdn}}."},
            {"name": "order_completed", "channel": "ALL", "subject": "Order Completed", "body": "Your order {{order_id}} has been completed successfully. Thank you for choosing SmartSIM!"},
            {"name": "wallet_credit", "channel": "ALL", "subject": "Wallet Credited", "body": "₹{{amount}} has been credited successfully to your SmartSIM wallet."},
            {"name": "recharge_successful", "channel": "ALL", "subject": "Recharge Successful", "body": "Recharge completed successfully for plan: {{plan}}."},
            {"name": "support_ticket_closed", "channel": "ALL", "subject": "Support Ticket Resolved", "body": "Your support ticket {{ticket_id}} has been resolved. If you have further issues, please raise a new ticket."}
        ]
        for item in defaults:
            existing = db.query(NotificationTemplate).filter(NotificationTemplate.name == item["name"]).first()
            if not existing:
                template = NotificationTemplate(
                    name=item["name"],
                    channel=item["channel"],
                    subject=item["subject"],
                    body=item["body"]
                )
                db.add(template)
        db.commit()
    except Exception as e:
        print(f"Error seeding templates: {e}")
        db.rollback()
    finally:
        db.close()

seed_templates()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Launch background RabbitMQ listener
    run_worker_in_background()
    yield
    # Shutdown: Clean up if needed

setup_logging("notification-service")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
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

from app.api.endpoints.notifications import v1_router
app.include_router(v1_router, prefix="/api/v1/notifications", tags=["Notifications V1"])


@app.get("/")
def root():
    return {"message": "Welcome to SmartSIM Notification Service API"}


@app.get("/health")
def health():
    return {"status": "UP", "service": "notification-service"}


@app.get(f"{settings.API_V1_STR}/health")
def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
    }
