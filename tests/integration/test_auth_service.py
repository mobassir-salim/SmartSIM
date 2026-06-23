import unittest
import requests
import psycopg2
import random
import string

BASE_URL = "http://127.0.0.1"
DB_URL = "postgresql://postgres:postgres@127.0.0.1:5433/smartsim"

class TestAuthService(unittest.TestCase):
    
    def test_auth_health(self):
        """Test health check endpoint of Auth service through API gateway"""
        response = requests.get(f"{BASE_URL}/api/auth/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "UP"})

    def test_auth_registration_and_login_lifecycle(self):
        """Test registration, activation via DB-retrieved OTP, login, profile, and refresh token"""
        # 1. Generate unique details for a new customer user
        rand_suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        name = f"Auth Test User {rand_suffix}"
        email = f"auth_test_{rand_suffix}@example.com"
        mobile = "".join(random.choices(string.digits, k=10))
        password = "password12345"
        
        # Register user
        register_payload = {
            "name": name,
            "email": email,
            "mobile": mobile,
            "role": "customer",
            "password": password
        }
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        self.assertEqual(reg_response.status_code, 201)
        user_out = reg_response.json()
        self.assertEqual(user_out["email"], email)
        self.assertFalse(user_out["is_active"])
        
        # Attempt to login without active account -> should fail with 403 Forbidden
        login_payload = {
            "email": email,
            "password": password
        }
        login_fail_response = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
        self.assertEqual(login_fail_response.status_code, 403)
        self.assertIn("Account not activated", login_fail_response.json()["detail"])

        # 2. Query the database to get the activation OTP
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        cursor.execute("SELECT code FROM otp_codes WHERE email = %s AND purpose = 'activation'", (email,))
        row = cursor.fetchone()
        self.assertIsNotNone(row, "OTP should be generated in the database")
        otp_code = row[0]
        cursor.close()
        conn.close()

        # 3. Verify OTP to activate account
        verify_payload = {
            "email": email,
            "code": otp_code,
            "purpose": "activation"
        }
        verify_response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json=verify_payload)
        self.assertEqual(verify_response.status_code, 200)
        tokens = verify_response.json()
        self.assertIn("access_token", tokens)
        self.assertIn("refresh_token", tokens)
        access_token = tokens["access_token"]
        refresh_token = tokens["refresh_token"]

        # 4. Get User Profile using the access token
        headers = {"Authorization": f"Bearer {access_token}"}
        profile_response = requests.get(f"{BASE_URL}/api/auth/profile", headers=headers)
        self.assertEqual(profile_response.status_code, 200)
        profile_data = profile_response.json()
        self.assertEqual(profile_data["email"], email)
        self.assertTrue(profile_data["is_active"])

        # 5. Use the refresh token to get a new access token
        refresh_payload = {
            "refresh_token": refresh_token
        }
        refresh_response = requests.post(f"{BASE_URL}/api/auth/refresh", json=refresh_payload)
        self.assertEqual(refresh_response.status_code, 200)
        new_tokens = refresh_response.json()
        self.assertIn("access_token", new_tokens)
        new_access_token = new_tokens["access_token"]
        
        # Verify the new access token works
        new_headers = {"Authorization": f"Bearer {new_access_token}"}
        new_profile_response = requests.get(f"{BASE_URL}/api/auth/profile", headers=new_headers)
        self.assertEqual(new_profile_response.status_code, 200)

    def test_password_reset_flow(self):
        """Test forgot-password OTP generation, password reset, and login with the new password"""
        rand_suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        email = f"reset_test_{rand_suffix}@example.com"
        mobile = "".join(random.choices(string.digits, k=10))
        password = "oldpassword123"
        
        # Register and activate user
        register_payload = {
            "name": "Reset User",
            "email": email,
            "mobile": mobile,
            "role": "customer",
            "password": password
        }
        requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        cursor.execute("SELECT code FROM otp_codes WHERE email = %s AND purpose = 'activation'", (email,))
        otp_code = cursor.fetchone()[0]
        cursor.close()
        
        # Activate account
        verify_payload = {
            "email": email,
            "code": otp_code,
            "purpose": "activation"
        }
        requests.post(f"{BASE_URL}/api/auth/verify-otp", json=verify_payload)
        
        # Call forgot-password endpoint
        forgot_payload = {"email": email}
        forgot_resp = requests.post(f"{BASE_URL}/api/auth/forgot-password", json=forgot_payload)
        self.assertEqual(forgot_resp.status_code, 200)
        
        # Query DB for the reset OTP code
        cursor = conn.cursor()
        cursor.execute("SELECT code FROM otp_codes WHERE email = %s AND purpose = 'reset'", (email,))
        reset_row = cursor.fetchone()
        self.assertIsNotNone(reset_row, "Reset OTP should be generated in the database")
        reset_otp = reset_row[0]
        cursor.close()
        conn.close()
        
        # Reset password
        new_password = "newpassword456"
        reset_payload = {
            "email": email,
            "code": reset_otp,
            "new_password": new_password
        }
        reset_resp = requests.post(f"{BASE_URL}/api/auth/reset-password", json=reset_payload)
        self.assertEqual(reset_resp.status_code, 200)
        
        # Login with new password
        login_payload = {
            "email": email,
            "password": new_password
        }
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
        self.assertEqual(login_resp.status_code, 200)
        self.assertIn("access_token", login_resp.json())

if __name__ == "__main__":
    unittest.main()
