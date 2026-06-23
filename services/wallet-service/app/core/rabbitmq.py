import pika
import json
import os

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", "5672"))
RABBITMQ_USER = os.getenv("RABBITMQ_USER", "guest")
RABBITMQ_PASSWORD = os.getenv("RABBITMQ_PASSWORD", "guest")
RABBITMQ_QUEUE = "notifications_queue"

def publish_event(event_type: str, data: dict):
    """
    Publish an event to RabbitMQ notifications_queue.
    Fails silently (only logs warning) if RabbitMQ is offline.
    """
    try:
        credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASSWORD)
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(
                host=RABBITMQ_HOST,
                port=RABBITMQ_PORT,
                credentials=credentials,
                connection_attempts=1,
                retry_delay=1
            )
        )
        channel = connection.channel()
        
        # Declare queue
        channel.queue_declare(queue=RABBITMQ_QUEUE, durable=True)
        
        # Build payload
        payload = {
            "event": event_type,
            **data
        }
        
        channel.basic_publish(
            exchange="",
            routing_key=RABBITMQ_QUEUE,
            body=json.dumps(payload),
            properties=pika.BasicProperties(
                delivery_mode=2,  # make message persistent
            )
        )
        connection.close()
        print(f"[RabbitMQ] Published event: {event_type}")
    except Exception as e:
        print(f"[RabbitMQ Warning] Failed to publish event {event_type} (RabbitMQ might be offline): {e}")
