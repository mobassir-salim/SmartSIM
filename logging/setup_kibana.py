import requests
import json
import time

KIBANA_URL = "http://localhost:5601"
HEADERS = {
    "Content-Type": "application/json",
    "kbn-xsrf": "true"
}

def create_data_view():
    url = f"{KIBANA_URL}/api/data_views/data_view"
    payload = {
        "data_view": {
            "title": "smartsim-logs-*",
            "name": "SmartSIM Logs",
            "timeFieldName": "timestamp"
        }
    }
    try:
        response = requests.post(url, headers=HEADERS, json=payload)
        if response.status_code in (200, 201):
            print("Successfully created/updated Kibana Data View: smartsim-logs-*")
            return response.json().get("data_view", {}).get("id")
        else:
            print(f"Failed to create Data View: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Error creating Data View: {e}")
        return None

if __name__ == "__main__":
    print("Waiting for Kibana to be ready...")
    for _ in range(30):
        try:
            res = requests.get(f"{KIBANA_URL}/api/status", headers=HEADERS)
            if res.status_code == 200:
                print("Kibana is ready!")
                break
        except Exception:
            pass
        time.sleep(2)
        
    data_view_id = create_data_view()
    if data_view_id:
        print(f"Data View ID: {data_view_id}")
