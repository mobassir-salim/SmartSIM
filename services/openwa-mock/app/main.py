import logging
import uuid
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="SmartSIM OpenWA Mock Server")

logger = logging.getLogger("openwa-mock")
logging.basicConfig(level=logging.INFO)

class OpenWASendRequest(BaseModel):
    to: str
    content: str

@app.get("/health")
@app.get("/")
def health():
    return {"status": "UP", "service": "openwa-mock"}

@app.post("/sendText")
def send_text(req: OpenWASendRequest):
    logger.info(f"[OpenWA Mock Send] Sending message to {req.to}: {req.content}")
    return {
        "id": f"true_{req.to}_{uuid.uuid4().hex[:8]}",
        "status": "sent",
        "to": req.to,
        "content": req.content
    }
