import urllib.request, json
places = [
    'Cobaes 38 Mazatlan', 
    'Ley El Conchi Mazatlan', 
    'Mercado Hacienda Victoria Mazatlan', 
    'Hospital Militar Regional de Especialidades Mazatlan', 
    'Polideportivo UAS Mazatlan', 
    'Universidad Autonoma de Occidente Mazatlan', 
    'Universidad Autonoma de Durango Mazatlan', 
    'Playa las Brujas Mazatlan', 
    'Soriana Santa Rosa Mazatlan'
]
for p in places:
    url = 'https://nominatim.openstreetmap.org/search?q=' + urllib.parse.quote(p) + '&format=json&limit=1'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        data = json.loads(urllib.request.urlopen(req).read())
        if data:
            print(f"{p}: {data[0]['lat']}, {data[0]['lon']}")
        else:
            print(f"{p}: NOT FOUND")
    except Exception as e:
        print(f"{p}: ERROR {e}")
