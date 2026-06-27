import os
import requests
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any

app = FastAPI(title="SmartSIM WhatsApp Service")

logger = logging.getLogger("whatsapp-service")
logging.basicConfig(level=logging.INFO)

OPENWA_API_URL = os.getenv("OPENWA_API_URL", "http://openwa-mock:8014")

class MessageSendRequest(BaseModel):
    recipient: str
    message: str

class TemplateMessageRequest(BaseModel):
    recipient: str
    template_id: str
    variables: Dict[str, Any]

class OTPMessageRequest(BaseModel):
    recipient: str
    otp: str

@app.get("/health")
def health():
    return {
        "status": "UP",
        "service": "whatsapp-service",
        "openwa_url": OPENWA_API_URL
    }

@app.post("/api/v1/messages/send")
def send_message(req: MessageSendRequest):
    logger.info(f"[WhatsApp Send] Recipient: {req.recipient} | Message: {req.message}")
    
    # Format according to OpenWA sendText specs
    payload = {
        "to": f"{req.recipient}@c.us",
        "content": req.message
    }
    
    try:
        url = f"{OPENWA_API_URL}/sendText"
        res = requests.post(url, json=payload, timeout=10)
        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail=f"OpenWA returned error: {res.text}")
        data = res.json()
    except Exception as e:
        logger.error(f"Failed to communicate with OpenWA server at {OPENWA_API_URL}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to reach OpenWA gateway: {str(e)}")

    return {
        "status": "success",
        "message_id": data.get("id", f"wa_msg_{hash(req.message) % 100000}"),
        "recipient": req.recipient,
        "delivered": True
    }

@app.post("/api/v1/messages/template")
def send_template(req: TemplateMessageRequest):
    logger.info(f"[WhatsApp Template] Recipient: {req.recipient} | Template: {req.template_id}")
    # Render template dummy message
    body = f"Template {req.template_id} variables: {req.variables}"
    return send_message(MessageSendRequest(recipient=req.recipient, message=body))

@app.post("/api/v1/messages/otp")
def send_otp(req: OTPMessageRequest):
    logger.info(f"[WhatsApp OTP] Recipient: {req.recipient} | OTP: {req.otp}")
    body = f"Your SmartSIM verification code is {req.otp}. It is valid for 10 minutes."
    return send_message(MessageSendRequest(recipient=req.recipient, message=body))

@app.post("/api/v1/messages/webhook")
def receive_webhook(payload: Dict[str, Any]):
    logger.info(f"[WhatsApp Webhook Received] Payload: {payload}")
    return {"status": "received"}
