import unittest
import requests
import psycopg2
import random
import string

BASE_URL = "http://127.0.0.1"
DB_URL = "postgresql://postgres:postgres@127.0.0.1:5433/smartsim"

class TestOrderService(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        """Register and activate an admin user to seed SIM and Plan catalog items"""
        rand_suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        cls.admin_email = f"order_admin_{rand_suffix}@example.com"
        cls.admin_mobile = "".join(random.choices(string.digits, k=10))
        cls.admin_password = "adminpassword123"
        
        # Register admin
        register_payload = {
            "name": "Order Admin",
            "email": cls.admin_email,
            "mobile": cls.admin_mobile,
            "role": "admin",
            "password": cls.admin_password
        }
        requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        
        # Get OTP and activate
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        cursor.execute("SELECT code FROM otp_codes WHERE email = %s AND purpose = 'activation'", (cls.admin_email,))
        otp_code = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        
        verify_payload = {
            "email": cls.admin_email,
            "code": otp_code,
            "purpose": "activation"
        }
        requests.post(f"{BASE_URL}/api/auth/verify-otp", json=verify_payload)
        
        # Log in
        login_payload = {
            "email": cls.admin_email,
            "password": cls.admin_password
        }
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
        cls.admin_token = login_resp.json()["access_token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}
        
        # Seed a test SIM card
        cls.sim_price = 50.00
        sim_payload = {
            "name": f"SIM-{rand_suffix}",
            "type": "prepaid",
            "price": cls.sim_price,
            "description": "Order Integration Test SIM",
            "iccid_prefix": f"89{random.randint(10,99)}"
        }
        sim_resp = requests.post(f"{BASE_URL}/api/sims", json=sim_payload, headers=cls.admin_headers)
        cls.sim_id = sim_resp.json()["id"]

        # Seed a test Plan
        cls.plan_price = 120.00
        plan_payload = {
            "name": f"Plan-{rand_suffix}",
            "price": cls.plan_price,
            "data_gb": 15,
            "validity_days": 30,
            "type": "data",
            "description": "Order Integration Test Plan"
        }
        plan_resp = requests.post(f"{BASE_URL}/api/plans", json=plan_payload, headers=cls.admin_headers)
        cls.plan_id = plan_resp.json()["id"]

    def setUp(self):
        """Register and activate a clean customer user for placing orders"""
        rand_suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        self.email = f"order_cust_{rand_suffix}@example.com"
        self.mobile = "".join(random.choices(string.digits, k=10))
        self.password = "customer123"
        
        # Register user
        register_payload = {
            "name": "Order Customer",
            "email": self.email,
            "mobile": self.mobile,
            "role": "customer",
            "password": self.password
        }
        requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        
        # Get OTP and activate
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        cursor.execute("SELECT code FROM otp_codes WHERE email = %s AND purpose = 'activation'", (self.email,))
        otp_code = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        
        verify_payload = {
            "email": self.email,
            "code": otp_code,
            "purpose": "activation"
        }
        requests.post(f"{BASE_URL}/api/auth/verify-otp", json=verify_payload)
        
        # Log in
        login_payload = {
            "email": self.email,
            "password": self.password
        }
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
        self.token = login_resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_order_health(self):
        """Test health check endpoint of Order service through API gateway"""
        response = requests.get(f"{BASE_URL}/api/orders/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "UP", "service": "order-service"})

    def test_order_placement_lifecycle(self):
        """Test order creation, payment failure (insufficient balance), success (after top-up), retrieval, and listing"""
        # Define order items containing 1 SIM and 1 Plan
        order_payload = {
            "items": [
                {
                    "item_type": "SIM",
                    "item_id": str(self.sim_id),
                    "quantity": 1
                },
                {
                    "item_type": "PLAN",
                    "item_id": str(self.plan_id),
                    "quantity": 1
                }
            ]
        }
        total_cost = self.sim_price + self.plan_price # 170.00
        
        # 1. Place order with 0.00 wallet balance -> should fail with 402 Payment Required
        fail_order_resp = requests.post(f"{BASE_URL}/api/orders", json=order_payload, headers=self.headers)
        self.assertEqual(fail_order_resp.status_code, 402)
        self.assertIn("Insufficient wallet balance", fail_order_resp.json()["detail"])
        
        # 2. Top-up wallet with 200.00 BDT (sufficient balance)
        topup_payload = {
            "amount": 200.00,
            "description": "Top-up for purchase",
            "reference_id": f"TOP-{random.randint(1000, 9999)}"
        }
        topup_resp = requests.post(f"{BASE_URL}/api/wallet/add-money", json=topup_payload, headers=self.headers)
        self.assertEqual(topup_resp.status_code, 200)
        self.assertEqual(float(topup_resp.json()["balance"]), 200.00)
        
        # 3. Place the order again -> should succeed with 201 Created and CONFIRMED status
        order_resp = requests.post(f"{BASE_URL}/api/orders", json=order_payload, headers=self.headers)
        self.assertEqual(order_resp.status_code, 201)
        order_data = order_resp.json()
        self.assertEqual(order_data["status"], "CONFIRMED")
        self.assertEqual(float(order_data["total_amount"]), total_cost)
        order_id = order_data["id"]
        
        # 4. Check wallet balance -> should be debited to 30.00 BDT (200.00 - 170.00)
        wallet_check_resp = requests.get(f"{BASE_URL}/api/wallet", headers=self.headers)
        self.assertEqual(float(wallet_check_resp.json()["balance"]), 30.00)
        
        # 5. Retrieve the order details by ID
        get_order_resp = requests.get(f"{BASE_URL}/api/orders/{order_id}", headers=self.headers)
        self.assertEqual(get_order_resp.status_code, 200)
        retrieved_order = get_order_resp.json()
        self.assertEqual(retrieved_order["status"], "CONFIRMED")
        self.assertEqual(len(retrieved_order["items"]), 2)
        
        # 6. List user's orders and verify the placed order is present
        list_orders_resp = requests.get(f"{BASE_URL}/api/orders", headers=self.headers)
        self.assertEqual(list_orders_resp.status_code, 200)
        orders_list = list_orders_resp.json()["orders"]
        self.assertTrue(any(o["id"] == order_id for o in orders_list))

if __name__ == "__main__":
    unittest.main()
