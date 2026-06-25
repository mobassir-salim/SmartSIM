import requests
import json
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://localhost"

def test_flow():
    # 1. Login as customer
    print("--> Logging in as customer...")
    login_res = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "customer@smartsim.com", "password": "customer123"},
        verify=False
    )
    print("Login Response Status:", login_res.status_code)
    login_data = login_res.json()
    token = login_data.get("access_token")
    if not token:
        print("Login failed! Details:", login_data)
        return
    print("Login successful! Token acquired.")

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 2. Check active reservation (should be empty initially)
    print("\n--> Checking active-reservation endpoint on load...")
    active_res = requests.get(f"{BASE_URL}/api/numbers/active-reservation", headers=headers, verify=False)
    print("Active reservation status:", active_res.status_code)
    print("Active reservation data:", active_res.json())

    # 3. Get available numbers
    print("\n--> Fetching available numbers...")
    numbers_res = requests.get(f"{BASE_URL}/api/numbers", verify=False)
    print("Numbers Response Status:", numbers_res.status_code)
    numbers = numbers_res.json()
    print("Available numbers count:", len(numbers))
    
    available_msisdn = None
    for num in numbers:
        if num["status"] == "AVAILABLE":
            available_msisdn = num["msisdn"]
            break
            
    if not available_msisdn:
        print("No available numbers found! Current numbers:", numbers)
        return
    print(f"Selected available number: {available_msisdn}")

    # 4. Reserve the number
    print(f"\n--> Reserving number: {available_msisdn}...")
    reserve_res = requests.post(
        f"{BASE_URL}/api/numbers/reserve",
        json={"msisdn": available_msisdn},
        headers=headers,
        verify=False
    )
    print("Reserve Response Status:", reserve_res.status_code)
    print("Reserve Response Details:", reserve_res.json())
    if reserve_res.status_code != 200:
        print("Reservation failed!")
        return

    # 5. Check active reservation again (should be the reserved number)
    print("\n--> Checking active-reservation endpoint after reservation...")
    active_res = requests.get(f"{BASE_URL}/api/numbers/active-reservation", headers=headers, verify=False)
    print("Active reservation status:", active_res.status_code)
    print("Active reservation data:", active_res.json())
    assert active_res.json() is not None, "Reservation should not be empty!"
    assert active_res.json()["msisdn"] == available_msisdn, "Mismatched reserved msisdn!"

    # 6. Place order
    print("\n--> Placing order...")
    order_payload = {
        "items": [
            {
                "item_type": "SIM",
                "item_id": "1",
                "quantity": 1
            }
        ],
        "msisdn": available_msisdn,
        "customer_info": {
            "name": "Alice Customer",
            "father_name": "John Customer",
            "dob": "1995-05-12",
            "gender": "Female",
            "alternate_mobile": "9777777777",
            "address": "123 Tech Lane",
            "city": "Delhi",
            "state": "Delhi",
            "pin_code": "110001",
            "country": "India",
            "id_type": "Aadhaar",
            "id_number": "1234-5678-9012"
        }
    }
    
    order_res = requests.post(
        f"{BASE_URL}/api/orders",
        json=order_payload,
        headers=headers,
        verify=False
    )
    print("Order Response Status:", order_res.status_code)
    print("Order Response Details:", json.dumps(order_res.json(), indent=2))
    
    # 7. Check active reservation again (should be empty now since it is allocated/completed)
    print("\n--> Checking active-reservation endpoint after order placement...")
    active_res = requests.get(f"{BASE_URL}/api/numbers/active-reservation", headers=headers, verify=False)
    print("Active reservation status:", active_res.status_code)
    print("Active reservation data:", active_res.json())

    # 8. Check active SIM assignments
    print("\n--> Checking customer active SIM assignments...")
    assignments_res = requests.get(f"{BASE_URL}/api/sims/assignments", headers=headers, verify=False)
    print("Assignments Response Status:", assignments_res.status_code)
    assignments = assignments_res.json()
    print("Active SIM count:", len(assignments))
    print("Active SIM details:", json.dumps(assignments, indent=2))

if __name__ == "__main__":
    test_flow()
