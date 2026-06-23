import unittest
import requests
import psycopg2
import random
import string

BASE_URL = "http://127.0.0.1"
DB_URL = "postgresql://postgres:postgres@127.0.0.1:5433/smartsim"

class TestSimService(unittest.TestCase):
    
    def test_sim_service_health(self):
        """Test health check endpoint of SIM service through API gateway"""
        response = requests.get(f"{BASE_URL}/api/sims/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "UP"})
        
    def test_sim_service_lifecycle(self):
        """Test registration, admin verification, and complete SIM CRUD lifecycle"""
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
        
        # 4. Create a new SIM package
        sim_name = f"Test SIM Package {rand_suffix}"
        sim_type = "esim"
        sim_price = 19.99
        sim_desc = "Test eSIM description"
        sim_prefix = f"89{random.randint(10,99)}"
        
        create_payload = {
            "name": sim_name,
            "type": sim_type,
            "price": sim_price,
            "description": sim_desc,
            "iccid_prefix": sim_prefix
        }
        
        create_response = requests.post(f"{BASE_URL}/api/sims", json=create_payload, headers=headers)
        self.assertEqual(create_response.status_code, 201)
        sim_data = create_response.json()
        self.assertIn("id", sim_data)
        sim_id = sim_data["id"]
        
        self.assertEqual(sim_data["name"], sim_name)
        self.assertEqual(sim_data["type"], sim_type)
        self.assertEqual(sim_data["price"], sim_price)
        self.assertEqual(sim_data["description"], sim_desc)
        self.assertEqual(sim_data["iccid_prefix"], sim_prefix)
        
        # 5. Retrieve SIM by ID
        get_response = requests.get(f"{BASE_URL}/api/sims/{sim_id}")
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.json()["name"], sim_name)
        
        # 6. Retrieve Inventory and confirm 5 seeded stock items
        inv_response = requests.get(f"{BASE_URL}/api/sims/{sim_id}/inventory", headers=headers)
        self.assertEqual(inv_response.status_code, 200)
        inventory = inv_response.json()
        self.assertEqual(len(inventory), 5)
        for item in inventory:
            self.assertEqual(item["sim_id"], sim_id)
            self.assertTrue(item["iccid"].startswith(sim_prefix))
            self.assertEqual(item["status"], "available")
            
        # 7. Search for the SIM package
        search_response = requests.get(f"{BASE_URL}/api/sims?type={sim_type}&search={sim_name}")
        self.assertEqual(search_response.status_code, 200)
        search_results = search_response.json()
        self.assertTrue(any(s["id"] == sim_id for s in search_results))
        
        # 8. Update SIM package
        new_price = 24.99
        new_desc = "Updated description"
        update_payload = {
            "price": new_price,
            "description": new_desc
        }
        update_response = requests.put(f"{BASE_URL}/api/sims/{sim_id}", json=update_payload, headers=headers)
        self.assertEqual(update_response.status_code, 200)
        updated_data = update_response.json()
        self.assertEqual(updated_data["price"], new_price)
        self.assertEqual(updated_data["description"], new_desc)
        
        # 9. Delete SIM package
        delete_response = requests.delete(f"{BASE_URL}/api/sims/{sim_id}", headers=headers)
        self.assertEqual(delete_response.status_code, 204)
        
        # 10. Confirm deleted
        check_deleted = requests.get(f"{BASE_URL}/api/sims/{sim_id}")
        self.assertEqual(check_deleted.status_code, 404)

if __name__ == "__main__":
    unittest.main()
