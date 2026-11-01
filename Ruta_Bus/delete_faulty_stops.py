import os

file_path = r'C:\Users\kevin\Downloads\Ruta_Bus\backend\src\main\java\com\rutabus\config\DataInitializer.java'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'UAD Campus Mazatl' in line:
        continue
    elif 'Playa Las Brujas' in line:
        continue
    elif 'Cobaes 38' in line:
        continue
    elif 'Hospital Militar Regional de Especialidades' in line:
        continue
    elif 'Universidad Autónoma de Occidente (UAdeO)' in line or 'Universidad Autnoma de Occidente (UAdeO)' in line:
        continue
    elif 'Polideportivo UAS' in line:
        continue
    elif 'Ley El Conchi' in line:
        continue
    elif 'Soriana Santa Rosa' in line:
        continue
    elif 'Mercado Hacienda Victoria' in line:
        continue
    else:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Faulty stops deleted successfully!")
