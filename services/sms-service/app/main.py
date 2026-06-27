import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="SmartSIM SMS Service")

logger = logging.getLogger("sms-service")
logging.basicConfig(level=logging.INFO)

class SMSSendRequest(BaseModel):
    recipient: str
    message: str

@app.get("/health")
def health():
    return {"status": "UP", "service": "sms-service"}

@app.post("/api/v1/sms/send")
def send_sms(req: SMSSendRequest):
    # Simulate sending SMS
    logger.info(f"[SMS Send] Recipient: {req.recipient} | Message: {req.message}")
    
    # Check if recipient format is valid (at least 10 digits)
    digits = [c for c in req.recipient if c.isdigit()]
    if len(digits) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number format")

    return {
        "status": "success",
        "message_id": f"sms_msg_{hash(req.message + req.recipient) % 1000000}",
        "recipient": req.recipient,
        "delivered": True
    }
