import unittest
import requests
import psycopg2
import random
import string

BASE_URL = "http://127.0.0.1"
DB_URL = "postgresql://postgres:postgres@127.0.0.1:5433/smartsim"

class TestWalletService(unittest.TestCase):
    
    def setUp(self):
        """Register and activate a clean test user to run wallet actions on"""
        rand_suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        self.email = f"wallet_test_{rand_suffix}@example.com"
        self.mobile = "".join(random.choices(string.digits, k=10))
        self.password = "password123"
        
        # Register user
        register_payload = {
            "name": "Wallet Test User",
            "email": self.email,
            "mobile": self.mobile,
            "role": "customer",
            "password": self.password
        }
        requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        
        # Retrieve OTP and verify to activate
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
        
        # Log in to get the access token
        login_payload = {
            "email": self.email,
            "password": self.password
        }
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
        self.access_token = login_resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.access_token}"}

    def test_wallet_health(self):
        """Test health check endpoint of Wallet service through API gateway"""
        response = requests.get(f"{BASE_URL}/api/wallet/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "UP", "service": "wallet-service"})

    def test_wallet_lifecycle(self):
        """Test wallet auto-creation, crediting, debiting, transaction logs and validation limits"""
        # 1. Fetch wallet on first access -> should be auto-created with 0.00 balance
        wallet_resp = requests.get(f"{BASE_URL}/api/wallet", headers=self.headers)
        self.assertEqual(wallet_resp.status_code, 200)
        wallet = wallet_resp.json()
        self.assertEqual(float(wallet["balance"]), 0.00)
        
        # 2. Add money to the wallet (Credit)
        add_payload = {
            "amount": 250.50,
            "description": "Integration test credit",
            "reference_id": "REF-CREDIT-123"
        }
        credit_resp = requests.post(f"{BASE_URL}/api/wallet/add-money", json=add_payload, headers=self.headers)
        self.assertEqual(credit_resp.status_code, 200)
        self.assertEqual(float(credit_resp.json()["balance"]), 250.50)
        
        # Check current balance
        wallet_resp = requests.get(f"{BASE_URL}/api/wallet", headers=self.headers)
        self.assertEqual(float(wallet_resp.json()["balance"]), 250.50)

        # 3. Debit wallet successfully
        debit_payload = {
            "amount": 100.25,
            "description": "Integration test debit",
            "reference_id": "REF-DEBIT-456"
        }
        debit_resp = requests.post(f"{BASE_URL}/api/wallet/debit", json=debit_payload, headers=self.headers)
        self.assertEqual(debit_resp.status_code, 200)
        self.assertEqual(float(debit_resp.json()["balance"]), 150.25)

        # 4. Debit wallet with insufficient funds -> should return 402 Payment Required
        fail_debit_payload = {
            "amount": 200.00,
            "description": "Should fail",
            "reference_id": "REF-DEBIT-FAIL"
        }
        fail_debit_resp = requests.post(f"{BASE_URL}/api/wallet/debit", json=fail_debit_payload, headers=self.headers)
        self.assertEqual(fail_debit_resp.status_code, 402)
        self.assertIn("Insufficient balance", fail_debit_resp.json()["detail"])
        
        # 5. Fetch transactions and verify log details
        tx_resp = requests.get(f"{BASE_URL}/api/wallet/transactions", headers=self.headers)
        self.assertEqual(tx_resp.status_code, 200)
        tx_data = tx_resp.json()
        self.assertEqual(tx_data["total"], 3) # 1 Credit, 1 Success Debit, 1 Failed Debit
        
        txs = tx_data["transactions"]
        
        # Verify failed debit is logged
        failed_txn = next(t for t in txs if t["reference_id"] == "REF-DEBIT-FAIL")
        self.assertEqual(failed_txn["status"], "FAILED")
        self.assertEqual(float(failed_txn["amount"]), 200.00)
        
        # Verify success credit
        credit_txn = next(t for t in txs if t["reference_id"] == "REF-CREDIT-123")
        self.assertEqual(credit_txn["status"], "SUCCESS")
        self.assertEqual(credit_txn["transaction_type"], "CREDIT")

if __name__ == "__main__":
    unittest.main()
