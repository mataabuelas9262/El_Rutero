import csv
import re

csv_file = 'C:\\Users\\kevin\\Downloads\\lugares_mazatlan_verificado (1).csv'
java_file = 'C:\\Users\\kevin\\Downloads\\Ruta_Bus\\backend\\src\\main\\java\\com\\rutabus\\config\\DataInitializer.java'

sql_text = """
(122, 'Universidad Autónoma de Occidente (UAdeO)', 23.243512, -106.415201),
(123, 'Ciudad Universitaria UAS', 23.246522, -106.411130),
(124, 'Polideportivo UAS', 23.247810, -106.413245),
(125, 'Facultad de Informática UAS (FACITE)', 23.246115, -106.409550),
(126, 'Cobaes 38 (Parque Bonfil)', 23.208533, -106.402011),
(127, 'Cobaes 35 (Urías)', 23.189520, -106.381240),
(128, 'CBTIS 127', 23.242130, -106.401020),
(129, 'Estadio El Encanto (Mazatlán FC)', 23.280345, -106.386710),
(130, 'Club Deportivo Muralla', 23.227525, -106.398055),
(131, 'Parque Lineal (Punto Bicentenario)', 23.273010, -106.408033),
(132, 'Unidad Deportiva Toledo Corro', 23.238910, -106.418045),
(133, 'Mercado Miguel Hidalgo (Tianguis de la Juárez)', 23.238920, -106.405530),
(134, 'Tianguis de la Flores Magón (Domingos)', 23.255015, -106.398510),
(135, 'Ley del Mar (Crucero Buelna y Ejército Mex.)', 23.245030, -106.425540),
(136, 'Ley El Conchi', 23.220545, -106.387520),
(137, 'Soriana Santa Rosa', 23.262533, -106.414050),
(138, 'Ley Valles del Ejido', 23.278510, -106.390025),
(139, 'Mercado Hacienda Victoria', 23.265100, -106.405200),
(140, 'Mi Bodega Aurrera (Pradera Dorada)', 23.285515, -106.385010),
(141, 'Clínica 45 IMSS (Seguro Viejo - Av. del Mar)', 23.230120, -106.417855),
(142, 'Hospital Militar Regional de Especialidades', 23.228510, -106.419020),
(143, 'Hospital Margarita Maza de Juárez', 23.235610, -106.412030),
(144, 'Crucero Colosio y Múnich (Juan Pablo II)', 23.245210, -106.395340),
(145, 'Glorieta del Ceviche', 23.242315, -106.435010),
(146, 'Panteón Municipal N° 3 (Renacimiento)', 23.251025, -106.405040),
(147, 'Panteón Municipal N° 4 (Jardín)', 23.275030, -106.395015),
(148, 'Monumento a la Familia', 23.240510, -106.438520),
(149, 'Paso Superior Sur (Salida a Villa Unión)', 23.185010, -106.375020)
"""

lines_output = []
id_counter = 1

# Process CSV
with open(csv_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        nombre = row["nombre"].replace('"', '\\"')
        lat = row["latitud"]
        lng = row["longitud"]
        tipo = row["tipo"]
        direccion = row["direccion"].replace('"', '\\"')
        lines_output.append(f'            new Stop({id_counter}L, "{nombre}", {lat}, {lng}, "{tipo}", "{direccion}")')
        id_counter += 1

# Process SQL
sql_matches = re.findall(r"\((\d+),\s*'([^']+)',\s*([0-9\.\-NULL]+),\s*([0-9\.\-NULL]+)\)", sql_text)
for match in sql_matches:
    _, name, lat, lng = match
    
    # Skip places without coordinates
    if lat == "NULL" or lng == "NULL":
        continue
        
    # Fix typos
    if "CBTIS 127" in name:
        name = name.replace("CBTIS 127", "CETis No. 127")
        
    name_lower = name.lower()
    tipo = "lugar"
    if "universidad" in name_lower or "uas" in name_lower or "cobaes" in name_lower or "cetis" in name_lower or "facultad" in name_lower:
        tipo = "escuela"
    elif "estadio" in name_lower or "deportivo" in name_lower or "parque" in name_lower or "glorieta" in name_lower or "monumento" in name_lower:
        tipo = "parque"
    elif "mercado" in name_lower or "tianguis" in name_lower or "ley" in name_lower or "soriana" in name_lower or "aurrera" in name_lower:
        tipo = "comercio"
    elif "hospital" in name_lower or "clínica" in name_lower or "imss" in name_lower or "issste" in name_lower:
        tipo = "hospital"
    elif "panteón" in name_lower or "crucero" in name_lower or "paso" in name_lower:
        tipo = "lugar"
    
    name = name.replace('"', '\\"')
    lines_output.append(f'            new Stop({id_counter}L, "{name}", {lat}, {lng}, "{tipo}", "")')
    id_counter += 1

stops_code = ',\n'.join(lines_output)
total_stops = len(lines_output)

with open(java_file, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "List<Stop> verifiedStops = Arrays.asList("
end_marker = ");\n        for (Stop s : verifiedStops) {"

start_idx = content.find(start_marker) + len(start_marker)
end_idx = content.find(end_marker)

new_content = content[:start_idx] + "\n" + stops_code + "\n        " + content[end_idx:]

new_content = re.sub(r'if \(s\.getId\(\) > \d+L\) \{', f'if (s.getId() > {total_stops}L) {{', new_content)
new_content = re.sub(r'\d+ lugares oficiales cargados', f'{total_stops} lugares oficiales cargados', new_content)

with open(java_file, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"Successfully updated {java_file} with {total_stops} stops.")
