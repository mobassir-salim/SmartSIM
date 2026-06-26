import requests
import json
import time

KIBANA_URL = "http://127.0.0.1:5601"
HEADERS = {
    "kbn-xsrf": "true"
}

NDJSON_CONTENT = """{"type":"dashboard","id":"service-health","attributes":{"title":"[SmartSIM] Service Health Dashboard","description":"Monitors errors, warnings, exception counts, and health trends across all services.","hits":0,"panelsJSON":"[]","optionsJSON":"{\\"useMargins\\":true}","version":1,"timeRestore":false,"kibanaSavedObjectMeta":{"searchSourceJSON":"{\\"query\\":{\\"query\\":\\"level : (ERROR or CRITICAL)\\",\\"language\\":\\"kuery\\"},\\"filter\\":[]}"}}}
{"type":"dashboard","id":"authentication","attributes":{"title":"[SmartSIM] Authentication Dashboard","description":"Tracks login success rate, failed logins, OTP verification, and JWT token errors.","hits":0,"panelsJSON":"[]","optionsJSON":"{\\"useMargins\\":true}","version":1,"timeRestore":false,"kibanaSavedObjectMeta":{"searchSourceJSON":"{\\"query\\":{\\"query\\":\\"service : \\"auth-service\\"\\",\\"language\\":\\"kuery\\"},\\"filter\\":[]}"}}}
{"type":"dashboard","id":"orders","attributes":{"title":"[SmartSIM] Order Dashboard","description":"Monitors order creation, checkout errors, purchase pipelines, and transaction failures.","hits":0,"panelsJSON":"[]","optionsJSON":"{\\"useMargins\\":true}","version":1,"timeRestore":false,"kibanaSavedObjectMeta":{"searchSourceJSON":"{\\"query\\":{\\"query\\":\\"service : \\"order-service\\"\\",\\"language\\":\\"kuery\\"},\\"filter\\":[]}"}}}
{"type":"dashboard","id":"wallet","attributes":{"title":"[SmartSIM] Wallet Dashboard","description":"Tracks wallet credits, debits, insufficient funds, and transaction histories.","hits":0,"panelsJSON":"[]","optionsJSON":"{\\"useMargins\\":true}","version":1,"timeRestore":false,"kibanaSavedObjectMeta":{"searchSourceJSON":"{\\"query\\":{\\"query\\":\\"service : \\"wallet-service\\"\\",\\"language\\":\\"kuery\\"},\\"filter\\":[]}"}}}
"""

def import_dashboards():
    url = f"{KIBANA_URL}/api/saved_objects/_import?createNewCopies=true"
    files = {
        'file': ('dashboards.ndjson', NDJSON_CONTENT, 'application/octet-stream')
    }
    try:
        response = requests.post(url, headers=HEADERS, files=files)
        if response.status_code == 200:
            print("Successfully imported dashboards to Kibana!")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"Failed to import dashboards: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error importing dashboards: {e}")

if __name__ == "__main__":
    print("Waiting for Kibana API...")
    time.sleep(2)
    import_dashboards()
