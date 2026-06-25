import json
import httpx
import random
import logging
import time
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.models.order import Order, OrderStatus, OrderItemType
from app.models.order_journey import OrderJourney
from app.models.service_execution_log import ServiceExecutionLog

logger = logging.getLogger("order-service")

def execute_order_lifecycle(db: Session, order: Order, token: str, steps_completed: set = None) -> bool:
    if steps_completed is None:
        steps_completed = set()

    steps = [
        ("Inventory Check", "order-service"),
        ("SIM Allocation", "sim-service"),
        ("Wallet Validation", "wallet-service"),
        ("Plan Assignment", "plan-service"),
        ("Activation Request", "sim-service"),
        ("Notification", "notification-service"),
    ]

    step_api_mapping = {
        "Inventory Check": "GET /health (SIM/Plan)",
        "SIM Allocation": "POST /api/sims/{id}/purchase",
        "Wallet Validation": "POST /api/wallet/debit",
        "Plan Assignment": "SQL Plan History Insert",
        "Activation Request": "HLR Activation Simulator",
        "Notification": "RabbitMQ Event Publish",
    }

    headers = {"Authorization": f"Bearer {token}"}
    user_id = order.user_id

    # Find the SIM and Plan items from the order
    sim_items = [it for it in order.items if it.item_type == OrderItemType.SIM]
    plan_items = [it for it in order.items if it.item_type == OrderItemType.PLAN]

    for step_name, system_name in steps:
        if step_name in steps_completed:
            logger.info(f"Skipping already completed step: {step_name}")
            continue

        # Log pending step in order_journey
        journey_step = OrderJourney(
            order_id=order.id,
            step_name=step_name,
            system_name=system_name,
            status="PENDING",
            request_payload=json.dumps({"order_id": order.id, "user_id": user_id})
        )
        db.add(journey_step)
        db.commit()
        db.refresh(journey_step)

        start_time = time.perf_counter()

        try:
            # ──── Step 1: Inventory Check ────
            if step_name == "Inventory Check":
                # Check health of SIM & Plan services
                with httpx.Client(timeout=5.0) as client:
                    client.get(f"{settings.SIM_SERVICE_URL}/health").raise_for_status()
                    client.get(f"{settings.PLAN_SERVICE_URL}/health").raise_for_status()
                journey_step.status = "SUCCESS"
                journey_step.response_payload = json.dumps({"status": "healthy"})

            # ──── Step 2: SIM Allocation ────
            elif step_name == "SIM Allocation":
                if sim_items:
                    for it in sim_items:
                        # Call purchase/allocation endpoint in SIM Service
                        url = f"{settings.SIM_SERVICE_URL}/api/sims/{it.item_id}/purchase"
                        with httpx.Client(timeout=10.0) as client:
                            res = client.post(url)
                            res.raise_for_status()
                    journey_step.status = "SUCCESS"
                    journey_step.response_payload = json.dumps({"allocation": "completed"})
                else:
                    journey_step.status = "SUCCESS"
                    journey_step.response_payload = json.dumps({"allocation": "skipped (no SIM)"})

            # ──── Step 3: Wallet Validation ────
            elif step_name == "Wallet Validation":
                url = f"{settings.WALLET_SERVICE_URL}/api/wallet/debit"
                payload = {
                    "amount": float(order.total_amount),
                    "description": f"Payment for Order {order.id[:8]}",
                    "reference_id": order.id,
                }
                with httpx.Client(timeout=10.0) as client:
                    res = client.post(url, json=payload, headers=headers)
                    if res.status_code == 402:
                        raise Exception("Insufficient wallet balance.")
                    res.raise_for_status()
                journey_step.status = "SUCCESS"
                journey_step.response_payload = json.dumps(res.json())

            # ──── Step 4: Plan Assignment ────
            elif step_name == "Plan Assignment":
                if plan_items:
                    for it in plan_items:
                        # Insert plan assignment record into auth-service's customer_plan_history table in shared DB
                        # We use raw SQL because Plan service doesn't have assignment APIs currently
                        db.execute(
                            text(
                                "INSERT INTO customer_plan_history (user_id, plan_id, plan_name, activated_at, status) "
                                "VALUES (:user_id, :plan_id, :plan_name, NOW(), 'ACTIVE')"
                            ),
                            {"user_id": int(user_id), "plan_id": int(it.item_id), "plan_name": it.item_name}
                        )
                    journey_step.status = "SUCCESS"
                    journey_step.response_payload = json.dumps({"plan_assignment": "completed"})
                else:
                    journey_step.status = "SUCCESS"
                    journey_step.response_payload = json.dumps({"plan_assignment": "skipped (no plan)"})

            # ──── Step 5: Activation Request ────
            elif step_name == "Activation Request":
                # Simulated telecom network gateway activation.
                # Has a 20% random failure rate on the first try to demonstrate retry engine capabilities!
                if random.random() < 0.20:
                    raise httpx.ConnectTimeout("Connection to Telecom HLR gateway timed out.")
                
                # Mock successful SIM activation in inventory table
                if sim_items:
                    # Update SIM statuses in sim_inventory to ACTIVATED
                    db.execute(
                        text(
                            "UPDATE sim_inventory si "
                            "SET status = 'ACTIVATED' "
                            "FROM sim_assignment sa "
                            "WHERE si.id = sa.inventory_id AND sa.customer_id = :user_id"
                        ),
                        {"user_id": int(user_id)}
                    )
                journey_step.status = "SUCCESS"
                journey_step.response_payload = json.dumps({"status": "activated", "hlr_response": "HLR_SUCCESS_200"})

            # ──── Step 6: Notification ────
            elif step_name == "Notification":
                # Publish event to RabbitMQ
                try:
                    from app.core.rabbitmq import publish_event
                    publish_event("OrderCompleted", {"user_id": user_id, "order_id": order.id, "total_amount": float(order.total_amount)})
                except Exception as mq_err:
                    logger.error(f"MQ publishing warning: {mq_err}")
                journey_step.status = "SUCCESS"
                journey_step.response_payload = json.dumps({"event": "OrderCompleted published"})

            db.commit()

            # Record success in service_execution_log
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            exec_log = ServiceExecutionLog(
                order_id=order.id,
                service_name=system_name,
                api_name=step_api_mapping.get(step_name, "Unknown API"),
                execution_time=round(duration_ms, 2),
                status="SUCCESS"
            )
            db.add(exec_log)
            db.commit()

        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            journey_step.status = "FAILED"
            journey_step.error_message = str(e)
            order.status = OrderStatus.FAILED
            db.commit()

            # Record failure in service_execution_log
            exec_log = ServiceExecutionLog(
                order_id=order.id,
                service_name=system_name,
                api_name=step_api_mapping.get(step_name, "Unknown API"),
                execution_time=round(duration_ms, 2),
                status="FAILED",
                error_message=str(e)
            )
            db.add(exec_log)
            db.commit()

            logger.error(f"Order checkout step '{step_name}' failed: {e}")
            return False

    order.status = OrderStatus.CONFIRMED
    db.commit()
    return True
