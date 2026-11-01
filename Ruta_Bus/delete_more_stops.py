import os
import re

file_path = r'C:\Users\kevin\Downloads\Ruta_Bus\backend\src\main\java\com\rutabus\config\DataInitializer.java'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'Facultad de Informática Mazatlán (UAS)' in line or 'Facultad de Inform\xc3\xa1tica Mazatl\xc3\xa1n (UAS)' in line:
        continue
    elif 'Facultad de Informática UAS (FACITE)' in line or 'Facultad de Inform\xc3\xa1tica UAS (FACITE)' in line:
        continue
    elif 'Ciudad Universitaria UAS' in line:
        continue
    elif 'Panteón Municipal N° 3 (Renacimiento)' in line or 'Pante\xc3\xb3n Municipal N\xc2\xb0 3 (Renacimiento)' in line or 'Panten Municipal' in line and '3' in line:
        continue
    elif 'Clínica 45 IMSS (Seguro Viejo' in line or 'Cl\xc3\xadnica 45 IMSS (Seguro Viejo' in line or 'Clnica 45' in line:
        continue
    elif 'Paso Superior Sur (Salida a Villa Unión)' in line or 'Paso Superior Sur' in line:
        continue
    elif 'Cobaes 35' in line:
        continue
    elif 'List<Long> faultyIds = Arrays.asList(' in line:
        new_lines.append(line.replace(');', ', 174L, 212L, 210L, 233L, 228L, 236L, 177L, 214L);'))
    elif '✅ [DataInitializer] Limpia completa y sincronización exitosa: 268' in line:
        new_lines.append(line.replace('268', '260'))
    else:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("More stops deleted successfully!")
