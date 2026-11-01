import os

file_path = r'C:\Users\kevin\Downloads\Ruta_Bus\backend\src\main\java\com\rutabus\config\DataInitializer.java'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'Mazatlán City Hall' in line or 'Mazatl\xc3\xa1n City Hall' in line or 'Mazatln City Hall' in line:
        continue
    if 'Biblioteca Pública Ing. Manuel Bonilla' in line or 'Biblioteca P\xc3\xbablica Ing. Manuel Bonilla' in line or 'Biblioteca Pblica Ing. Manuel Bonilla' in line:
        continue
    
    if 'new Stop(305L, "El Corazón", 23.188812, -106.427188, "lugar", "")' in line or 'new Stop(305L, "El Coraz\xc3\xb3n", 23.188812, -106.427188, "lugar", "")' in line or 'new Stop(305L, "El Corazn", 23.188812, -106.427188, "lugar", "")' in line:
        new_lines.append('            new Stop(305L, "El Corazón", 23.188812, -106.427188, "lugar", ""),\n')
        new_lines.append('            new Stop(306L, "Puerto de Mazatlan", 23.187062, -106.420563, "lugar", ""),\n')
        new_lines.append('            new Stop(307L, "Secretaría de Marina, Capitanía del Puerto Regional de Mazatlán.", 23.189812, -106.419938, "lugar", ""),\n')
        new_lines.append('            new Stop(308L, "Lottus Spa Mazatlán Playa Sur", 23.189937, -106.419562, "lugar", ""),\n')
        new_lines.append('            new Stop(309L, "Cañón en La Bateria", 23.188812, -106.423687, "lugar", ""),\n')
        new_lines.append('            new Stop(310L, "Instituto Nacional De Migración", 23.192812, -106.418937, "lugar", ""),\n')
        new_lines.append('            new Stop(311L, "EuroBakery Playa Sur", 23.194062, -106.421188, "lugar", ""),\n')
        new_lines.append('            new Stop(312L, "Mariscos El Parguito.", 23.195187, -106.417188, "lugar", ""),\n')
        new_lines.append('            new Stop(313L, "Casa Elina | Bistro & Café", 23.194687, -106.425688, "lugar", ""),\n')
        new_lines.append('            new Stop(314L, "La Antigua (Centro Histórico)", 23.196562, -106.423687, "lugar", ""),\n')
        new_lines.append('            new Stop(315L, "Callejón Liverpool", 23.198687, -106.427313, "lugar", ""),\n')
        new_lines.append('            new Stop(316L, "Casas de colores", 23.199437, -106.425313, "lugar", ""),\n')
        new_lines.append('            new Stop(317L, "H. Ayuntamiento de Mazatlán", 23.200187, -106.422313, "lugar", ""),\n')
        new_lines.append('            new Stop(318L, "Cervecería Tres Islas", 23.197812, -106.414938, "lugar", ""),\n')
        new_lines.append('            new Stop(319L, "Cuarta Zona Naval", 23.203312, -106.412313, "lugar", "")\n')
    elif 'List<Long> faultyIds = Arrays.asList(' in line:
        new_lines.append(line.replace(');', ', 65L, 130L);'))
    elif '✅ [DataInitializer] Limpia completa y sincronización exitosa: 272' in line:
        new_lines.append(line.replace('272', '284'))
    else:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Batch applied successfully!")
