import csv
import re

csv_file = 'C:\\Users\\kevin\\Downloads\\lugares_mazatlan_verificado (1).csv'
java_file = 'C:\\Users\\kevin\\Downloads\\Ruta_Bus\\backend\\src\\main\\java\\com\\rutabus\\config\\DataInitializer.java'

with open(csv_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    lines = []
    id = 1
    for row in reader:
        nombre = row["nombre"].replace('"', '\\"')
        latitud = row["latitud"]
        longitud = row["longitud"]
        tipo = row["tipo"]
        direccion = row["direccion"].replace('"', '\\"')
        lines.append(f'            new Stop({id}L, "{nombre}", {latitud}, {longitud}, "{tipo}", "{direccion}")')
        id += 1

stops_code = ',\n'.join(lines)
total_stops = len(lines)

with open(java_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the array content
start_marker = "List<Stop> verifiedStops = Arrays.asList("
end_marker = ");\n        for (Stop s : verifiedStops) {"

start_idx = content.find(start_marker) + len(start_marker)
end_idx = content.find(end_marker)

new_content = content[:start_idx] + "\n" + stops_code + "\n        " + content[end_idx:]

# Also update the cleanup limit
new_content = re.sub(r'if \(s\.getId\(\) > \d+L\) \{', f'if (s.getId() > {total_stops}L) {{', new_content)
new_content = re.sub(r'\d+ lugares oficiales cargados', f'{total_stops} lugares oficiales cargados', new_content)

with open(java_file, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"Successfully updated {java_file} with {total_stops} stops.")
