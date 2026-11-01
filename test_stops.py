import urllib.request, json
try:
    response = urllib.request.urlopen('http://localhost:8080/api/routes/stops')
    data = json.loads(response.read())
    print(f"Total stops in API: {len(data)}")
    for s in data[-20:]:
        print(f"{s['id']}: {s['name']} (Lat: {s['latitude']}, Lng: {s['longitude']})")
except Exception as e:
    print("Error:", e)
