import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="SmartSIM Email Service")

logger = logging.getLogger("email-service")
logging.basicConfig(level=logging.INFO)

SMTP_HOST = os.getenv("SMTP_HOST", "mailhog")
SMTP_PORT = int(os.getenv("SMTP_PORT", "1025"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "noreply@smartsim.local")

class EmailSendRequest(BaseModel):
    recipient: str
    subject: str
    body: str

@app.get("/health")
def health():
    return {
        "status": "UP",
        "service": "email-service",
        "smtp_host": SMTP_HOST,
        "smtp_port": SMTP_PORT
    }

@app.post("/api/v1/email/send")
def send_email(req: EmailSendRequest):
    logger.info(f"[Email Send] Recipient: {req.recipient} | Subject: {req.subject}")
    
    # Setup the email headers and content
    msg = MIMEMultipart()
    msg['From'] = EMAIL_FROM
    msg['To'] = req.recipient
    msg['Subject'] = req.subject
    
    # Attach body
    msg.attach(MIMEText(req.body, 'html' if "<html>" in req.body.lower() else 'plain'))

    try:
        # In development, MailHog doesn't need login, but in production SMTP usually does
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
        
        # Start TLS if not using mock/MailHog on local SMTP port 1025
        if SMTP_PORT != 1025 and SMTP_USER:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            
        server.send_message(msg)
        server.quit()
        logger.info(f"Email sent successfully to {req.recipient}")
    except Exception as e:
        logger.error(f"Failed to send email to {req.recipient} via SMTP: {e}")
        # Log to terminal but return error
        raise HTTPException(status_code=500, detail=f"SMTP Send Failure: {str(e)}")

    return {
        "status": "success",
        "recipient": req.recipient,
        "subject": req.subject,
        "sent": True
    }
