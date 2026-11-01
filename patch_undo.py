import os
import re

file_path = r'C:\Users\kevin\Downloads\Ruta_Bus\backend\src\main\resources\static\js\admin.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add historyStack and saveToHistory globally
history_code = """
let historyStack = [];

function saveToHistory() {
    historyStack.push(JSON.parse(JSON.stringify(drawnCoordinates)));
    if (historyStack.length > 50) {
        historyStack.shift();
    }
}
"""
if "let historyStack = [];" not in content:
    # Inject it near drawnCoordinates
    content = content.replace("let drawnCoordinates = [];", "let drawnCoordinates = [];\n" + history_code)

# 2. Patch handleMapClickForDrawing
content = content.replace(
    "    if (!drawingMode) return;\n\n    const coord = { latitude: latlng.lat, longitude: latlng.lng };",
    "    if (!drawingMode) return;\n    saveToHistory();\n\n    const coord = { latitude: latlng.lat, longitude: latlng.lng };"
)

# 3. Patch createDraggableMarker (dragstart and contextmenu)
dragstart_code = """
    marker.on('dragstart', function(e) {
        saveToHistory();
    });
    
    marker.on('drag', function(e) {"""
content = content.replace("    marker.on('drag', function(e) {", dragstart_code)

context_delete_old = """    // Clic derecho en el marcador para ELIMINARLO
    marker.on('contextmenu', function(e) {
        L.DomEvent.stopPropagation(e);
        const idx = tempMarkers.indexOf(marker);"""
context_delete_new = """    // Clic derecho en el marcador para ELIMINARLO
    marker.on('contextmenu', function(e) {
        L.DomEvent.stopPropagation(e);
        saveToHistory();
        const idx = tempMarkers.indexOf(marker);"""
content = content.replace(context_delete_old, context_delete_new)

# 4. Patch map contextmenu (insert)
insert_old = """            if (closestIdx !== -1) {
                const newCoord = { latitude: e.latlng.lat, longitude: e.latlng.lng };"""
insert_new = """            if (closestIdx !== -1) {
                saveToHistory();
                const newCoord = { latitude: e.latlng.lat, longitude: e.latlng.lng };"""
content = content.replace(insert_old, insert_new)

# 5. Patch undoLastPoint
undo_old = """function undoLastPoint() {
    if (drawnCoordinates.length === 0) return;

    drawnCoordinates.pop();
    
    // Quitar el \u00faltimo marcador del mapa
    const lastMarker = tempMarkers.pop();
    if (lastMarker) {
        mapInstance.removeLayer(lastMarker);
    }

    // Rehacer l\u00edneas del Studio con Ida, Regreso y Desplazamiento Lateral
    renderStudioRoute();
    updateStudioCounter();
}"""
undo_new = """function undoLastPoint() {
    if (historyStack.length === 0) {
        showToast('No hay m\u00e1s acciones para deshacer', 'info');
        return;
    }
    drawnCoordinates = historyStack.pop();
    redrawAllStudioMarkers();
}"""
if "drawnCoordinates.pop();" in content and "function undoLastPoint()" in content:
    content = re.sub(r'function undoLastPoint\(\)\s*\{[^}]*drawnCoordinates\.pop\(\);[^}]*updateStudioCounter\(\);\s*\}', undo_new, content)


# 6. Patch clearStudioDrawings and startDirectStudioMode to reset history
clear_old = """function clearStudioDrawings() {
    if (!drawingMode) return;
    
    if (drawnCoordinates.length === 0) {"""
clear_new = """function clearStudioDrawings() {
    if (!drawingMode) return;
    
    if (drawnCoordinates.length === 0) {"""
# wait, actually let's just reset history when exiting drawing mode
exit_old = """function exitDrawingMode() {
    drawingMode = false;"""
exit_new = """function exitDrawingMode() {
    drawingMode = false;
    historyStack = [];"""
content = content.replace(exit_old, exit_new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Undo patched successfully.")
