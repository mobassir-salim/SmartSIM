import json
import httpx
import random
import logging
import time
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.models.order import Order, OrderStatus, OrderItemType
from app.models.order_journey import OrderJourney
from app.models.service_execution_log import ServiceExecutionLog

logger = logging.getLogger("order-service")

def execute_order_lifecycle(
    db: Session, 
    order: Order, 
    token: str, 
    msisdn: str = None, 
    customer_info: dict = None, 
    steps_completed: set = None
) -> bool:
    if steps_completed is None:
        steps_completed = set()

    # Use order.msisdn if msisdn is not passed (e.g. during retry)
    if not msisdn and order.msisdn:
        msisdn = order.msisdn

    steps = [
        ("Customer Validation", "auth-service"),
        ("MSISDN Reserved", "sim-service"),
        ("Inventory Check", "order-service"),
        ("SIM Allocation", "sim-service"),
        ("Wallet Validation", "wallet-service"),
        ("Plan Assignment", "plan-service"),
        ("Activation Request", "sim-service"),
        ("Notification", "notification-service"),
    ]

    step_api_mapping = {
        "Customer Validation": "DB Customer Profile Update",
        "MSISDN Reserved": "GET /api/numbers/verify-reservation",
        "Inventory Check": "GET /health (SIM/Plan)",
        "SIM Allocation": "POST /api/numbers/allocate",
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
            request_payload=json.dumps({"order_id": order.id, "user_id": user_id, "msisdn": msisdn})
        )
        db.add(journey_step)
        db.commit()
        db.refresh(journey_step)

        start_time = time.perf_counter()

        try:
            # ──── Step 1: Customer Validation (KYC) ────
            if step_name == "Customer Validation":
                # If customer_info is provided, save it directly to the customer_profile table
                if customer_info:
                    # Update users table (name)
                    if customer_info.get("name"):
                        db.execute(
                            text("UPDATE users SET name = :name WHERE id = :user_id"),
                            {"name": customer_info["name"], "user_id": int(user_id)}
                        )
                    
                    # Check if customer_profile exists
                    profile_exists = db.execute(
                        text("SELECT 1 FROM customer_profile WHERE user_id = :user_id"),
                        {"user_id": int(user_id)}
                    ).fetchone()
                    
                    if not profile_exists:
                        db.execute(
                            text("INSERT INTO customer_profile (user_id, status) VALUES (:user_id, 'ACTIVE')"),
                            {"user_id": int(user_id)}
                        )
                    
                    # Update customer_profile table
                    db.execute(
                        text(
                            "UPDATE customer_profile SET "
                            "father_name = :father_name, dob = :dob, gender = :gender, "
                            "alternate_mobile = :alternate_mobile, address = :address, "
                            "city = :city, state = :state, pin_code = :pin_code, country = :country, "
                            "id_type = :id_type, id_number = :id_number, "
                            "id_issue_date = :id_issue_date, id_expiry_date = :id_expiry_date, "
                            "updated_at = NOW() WHERE user_id = :user_id"
                        ),
                        {
                            "user_id": int(user_id),
                            "father_name": customer_info.get("father_name"),
                            "dob": customer_info.get("dob"),
                            "gender": customer_info.get("gender"),
                            "alternate_mobile": customer_info.get("alternate_mobile"),
                            "address": customer_info.get("address"),
                            "city": customer_info.get("city"),
                            "state": customer_info.get("state"),
                            "pin_code": customer_info.get("pin_code"),
                            "country": customer_info.get("country"),
                            "id_type": customer_info.get("id_type"),
                            "id_number": customer_info.get("id_number"),
                            "id_issue_date": customer_info.get("id_issue_date"),
                            "id_expiry_date": customer_info.get("id_expiry_date")
                        }
                    )
                    db.commit()
                
                # Verify that profile details are complete in database
                profile = db.execute(
                    text(
                        "SELECT dob, gender, alternate_mobile, address, id_type, id_number "
                        "FROM customer_profile WHERE user_id = :user_id"
                    ),
                    {"user_id": int(user_id)}
                ).fetchone()
                
                if not profile or not all([profile[0], profile[1], profile[2], profile[3], profile[4], profile[5]]):
                    raise Exception("KYC details are incomplete in customer profile.")
                    
                journey_step.status = "SUCCESS"
                journey_step.response_payload = json.dumps({"status": "validated", "profile": "complete"})

            # ──── Step 2: MSISDN Reserved ────
            elif step_name == "MSISDN Reserved":
                if sim_items:
                    if not msisdn:
                        raise Exception("Preferred mobile number (MSISDN) selection is required.")
                    
                    # Verify number reservation status in sim-service
                    url = f"{settings.SIM_SERVICE_URL}/api/numbers/verify-reservation"
                    payload = {"msisdn": msisdn, "customer_id": int(user_id)}
                    
                    with httpx.Client(timeout=10.0) as client:
                        res = client.post(url, json=payload, headers=headers)
                        if res.status_code != 200:
                            try:
                                err_detail = res.json().get('detail', 'Unknown error')
                            except Exception:
                                err_detail = f"HTTP {res.status_code}: {res.text[:150]}"
                            raise Exception(f"MSISDN reservation check failed: {err_detail}")
                            
                    journey_step.status = "SUCCESS"
                    journey_step.response_payload = json.dumps({"status": "reserved", "msisdn": msisdn})
                else:
                    journey_step.status = "SUCCESS"
                    journey_step.response_payload = json.dumps({"status": "skipped (no SIM in order)"})

            # ──── Step 3: Inventory Check ────
            elif step_name == "Inventory Check":
                # Check health of SIM & Plan services
                with httpx.Client(timeout=5.0) as client:
                    client.get(f"{settings.SIM_SERVICE_URL}/health").raise_for_status()
                    client.get(f"{settings.PLAN_SERVICE_URL}/health").raise_for_status()
                journey_step.status = "SUCCESS"
                journey_step.response_payload = json.dumps({"status": "healthy"})

            # ──── Step 4: SIM Allocation ────
            elif step_name == "SIM Allocation":
                if sim_items:
                    for it in sim_items:
                        # Call allocate endpoint in SIM Service
                        url = f"{settings.SIM_SERVICE_URL}/api/numbers/allocate"
                        payload = {
                            "msisdn": msisdn,
                            "customer_id": int(user_id),
                            "order_id": order.id,
                            "sim_id": int(it.item_id)
                        }
                        with httpx.Client(timeout=10.0) as client:
                            res = client.post(url, json=payload, headers=headers)
                            if res.status_code != 200:
                                try:
                                    err_detail = res.json().get('detail', 'Unknown error')
                                except Exception:
                                    err_detail = f"HTTP {res.status_code}: {res.text[:150]}"
                                raise Exception(f"SIM allocation failed: {err_detail}")
                            try:
                                alloc_data = res.json()
                            except Exception:
                                raise Exception("SIM allocation succeeded but returned invalid JSON data.")
                            
                    journey_step.status = "SUCCESS"
                    journey_step.response_payload = json.dumps({"allocation": "completed", "details": alloc_data})
                else:
                    journey_step.status = "SUCCESS"
                    journey_step.response_payload = json.dumps({"allocation": "skipped (no SIM)"})

            # ──── Step 5: Wallet Validation ────
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
                    if res.status_code != 200:
                        try:
                            err_detail = res.json().get('detail', 'Unknown error')
                        except Exception:
                            err_detail = f"HTTP {res.status_code}: {res.text[:150]}"
                        raise Exception(f"Wallet validation failed: {err_detail}")
                try:
                    res_json = res.json()
                except Exception:
                    res_json = {"message": "Success", "raw_response": res.text[:200]}
                journey_step.status = "SUCCESS"
                journey_step.response_payload = json.dumps(res_json)

            # ──── Step 6: Plan Assignment ────
            elif step_name == "Plan Assignment":
                if plan_items:
                    for it in plan_items:
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

            # ──── Step 7: Activation Request ────
            elif step_name == "Activation Request":
                # Simulated telecom network gateway activation. 20% failure on first try
                if random.random() < 0.20:
                    raise httpx.ConnectTimeout("Connection to Telecom HLR gateway timed out.")
                
                # Active SIM and Number in inventory/assignment tables
                if sim_items:
                    # Update status of assignment to ACTIVATED
                    db.execute(
                        text("UPDATE sim_assignment SET assignment_status = 'ACTIVATED' WHERE order_id = :order_id"),
                        {"order_id": order.id}
                    )
                    
                    # Update status of SIM in inventory to ACTIVATED
                    db.execute(
                        text(
                            "UPDATE sim_inventory si "
                            "SET status = 'ACTIVATED' "
                            "FROM sim_assignment sa "
                            "WHERE si.id = sa.inventory_id AND sa.order_id = :order_id"
                        ),
                        {"order_id": order.id}
                    )
                    
                    # Update status of MSISDN in mobile number inventory to ACTIVATED
                    db.execute(
                        text(
                            "UPDATE mobile_number_inventory mni "
                            "SET status = 'ACTIVATED' "
                            "FROM sim_assignment sa "
                            "WHERE mni.inventory_id = sa.inventory_id AND sa.order_id = :order_id"
                        ),
                        {"order_id": order.id}
                    )
                    db.commit()
                    
                journey_step.status = "SUCCESS"
                journey_step.response_payload = json.dumps({"status": "activated", "hlr_response": "HLR_SUCCESS_200"})

            # ──── Step 8: Notification ────
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
