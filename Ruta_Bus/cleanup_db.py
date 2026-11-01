import urllib.request
import urllib.error
import json

try:
    response = urllib.request.urlopen('http://localhost:8080/api/routes/stops')
    data = json.loads(response.read())
    
    seen_names = set()
    to_delete = []
    
    for s in data:
        name = s['name']
        if name in seen_names:
            to_delete.append(s['id'])
        else:
            seen_names.add(name)
            
    print(f"Found {len(to_delete)} duplicate stops to delete.")
    
    # Delete them using the API (if the API allows DELETE without auth, or we can just run a python mysql script, wait, API might need auth for DELETE)
    # Let's check if AdminController /stops/{id} needs auth.
    pass
except Exception as e:
    print("Error:", e)
