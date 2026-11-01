import re

file_path = r'C:\Users\kevin\Downloads\Ruta_Bus\backend\src\main\java\com\rutabus\config\DataInitializer.java'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix Playa Norte
content = re.sub(
    r'new Stop\(36L,\s*"Playa Norte",\s*[\d.-]+,\s*[\d.-]+,\s*"playa",\s*"[^"]+"\),',
    r'new Stop(36L, "Playa Norte", 23.2140, -106.4255, "playa", "Paseo Claussen, Centro"),',
    content
)

# 2. Append new stops
new_stops = """                new Stop(400L, "Cancha Germán Evers", 23.206812, -106.412813, "entretenimiento", ""),
                new Stop(400L, "Las 7 Maravillas", 23.206437, -106.427438, "restaurante", ""),
                new Stop(400L, "Escuela Náutica Mercante \\"Cap. Alt. Antonio Gómez Maqueo\\"", 23.211187, -106.408563, "escuela", ""),
                new Stop(400L, "Hotel Hacienda", 23.215562, -106.421063, "hotel", ""),
                new Stop(400L, "Envases Universales (Centro)", 23.213812, -106.400063, "industria", ""),
                new Stop(400L, "PMA DE SINALOA SA DE CV", 23.215437, -106.402188, "industria", ""),
                new Stop(400L, "Mariscos El Torito", 23.214312, -106.417188, "restaurante", ""),
                new Stop(400L, "BBVA Centro Pyme", 23.220562, -106.418688, "banco", ""),
                new Stop(400L, "Waldo's (Av. Ejercito Mexicano)", 23.222187, -106.418563, "comercio", ""),
                new Stop(400L, "Plaza Elena Maria", 23.220937, -106.421688, "comercio", ""),
                new Stop(400L, "La Jaiba Pata Salada", 23.221437, -106.423937, "restaurante", ""),
                new Stop(400L, "Omnibus De México - Mazatlán", 23.225437, -106.422188, "transporte", ""),
                new Stop(400L, "Hotel Sands Arenas Mazatlán", 23.224687, -106.425938, "hotel", ""),
                new Stop(400L, "Alberca Olímpica Mazatlán", 23.229062, -106.423063, "entretenimiento", ""),
                new Stop(400L, "IMSS Mazatlán (HGZMF 003)", 23.233437, -106.423812, "hospital", ""),
                new Stop(400L, "Hospital Naval de Mazatlan", 23.234312, -106.424937, "hospital", "")
"""

target = 'new Stop(400L, "Parroquia San Rafael Arcángel", 23.231562, -106.392563, "iglesia", "")\n        );'
replacement = 'new Stop(400L, "Parroquia San Rafael Arcángel", 23.231562, -106.392563, "iglesia", ""),\n' + new_stops + '        );'

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success: Updates applied to DataInitializer.java")
else:
    print("Error: Could not find the injection anchor.")
