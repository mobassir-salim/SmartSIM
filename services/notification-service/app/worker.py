import pika
import json
import time
import threading
import logging
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.notification import Notification

logger = logging.getLogger("notification-service")

def process_event(event_data: dict):
    db = SessionLocal()
    try:
        from sqlalchemy import text
        event_type = event_data.get("event")
        if not event_type:
            print("[Worker] Invalid message: missing 'event' field")
            return

        user_id = event_data.get("user_id")
        recipient = event_data.get("email")
        name = event_data.get("name", "User")
        
        if not recipient and user_id:
            try:
                res = db.execute(
                    text("SELECT email, name FROM users WHERE id = :user_id"),
                    {"user_id": user_id}
                ).first()
                if res:
                    recipient = res[0]
                    name = res[1]
            except Exception as db_err:
                print(f"[Worker Warning] Failed to query user from DB: {db_err}")

        if not recipient:
            recipient = "customer@smartsim.com"

        title = ""
        body = ""
        
        if event_type == "UserRegistered":
            title = "Welcome to SmartSIM!"
            body = f"Hello {name}, your account {recipient} has been successfully registered and activated. Welcome aboard!"
        elif event_type == "OrderCreated":
            order_id = event_data.get("order_id")
            amount = event_data.get("total_amount")
            title = "Order Created"
            body = f"Your order #{order_id[:8]} has been placed. Total: {amount} INR. Status: PENDING."
        elif event_type == "OrderCompleted":
            order_id = event_data.get("order_id")
            amount = event_data.get("total_amount")
            title = "Order Confirmed!"
            body = f"Payment received! Your order #{order_id[:8]} has been successfully confirmed. Total: {amount} INR."
        elif event_type == "WalletCredited":
            amount = event_data.get("amount")
            title = "Wallet Top-up Successful"
            body = f"Success! {amount} INR has been credited to your wallet balance."
        else:
            print(f"[Worker] Unknown event type: {event_type}")
            return

        db_notif = Notification(
            recipient=recipient,
            type="EMAIL",
            title=title,
            body=body,
            status="SENT"
        )
        db.add(db_notif)
        db.commit()
        logger.info("Message consumed", extra={"event": "message_consumed", "event_type": event_type})
        print(f"[Worker CONSUMED EVENT] {event_type} | Saved notification for {recipient}")
    except Exception as e:
        logger.error("Notification delivery failed", extra={"event": "notification_failure", "recipient": recipient or "unknown", "error_details": str(e)})
        print(f"[Worker ERROR] Failed to process event: {e}")
        db.rollback()
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
            print(f"[Worker] Connecting to RabbitMQ at {settings.RABBITMQ_HOST}:{settings.RABBITMQ_PORT}...")
            connection = pika.BlockingConnection(connection_params)
            channel = connection.channel()
            
            # Declare queue
            channel.queue_declare(queue=settings.RABBITMQ_QUEUE, durable=True)
            
            def callback(ch, method, properties, body):
                try:
                    data = json.loads(body.decode())
                    print(f"[Worker] Received message: {data}")
                    process_event(data)
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                except Exception as e:
                    print(f"[Worker] Error in callback: {e}")
                    # Negative ack and do not requeue corrupted messages to prevent infinite loops
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue=settings.RABBITMQ_QUEUE, on_message_callback=callback)
            
            print(f"[Worker] Listening for messages on queue: {settings.RABBITMQ_QUEUE}")
            channel.start_consuming()
        except pika.exceptions.AMQPConnectionError as e:
            print(f"[Worker] Connection failed, retrying in 5 seconds... Error: {e}")
            time.sleep(5)
        except Exception as e:
            print(f"[Worker] Unexpected error, retrying in 5 seconds... Error: {e}")
            time.sleep(5)

def run_worker_in_background():
    worker_thread = threading.Thread(target=start_consumer, daemon=True)
    worker_thread.start()
    print("[Worker] Started background consumer thread.")
