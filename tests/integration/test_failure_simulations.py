import json
import urllib.request
import urllib.error
import subprocess
import time
import random

def request(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body
    except Exception as e:
        return 500, str(e)

def get_otp_from_docker(email):
    print("Fetching OTP from docker logs...")
    for attempt in range(5):
        time.sleep(2)
        res = subprocess.run(["docker", "compose", "logs", "auth-service"], capture_output=True, text=True, cwd="E:\\SmartSIM")
        lines = res.stdout.splitlines() + res.stderr.splitlines()
        for line in reversed(lines):
            if email in line and ("OTP" in line or "code" in line or "purpose" in line.lower()):
                import re
                m = re.search(r'\b\d{6}\b', line)
                if m:
                    otp = m.group(0)
                    print(f"Found OTP code: {otp}")
                    return otp
    return None

def test_failure_scenarios():
    print("=== STARTING SERVICE FAILURE SIMULATIONS ===")
    
    try:
        # Pre-setup: Register a user, top-up, and make sure we have everything set up.
        rand = random.randint(1000, 9999)
        email = f"fail_user_{rand}@gmail.com"
        mobile = f"0170002{rand}"
        password = "password123"

        print(f"\n[Setup] Registering user {email}...")
        status, reg_res = request(
            "http://localhost/api/auth/register",
            method="POST",
            data={"name": "Failure Tester", "email": email, "mobile": mobile, "password": password, "role": "customer"}
        )
        if status not in (200, 201):
            print(f"[Setup Error] Registration failed: {reg_res}")
            return

        otp = get_otp_from_docker(email)
        if not otp:
            print("[Setup Error] Could not retrieve OTP.")
            return

        # Verify OTP
        status, verify_res = request(
            "http://localhost/api/auth/verify-otp",
            method="POST",
            data={"email": email, "code": otp, "purpose": "activation"}
        )
        
        # Login
        status, login_res = request(
            "http://localhost/api/auth/login",
            method="POST",
            data={"email": email, "password": password}
        )
        token = login_res["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Add money
        print("[Setup] Adding 1000 BDT to wallet...")
        request(
            "http://localhost/api/wallet/add-money",
            method="POST",
            data={"amount": 1000, "description": "Setup funds"},
            headers=headers
        )

        # --------------------------------------------------
        # SCENARIO 1: Stop Wallet Service
        # --------------------------------------------------
        print("\n--- SCENARIO 1: Stop Wallet Service ---")
        print("Stopping wallet-service container...")
        subprocess.run(["docker", "compose", "stop", "wallet-service"], cwd="E:\\SmartSIM")
        time.sleep(2)

        # 1. Login Works (Check Profile)
        status, profile_res = request("http://localhost/api/auth/profile", headers=headers)
        print(f"Login/Profile Check: Status {status}")
        assert status == 200, f"Expected 200, got {status}"

        # 2. Browse Plans Works
        status, plans_res = request("http://localhost/api/plans")
        print(f"Browse Plans Check: Status {status}")
        assert status == 200, f"Expected 200, got {status}"

        # 3. Checkout Fails
        order_data = {
            "items": [
                {"item_type": "SIM", "item_id": "1", "quantity": 1},
                {"item_type": "PLAN", "item_id": "2", "quantity": 1}
            ]
        }
        status, order_res = request("http://localhost/api/orders", method="POST", data=order_data, headers=headers)
        print(f"Order Checkout Check: Status {status} | Detail: {order_res}")
        assert status >= 400, f"Expected checkout failure status, got {status}"

        print("Restoring wallet-service...")
        subprocess.run(["docker", "compose", "start", "wallet-service"], cwd="E:\\SmartSIM")
        subprocess.run(["docker", "compose", "exec", "-T", "gateway", "nginx", "-s", "reload"], cwd="E:\\SmartSIM")
        print("Waiting 10 seconds for wallet-service to recover...")
        time.sleep(10)

        # --------------------------------------------------
        # SCENARIO 2: Stop SIM Service
        # --------------------------------------------------
        print("\n--- SCENARIO 2: Stop SIM Service ---")
        print("Stopping sim-service container...")
        subprocess.run(["docker", "compose", "stop", "sim-service"], cwd="E:\\SmartSIM")
        time.sleep(2)

        # 1. Login Works
        status, profile_res = request("http://localhost/api/auth/profile", headers=headers)
        print(f"Login/Profile Check: Status {status}")
        assert status == 200, f"Expected 200, got {status}"

        # 2. SIM Page Fails
        status, sims_res = request("http://localhost/api/sims")
        print(f"Browse SIMs Check: Status {status}")
        assert status >= 500 or status == 503 or status == 502, f"Expected SIM API error, got {status}"

        # 3. Wallet Works
        status, wallet_res = request("http://localhost/api/wallet", headers=headers)
        print(f"Wallet Balance Check: Status {status} | Balance: {wallet_res.get('balance') if isinstance(wallet_res, dict) else 'Error'}")
        assert status == 200, f"Expected 200, got {status}"

        print("Restoring sim-service...")
        subprocess.run(["docker", "compose", "start", "sim-service"], cwd="E:\\SmartSIM")
        subprocess.run(["docker", "compose", "exec", "-T", "gateway", "nginx", "-s", "reload"], cwd="E:\\SmartSIM")
        print("Waiting 10 seconds for sim-service to recover...")
        time.sleep(10)

        # --------------------------------------------------
        # SCENARIO 3: Stop RabbitMQ
        # --------------------------------------------------
        print("\n--- SCENARIO 3: Stop RabbitMQ ---")
        print("Stopping rabbitmq container...")
        subprocess.run(["docker", "compose", "stop", "rabbitmq"], cwd="E:\\SmartSIM")
        time.sleep(3)

        # 1. Orders Work
        print("Placing order while RabbitMQ is stopped...")
        status, order_res = request("http://localhost/api/orders", method="POST", data=order_data, headers=headers)
        print(f"Order Checkout (RabbitMQ offline): Status {status} | Detail: {order_res.get('status') if isinstance(order_res, dict) else order_res}")
        assert status in (200, 201), f"Expected checkout success (200/201), got {status}"

        # 2. Check notifications
        status, list_res = request(f"http://localhost/api/notifications?recipient={email}")
        notif_titles = [n["title"] for n in list_res.get("notifications", [])] if isinstance(list_res, dict) else []
        print(f"Notification Titles found while RabbitMQ was down: {notif_titles}")
        assert "Order Confirmed!" not in notif_titles, "OrderConfirmed notification should NOT have been generated!"

        print("Restoring rabbitmq...")
        subprocess.run(["docker", "compose", "start", "rabbitmq"], cwd="E:\\SmartSIM")
        subprocess.run(["docker", "compose", "exec", "-T", "gateway", "nginx", "-s", "reload"], cwd="E:\\SmartSIM")
        print("Waiting 12 seconds for rabbitmq to recover...")
        time.sleep(12)

        # --------------------------------------------------
        # SCENARIO 4: Stop PostgreSQL
        # --------------------------------------------------
        print("\n--- SCENARIO 4: Stop PostgreSQL ---")
        print("Stopping postgres container...")
        subprocess.run(["docker", "compose", "stop", "postgres"], cwd="E:\\SmartSIM")
        time.sleep(3)

        # 1. Entire Platform Fails
        status, profile_res = request("http://localhost/api/auth/profile", headers=headers)
        print(f"Profile Check (Postgres offline): Status {status}")
        assert status >= 500 or isinstance(profile_res, str), f"Expected DB failure, got {status}"

        status, sims_res = request("http://localhost/api/sims")
        print(f"SIM Check (Postgres offline): Status {status}")
        assert status >= 500 or isinstance(sims_res, str), f"Expected DB failure, got {status}"

        print("Restoring postgres...")
        subprocess.run(["docker", "compose", "start", "postgres"], cwd="E:\\SmartSIM")
        subprocess.run(["docker", "compose", "exec", "-T", "gateway", "nginx", "-s", "reload"], cwd="E:\\SmartSIM")
        print("Waiting 10 seconds for PostgreSQL service recovery...")
        time.sleep(10)

        print("\n=== ALL FAILURE SCENARIOS VERIFIED SUCCESSFULLY ===")

    finally:
        print("\n[Cleanup] Ensuring all containers are started and healthy...")
        subprocess.run(["docker", "compose", "start"], cwd="E:\\SmartSIM")
        subprocess.run(["docker", "compose", "exec", "-T", "gateway", "nginx", "-s", "reload"], cwd="E:\\SmartSIM")
        time.sleep(5)

if __name__ == "__main__":
    test_failure_scenarios()
