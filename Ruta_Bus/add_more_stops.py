import re
import os

raw_text = """Maz Industrial
Latitud: 23.215437

Longitud: -106.375438
Servicios Navales e Industriales
Latitud: 23.212062

Longitud: -106.373812
Karey Alimentos S.A. de C.V.
Latitud: 23.219062

Longitud: -106.375563
Roots & Wings International Ministries
Latitud: 23.214437

Longitud: -106.366313
Servicios Regionales de Mazatlán SEPyC
Latitud: 23.222812

Longitud: -106.375188
Indian Gas Station
Latitud: 23.211688

Longitud: -106.369188
Envases Universales
Latitud: 23.226312

Longitud: -106.382563
Ley Cerro Colorado
Latitud: 23.228062

Longitud: -106.385188
Parroquia del Espíritu Santo
Latitud: 23.223312

Longitud: -106.379313
Salón HA-ALI
Latitud: 23.229812

Longitud: -106.376438
Bodega Aurrera (Colosio)
Latitud: 23.230562

Longitud: -106.387812
Coppel Colosio
Latitud: 23.230937

Longitud: -106.387938
GRUPO SORIAS
Latitud: 23.230937

Longitud: -106.389437
La Palapa Hotel Familiar
Latitud: 23.232437

Longitud: -106.388563
Gasmaz Gasolineras | Colosio
Latitud: 23.232187

Longitud: -106.389313
Cobaes 35
Latitud: 23.232812

Longitud: -106.388188
Club Campestre Mazatlán
Latitud: 23.233312

Longitud: -106.383563
Parroquia San Rafael Arcángel
Latitud: 23.231562

Longitud: -106.392563"""

# Parse the text
lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
places = []
i = 0
while i < len(lines):
    name = lines[i]
    if i + 1 < len(lines) and lines[i+1].startswith("Latitud:"):
        lat = float(lines[i+1].split(":")[1].strip())
        if i + 2 < len(lines) and lines[i+2].startswith("Longitud:"):
            lng = float(lines[i+2].split(":")[1].strip())
            places.append((name, lat, lng))
            i += 3
            continue
    i += 1

file_path = r'C:\Users\kevin\Downloads\Ruta_Bus\backend\src\main\java\com\rutabus\config\DataInitializer.java'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Generate java code
new_code = ""
for p in places:
    # Use id = null since it doesn't matter (we use existsByName and Spring JPA will ignore manually set ids due to IDENTITY, but we need to supply an ID for the constructor. We can just use a high dummy ID like 400L)
    # Actually, the constructor requires Long id, String name, Double latitude, Double longitude, String type, String address
    new_code += f'            new Stop(400L, "{p[0]}", {p[1]}, {p[2]}, "lugar", ""),\n'

# Find the end of the Arrays.asList
# It ends right before "        );" and then "        List<Stop> existingStops = stopRepository.findAll();"
insert_anchor = "        );"
if insert_anchor in content:
    idx = content.rfind(insert_anchor)
    # Insert new code right before the ); but after adding a comma to the previous line if needed.
    # Actually, the previous line is `new Stop(..., ""),` or `new Stop(..., "")`
    # Let's just find the last `new Stop` and make sure it has a comma.
    
    before = content[:idx].rstrip()
    if before.endswith(")"):
        before += ","
    before += "\n" + new_code.rstrip(',\n') + "\n"
    content = before + content[idx:]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Injected {len(places)} places successfully.")
else:
    print("Anchor not found.")
