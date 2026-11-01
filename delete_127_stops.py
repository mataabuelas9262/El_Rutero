import os

file_path = r'C:\Users\kevin\Downloads\Ruta_Bus\backend\src\main\java\com\rutabus\config\DataInitializer.java'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'CETIS 127' in line or 'Cetis 127' in line or 'CBTIS 127' in line:
        continue
    elif 'List<Long> faultyIds = Arrays.asList(' in line:
        new_lines.append(line.replace(');', ', 178L, 215L, 264L);'))
    elif '✅ [DataInitializer] Limpia completa y sincronización exitosa: 271' in line:
        new_lines.append(line.replace('271', '268'))
    else:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("127 stops deleted successfully!")
