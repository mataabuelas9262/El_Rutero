import os

file_path = r'C:\Users\kevin\Downloads\Ruta_Bus\backend\src\main\java\com\rutabus\config\DataInitializer.java'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'new Stop(11L, "UAD Campus Mazatl' in line:
        new_lines.append('            new Stop(11L, "UAD Campus Mazatlán", 23.2385, -106.4385, "escuela", "Av. Universidad S/N, Alameda, 82123 Mazatlán"),\n')
    elif 'new Stop(35L, "Playa Las Brujas"' in line:
        new_lines.append('            new Stop(35L, "Playa Las Brujas", 23.30228, -106.48924, "playa", "Playa Las Brujas, Playas"),\n')
    elif 'new Stop(175L, "Cobaes 38 (Casa Redonda)"' in line:
        new_lines.append('            new Stop(175L, "Cobaes 38", 23.21689, -106.40279, "escuela", "Casa Redonda"),\n')
    elif 'new Stop(213L, "Cobaes 38 (Parque Bonfil)"' in line:
        pass # delete
    elif 'new Stop(193L, "Hospital Militar Regional de Especialidades"' in line:
        # Keep it as is (or re-write properly)
        new_lines.append('            new Stop(193L, "Hospital Militar Regional de Especialidades", 23.238754, -106.369970, "hospital", "Proyecto s/n, Rincón de Urías"),\n')
    elif 'new Stop(229L, "Hospital Militar Regional de Especialidades"' in line:
        pass # delete duplicate
    elif 'new Stop(209L, "Universidad Aut' in line and '(UAdeO)"' in line:
        new_lines.append('            new Stop(209L, "Universidad Autónoma de Occidente (UAdeO)", 23.238515, -106.418296, "escuela", ""),\n')
    elif 'new Stop(211L, "Polideportivo UAS"' in line:
        new_lines.append('            new Stop(211L, "Polideportivo UAS", 23.23001, -106.42614, "escuela", ""),\n')
    elif 'new Stop(223L, "Ley El Conchi"' in line:
        new_lines.append('            new Stop(223L, "Ley El Conchi", 23.24162, -106.39151, "comercio", ""),\n')
    elif 'new Stop(224L, "Soriana Santa Rosa"' in line:
        new_lines.append('            new Stop(224L, "Soriana Santa Rosa", 23.25879, -106.40584, "comercio", ""),\n')
    elif 'new Stop(226L, "Mercado Hacienda Victoria"' in line:
        new_lines.append('            new Stop(226L, "Mercado Hacienda Victoria", 23.2595, -106.3810, "comercio", ""),\n')
    else:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Coordinates fixed!")
