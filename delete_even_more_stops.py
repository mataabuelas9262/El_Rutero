import os
import re

file_path = r'C:\Users\kevin\Downloads\Ruta_Bus\backend\src\main\java\com\rutabus\config\DataInitializer.java'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'Panteón Municipal N° 4' in line or 'Pante\xc3\xb3n Municipal N\xc2\xb0 4' in line or 'Panten Municipal N 4' in line:
        continue
    elif 'Ley Valles del Ejido' in line:
        continue
    elif 'Mercado Miguel Hidalgo' in line or 'Tianguis Juárez' in line or 'Tianguis de la Juárez' in line or 'Mercado Municipal Miguel Hidalgo' in line:
        continue
    elif 'Tianguis de la Magón' in line or 'Tianguis de la Flores Magón' in line or 'Tianguis De La Magon' in line or 'MERCADO MUNICIPAL RICARDO FLORES MAGÓN' in line or 'Tianguis de la Flores Magn' in line or 'Mercado Municipal Ricardo Flores Magn' in line:
        continue
    elif 'Club Deportivo Muralla' in line:
        continue
    elif 'List<Long> faultyIds = Arrays.asList(' in line:
        new_lines.append(line.replace(');', ', 234L, 225L, 184L, 220L, 268L, 185L, 186L, 221L, 271L, 272L, 217L);'))
    elif '✅ [DataInitializer] Limpia completa y sincronización exitosa: 260' in line:
        new_lines.append(line.replace('260', '249'))
    else:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Even more stops deleted successfully!")
