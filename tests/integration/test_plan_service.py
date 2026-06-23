import unittest
import requests
import psycopg2
import random
import string
from datetime import datetime, timedelta, timezone

BASE_URL = "http://127.0.0.1"
DB_URL = "postgresql://postgres:postgres@127.0.0.1:5433/smartsim"

class TestPlanService(unittest.TestCase):
    
    def test_plan_service_health(self):
        """Test health check endpoint of Plan service through API gateway"""
        response = requests.get(f"{BASE_URL}/api/plans/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "UP"})
        
    def test_plan_and_offer_lifecycle(self):
        """Test registration, admin verification, and complete Plan/Offer CRUD lifecycle"""
        # 1. Generate unique details for a new admin user
        rand_suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        name = f"Test Admin {rand_suffix}"
        email = f"admin_{rand_suffix}@example.com"
        mobile = "".join(random.choices(string.digits, k=10))
        password = "testadminpassword123"
        
        # Register user
        register_payload = {
            "name": name,
            "email": email,
            "mobile": mobile,
            "role": "admin",
            "password": password
        }
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        self.assertEqual(reg_response.status_code, 201)
        
        # 2. Connect to the database directly to get the OTP
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        cursor.execute("SELECT code FROM otp_codes WHERE email = %s AND purpose = 'activation'", (email,))
        row = cursor.fetchone()
        self.assertIsNotNone(row, "OTP should be generated in the database")
        otp_code = row[0]
        cursor.close()
        conn.close()
        
        # 3. Verify OTP to activate account and get tokens
        verify_payload = {
            "email": email,
            "code": otp_code,
            "purpose": "activation"
        }
        verify_response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json=verify_payload)
        self.assertEqual(verify_response.status_code, 200)
        tokens = verify_response.json()
        self.assertIn("access_token", tokens)
        access_token = tokens["access_token"]
        
        # Setup admin headers
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # 4. Create a new Plan
        plan_name = f"Super Unlimited {rand_suffix}"
        plan_price = 29.99
        plan_data = -1  # unlimited
        plan_validity = 30
        plan_type = "combo"
        plan_desc = "Unlimited high speed data with combo validity"
        
        create_plan_payload = {
            "name": plan_name,
            "price": plan_price,
            "data_gb": plan_data,
            "validity_days": plan_validity,
            "type": plan_type,
            "description": plan_desc
        }
        
        create_plan_response = requests.post(f"{BASE_URL}/api/plans", json=create_plan_payload, headers=headers)
        self.assertEqual(create_plan_response.status_code, 201)
        plan_data_resp = create_plan_response.json()
        self.assertIn("id", plan_data_resp)
        plan_id = plan_data_resp["id"]
        
        self.assertEqual(plan_data_resp["name"], plan_name)
        self.assertEqual(plan_data_resp["price"], plan_price)
        self.assertEqual(plan_data_resp["data_gb"], plan_data)
        self.assertEqual(plan_data_resp["validity_days"], plan_validity)
        self.assertEqual(plan_data_resp["type"], plan_type)
        self.assertEqual(plan_data_resp["description"], plan_desc)
        
        # 5. Retrieve Plan by ID
        get_plan_resp = requests.get(f"{BASE_URL}/api/plans/{plan_id}")
        self.assertEqual(get_plan_resp.status_code, 200)
        self.assertEqual(get_plan_resp.json()["name"], plan_name)
        
        # 6. Search for the Plan package
        search_resp = requests.get(f"{BASE_URL}/api/plans?type={plan_type}&search={plan_name}")
        self.assertEqual(search_resp.status_code, 200)
        search_results = search_resp.json()
        self.assertTrue(any(p["id"] == plan_id for p in search_results))
        
        # 7. Create an Offer linked to this Plan
        promo_code = f"PROMO_{rand_suffix.upper()}"
        discount = 15.0
        offer_desc = f"Special {discount}% discount on {plan_name}"
        
        create_offer_payload = {
            "plan_id": plan_id,
            "promo_code": promo_code,
            "discount_percentage": discount,
            "active": True,
            "description": offer_desc,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
        }
        
        create_offer_resp = requests.post(f"{BASE_URL}/api/offers", json=create_offer_payload, headers=headers)
        self.assertEqual(create_offer_resp.status_code, 201)
        offer_data = create_offer_resp.json()
        self.assertIn("id", offer_data)
        offer_id = offer_data["id"]
        
        self.assertEqual(offer_data["promo_code"], promo_code)
        self.assertEqual(offer_data["discount_percentage"], discount)
        self.assertEqual(offer_data["plan_id"], plan_id)
        
        # 8. Validate the Promo Code
        validate_resp = requests.get(f"{BASE_URL}/api/offers/validate/{promo_code}")
        self.assertEqual(validate_resp.status_code, 200)
        validated_offer = validate_resp.json()
        self.assertEqual(validated_offer["id"], offer_id)
        self.assertEqual(validated_offer["discount_percentage"], discount)
        
        # 9. Update the Offer
        update_offer_payload = {
            "discount_percentage": 20.0
        }
        update_offer_resp = requests.put(f"{BASE_URL}/api/offers/{offer_id}", json=update_offer_payload, headers=headers)
        self.assertEqual(update_offer_resp.status_code, 200)
        self.assertEqual(update_offer_resp.json()["discount_percentage"], 20.0)
        
        # 10. Update the Plan
        new_price = 24.99
        update_plan_payload = {
            "price": new_price
        }
        update_plan_resp = requests.put(f"{BASE_URL}/api/plans/{plan_id}", json=update_plan_payload, headers=headers)
        self.assertEqual(update_plan_resp.status_code, 200)
        self.assertEqual(update_plan_resp.json()["price"], new_price)
        
        # 11. Delete the Offer
        delete_offer_resp = requests.delete(f"{BASE_URL}/api/offers/{offer_id}", headers=headers)
        self.assertEqual(delete_offer_resp.status_code, 204)
        
        # 12. Confirm Offer is deleted (validate should fail or return 404)
        validate_deleted = requests.get(f"{BASE_URL}/api/offers/validate/{promo_code}")
        self.assertEqual(validate_deleted.status_code, 404)
        
        # 13. Delete the Plan
        delete_plan_resp = requests.delete(f"{BASE_URL}/api/plans/{plan_id}", headers=headers)
        self.assertEqual(delete_plan_resp.status_code, 204)
        
        # 14. Confirm Plan is deleted
        check_plan_deleted = requests.get(f"{BASE_URL}/api/plans/{plan_id}")
        self.assertEqual(check_plan_deleted.status_code, 404)

if __name__ == "__main__":
    unittest.main()
