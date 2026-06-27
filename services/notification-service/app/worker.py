import pika
import json
import time
import threading
import logging
import requests
from sqlalchemy import text
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.notification import NotificationTemplate

logger = logging.getLogger("notification-service")

ROUTER_URL = "http://notification-router:8013/api/v1/router/route"

def render_template(body: str, vars: dict) -> str:
    rendered = body
    for k, v in vars.items():
        rendered = rendered.replace("{{" + str(k) + "}}", str(v))
    return rendered

def resolve_user_details(db, user_id=None, email=None, mobile=None):
    """Resolve mobile, email, and name from database using any available key."""
    try:
        if user_id:
            res = db.execute(
                text("SELECT mobile, email, name FROM users WHERE id = :user_id"),
                {"user_id": int(user_id)}
            ).first()
            if res:
                return res[0], res[1], res[2]
        if email:
            res = db.execute(
                text("SELECT mobile, email, name FROM users WHERE email = :email"),
                {"email": email}
            ).first()
            if res:
                return res[0], res[1], res[2]
        if mobile:
            res = db.execute(
                text("SELECT mobile, email, name FROM users WHERE mobile = :mobile"),
                {"mobile": mobile}
            ).first()
            if res:
                return res[0], res[1], res[2]
    except Exception as e:
        logger.warning(f"Failed to query user from DB: {e}")
    return None, None, None

def process_event(event_data: dict):
    db = SessionLocal()
    try:
        event_type = event_data.get("event")
        if not event_type:
            logger.warning("[Worker] Invalid event: missing 'event' field")
            return

        # Extract potential identifiers
        user_id = event_data.get("user_id") or event_data.get("customer_id")
        email = event_data.get("email")
        mobile = event_data.get("mobile")

        # Resolve recipient details
        resolved_mobile, resolved_email, resolved_name = resolve_user_details(db, user_id, email, mobile)
        
        # Fallback to whatever was in the event
        recipient_mobile = resolved_mobile or mobile or event_data.get("phone")
        recipient_email = resolved_email or email
        recipient_name = resolved_name or event_data.get("name", "Customer")

        # Map event type to template name and priority
        template_map = {
            "UserRegistered": ("customer_registered", "HIGH"),
            "OTPCreated": ("otp", "CRITICAL"),
            "NumberReserved": ("number_reserved", "CRITICAL"),
            "SimActivated": ("sim_activated", "CRITICAL"),
            "OrderCompleted": ("order_completed", "HIGH"),
            "WalletCredited": ("wallet_credit", "MEDIUM"),
            "RechargeSuccessful": ("recharge_successful", "MEDIUM"),
            "TicketCreated": ("support_ticket_closed", "LOW"), # Use ticket closed if closed
            "TicketResolved": ("support_ticket_closed", "LOW")
        }

        # Handle custom overrides or mappings
        t_info = template_map.get(event_type)
        if not t_info:
            logger.warning(f"[Worker] Unknown event: {event_type}")
            return
        
        template_name, priority = t_info
        
        # Adjust template name for specific ticket resolution
        if event_type == "TicketResolved" or event_type == "SupportTicketClosed":
            template_name = "support_ticket_closed"
            priority = "LOW"

        # Load Template
        template = db.query(NotificationTemplate).filter(NotificationTemplate.name == template_name).first()
        if not template:
            logger.error(f"Notification template '{template_name}' not found in database!")
            return

        # Prepare variables payload
        vars_payload = {
            "name": recipient_name,
            "email": recipient_email or "",
            "mobile": recipient_mobile or "",
            "otp": event_data.get("otp", ""),
            "msisdn": event_data.get("msisdn", ""),
            "order_id": event_data.get("order_id", ""),
            "amount": event_data.get("amount") or event_data.get("total_amount") or "",
            "plan": event_data.get("plan", ""),
            "ticket_id": event_data.get("ticket_id", "")
        }

        # Render message body
        message_body = render_template(template.body, vars_payload)
        subject = template.subject or f"SmartSIM {event_type}"

        # Determine which channels to send on
        channels = []
        if template.channel.upper() == "ALL":
            if recipient_mobile:
                channels.append("WHATSAPP")
            if recipient_email:
                channels.append("EMAIL")
        else:
            channels.append(template.channel.upper())

        # For each channel, make the router API call
        for chan in channels:
            dest = recipient_email if chan == "EMAIL" else recipient_mobile
            if not dest:
                logger.warning(f"No destination for channel {chan} for customer {recipient_name}")
                continue

            router_payload = {
                "event_type": event_type,
                "customer_id": str(user_id) if user_id else None,
                "channel": chan,
                "destination": dest,
                "template_name": template_name,
                "subject": subject,
                "message": message_body,
                "payload": vars_payload,
                "priority": priority
            }

            logger.info(f"Forwarding notification to router: event={event_type}, channel={chan}, dest={dest}")
            try:
                res = requests.post(ROUTER_URL, json=router_payload, timeout=10)
                if res.status_code == 200:
                    logger.info(f"Router routed event successfully: {res.json()}")
                else:
                    logger.error(f"Router returned error status {res.status_code}: {res.text}")
            except Exception as router_err:
                logger.error(f"Failed to reach Notification Router: {router_err}")

    except Exception as e:
        logger.error(f"Failed to process event: {e}")
    finally:
        db.close()

def start_consumer():
    while True:
        try:
            credentials = pika.PlainCredentials(settings.RABBITMQ_USER, settings.RABBITMQ_PASSWORD)
            connection_params = pika.ConnectionParameters(
                host=settings.RABBITMQ_HOST,
                port=settings.RABBITMQ_PORT,
                credentials=credentials,
                heartbeat=600,
                blocked_connection_timeout=300
            )
            logger.info(f"[Worker] Connecting to RabbitMQ at {settings.RABBITMQ_HOST}:{settings.RABBITMQ_PORT}...")
            connection = pika.BlockingConnection(connection_params)
            channel = connection.channel()
            
            channel.queue_declare(queue=settings.RABBITMQ_QUEUE, durable=True)
            
            def callback(ch, method, properties, body):
                try:
                    data = json.loads(body.decode())
                    logger.info(f"[Worker] Received message: {data}")
                    process_event(data)
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                except Exception as e:
                    logger.error(f"[Worker] Error in callback: {e}")
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue=settings.RABBITMQ_QUEUE, on_message_callback=callback)
            
            logger.info(f"[Worker] Listening for messages on queue: {settings.RABBITMQ_QUEUE}")
            channel.start_consuming()
        except pika.exceptions.AMQPConnectionError as e:
            logger.warning(f"[Worker] Connection failed, retrying in 5 seconds... Error: {e}")
            time.sleep(5)
        except Exception as e:
            logger.error(f"[Worker] Unexpected error, retrying in 5 seconds... Error: {e}")
            time.sleep(5)

def run_worker_in_background():
    worker_thread = threading.Thread(target=start_consumer, daemon=True)
    worker_thread.start()
    logger.info("[Worker] Started background consumer thread.")
