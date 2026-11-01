import re
import os

# 1. Update map.js to include more categories
map_js_path = r'C:\Users\kevin\Downloads\Ruta_Bus\backend\src\main\resources\static\js\map.js'

with open(map_js_path, 'r', encoding='utf-8') as f:
    map_js = f.read()

new_categories = """    if (type === 'banco' || name.includes('bbva') || name.includes('banorte') || name.includes('santander') || name.includes('banamex') || name.includes('scotiabank') || name.includes('banco')) {
        return { iconUrl: 'assets/icons/pin_tienda.svg', bgColor: '#10B981', category: 'Sucursal Bancaria' };
    }
    if (type === 'gasolinera' || name.includes('gasolinera') || name.includes('pemex') || name.includes('gasmaz') || name.includes('gas station')) {
        return { iconUrl: 'assets/icons/pin_tienda.svg', bgColor: '#F59E0B', category: 'Estaci\u00f3n de Servicio' };
    }
    if (type === 'restaurante' || type === 'comida' || name.includes('restaurante') || name.includes('taquer\u00eda') || name.includes('mariscos') || name.includes('bistro') || name.includes('caf\u00e9') || name.includes('cervecer\u00eda')) {
        return { iconUrl: 'assets/icons/pin_parque.svg', bgColor: '#F43F5E', category: 'Restaurante / Comida' };
    }
    if (type === 'empresa' || type === 'industria' || name.includes('industrial') || name.includes('s.a. de c.v.') || name.includes('grupo') || name.includes('envases')) {
        return { iconUrl: 'assets/icons/pin_tienda.svg', bgColor: '#4B5563', category: 'Empresa / Zona Industrial' };
    }
"""

if "category: 'Sucursal Bancaria'" not in map_js:
    # Insert before the fallback
    fallback_code = "return { iconUrl: 'assets/icons/pin_parada.svg', bgColor: '#475569', category: 'Parada Oficial del Sistema' };"
    map_js = map_js.replace(fallback_code, new_categories + "    " + fallback_code)
    
    with open(map_js_path, 'w', encoding='utf-8') as f:
        f.write(map_js)

# 2. Update DataInitializer.java stop types
data_init_path = r'C:\Users\kevin\Downloads\Ruta_Bus\backend\src\main\java\com\rutabus\config\DataInitializer.java'
with open(data_init_path, 'r', encoding='utf-8') as f:
    data_js = f.read()

# Define name replacements (substring matches)
replacements = {
    "La Puntilla Restaurante": "restaurante",
    "Virgen de La Puntilla": "turistico",
    "OLIVE REEF": "hotel",
    "Sion de Mazatlán": "iglesia",
    "Casona 13 Flechas": "restaurante",
    "Taquería Playa Sur": "restaurante",
    "Hotel Posada 53": "hotel",
    "Hotel Dwana": "hotel",
    "La Quinta Echeguren": "hotel",
    "Arco de Mazatlán": "turistico",
    "El Corazón": "turistico",
    "Secretaría de Marina": "gobierno",
    "Lottus Spa": "comercio",
    "Cañón en La Bateria": "turistico",
    "Instituto Nacional De Migración": "gobierno",
    "EuroBakery": "restaurante",
    "Mariscos El Parguito": "restaurante",
    "Casa Elina": "restaurante",
    "La Antigua (Centro Histórico)": "restaurante",
    "Callejón Liverpool": "turistico",
    "Casas de colores": "turistico",
    "H. Ayuntamiento": "gobierno",
    "Cervecería Tres Islas": "restaurante",
    "Cuarta Zona Naval": "gobierno",
    
    "Maz Industrial": "industria",
    "Servicios Navales e Industriales": "industria",
    "Karey Alimentos S.A. de C.V.": "industria",
    "Roots & Wings International Ministries": "iglesia",
    "Servicios Regionales de Mazatlán SEPyC": "gobierno",
    "Indian Gas Station": "gasolinera",
    "Envases Universales": "industria",
    "Ley Cerro Colorado": "centro_comercial",
    "Parroquia del Espíritu Santo": "iglesia",
    "Salón HA-ALI": "entretenimiento",
    "Bodega Aurrera (Colosio)": "centro_comercial",
    "Coppel Colosio": "centro_comercial",
    "GRUPO SORIAS": "industria",
    "La Palapa Hotel Familiar": "hotel",
    "Gasmaz Gasolineras": "gasolinera",
    "Cobaes 35": "escuela",
    "Club Campestre": "entretenimiento",
    "Parroquia San Rafael Arcángel": "iglesia",
}

import re
# We look for lines with `new Stop(` and extract the name
def replacer(match):
    full_match = match.group(0)
    id_val = match.group(1)
    name = match.group(2)
    lat = match.group(3)
    lng = match.group(4)
    current_type = match.group(5)
    rest = match.group(6)
    
    new_type = current_type
    for key, val in replacements.items():
        if key in name:
            new_type = val
            break
            
    return f'new Stop({id_val}, "{name}", {lat}, {lng}, "{new_type}", {rest}'

pattern = re.compile(r'new Stop\((\d+L),\s*"([^"]+)",\s*([-.\d]+),\s*([-.\d]+),\s*"([^"]+)",\s*(.*?)\)', re.DOTALL)
new_data_js = pattern.sub(replacer, data_js)

if new_data_js != data_js:
    with open(data_init_path, 'w', encoding='utf-8') as f:
        f.write(new_data_js)
    print("Updated DataInitializer.java")
else:
    print("No changes made to DataInitializer.java")

print("Types fixed successfully.")
