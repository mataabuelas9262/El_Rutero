import os
import re

file_path = r'C:\Users\kevin\Downloads\Ruta_Bus\backend\src\main\resources\static\js\admin.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add createDraggableMarker helper and redrawAllStudioMarkers
helper_code = """
function redrawAllStudioMarkers() {
    tempMarkers.forEach(m => mapInstance.removeLayer(m));
    tempMarkers = [];
    
    const pointIcon = L.divIcon({
        className: 'custom-point-marker',
        html: `<div style="background-color: white; border: 2px solid ${typeof studioBaseColor !== 'undefined' ? studioBaseColor : '#ff4b2b'}; width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.4);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });

    drawnCoordinates.forEach(coord => {
        const marker = createDraggableMarker(L.latLng(coord.latitude, coord.longitude), pointIcon);
        tempMarkers.push(marker);
    });
    renderStudioRoute();
    updateStudioCounter();
}

function createDraggableMarker(latlng, icon) {
    const marker = L.marker(latlng, { icon: icon, draggable: true }).addTo(mapInstance);
    
    marker.on('drag', function(e) {
        const idx = tempMarkers.indexOf(marker);
        if (idx !== -1) {
            drawnCoordinates[idx].latitude = e.latlng.lat;
            drawnCoordinates[idx].longitude = e.latlng.lng;
            renderStudioRoute();
        }
    });
    
    // Clic derecho en el marcador para ELIMINARLO
    marker.on('contextmenu', function(e) {
        L.DomEvent.stopPropagation(e);
        const idx = tempMarkers.indexOf(marker);
        if (idx !== -1) {
            drawnCoordinates.splice(idx, 1);
            mapInstance.removeLayer(marker);
            tempMarkers.splice(idx, 1);
            renderStudioRoute();
            updateStudioCounter();
        }
    });
    
    return marker;
}
"""

if "function createDraggableMarker" not in content:
    # Insert helper code before handleMapClickForDrawing
    idx = content.find("function handleMapClickForDrawing")
    content = content[:idx] + helper_code + "\n" + content[idx:]

# 2. Replace L.marker instantiations
# Line 412 in loop: const marker = L.marker(latlng, { icon: pointIcon }).addTo(mapInstance);
content = re.sub(r'const marker = L\.marker\(latlng, \{ icon: pointIcon \}\)\.addTo\(mapInstance\);', 
                 r'const marker = createDraggableMarker(latlng, pointIcon);', content)

# 3. Replace map contextmenu logic
old_context_menu_start = "map.on('contextmenu', (e) => {"
old_context_menu_code = """    map.on('contextmenu', (e) => {
        if (e.originalEvent) {
            e.originalEvent.preventDefault();
        }
        if (drawingMode && drawnCoordinates.length > 0) {
            let closestIdx = -1;
            let minDistance = Infinity;
            
            drawnCoordinates.forEach((coord, idx) => {
                const p1 = map.latLngToLayerPoint(e.latlng);
                const p2 = map.latLngToLayerPoint(L.latLng(coord.latitude, coord.longitude));
                const dist = p1.distanceTo(p2);
                
                if (dist < minDistance) {
                    minDistance = dist;
                    closestIdx = idx;
                }
            });
            
            if (closestIdx !== -1) {
                drawnCoordinates[closestIdx].latitude = e.latlng.lat;
                drawnCoordinates[closestIdx].longitude = e.latlng.lng;
                
                if (tempMarkers[closestIdx]) {
                    tempMarkers[closestIdx].setLatLng(e.latlng);
                }
                
                // Verificar si cay\u00f3 muy cerca de una parada (ej. 40 metros) para auto-asignarla
                let assignedStop = false;
                if (physicalStopsData) {
                    physicalStopsData.forEach(stop => {
                        if (!selectedStopIds.includes(stop.id)) {
                            const stopLatLng = L.latLng(stop.latitude, stop.longitude);
                            if (map.distance(e.latlng, stopLatLng) <= 40) {
                                selectedStopIds.push(stop.id);
                                const markerDiv = document.getElementById(`physical-stop-${stop.id}`);
                                if (markerDiv) {
                                    markerDiv.style.backgroundColor = '#10b981';
                                    markerDiv.style.borderColor = '#059669';
                                    markerDiv.style.transform = 'scale(1.2)';
                                }
                                assignedStop = true;
                            }
                        }
                    });
                }
                
                if (assignedStop) {
                    updateStudioCounter();
                    showToast('Parada vinculada al acercar el trazo.');
                }
                
                renderStudioRoute();
            }
        }
    });"""

new_context_menu_code = """    map.on('contextmenu', (e) => {
        if (e.originalEvent) {
            e.originalEvent.preventDefault();
        }
        // Insertar nuevo punto en el segmento m\u00e1s cercano
        if (drawingMode && drawnCoordinates.length >= 2) {
            let closestIdx = -1;
            let minSumDist = Infinity;
            for (let i = 0; i < drawnCoordinates.length - 1; i++) {
                const p1 = L.latLng(drawnCoordinates[i].latitude, drawnCoordinates[i].longitude);
                const p2 = L.latLng(drawnCoordinates[i+1].latitude, drawnCoordinates[i+1].longitude);
                const sumDist = mapInstance.distance(p1, e.latlng) + mapInstance.distance(p2, e.latlng);
                if (sumDist < minSumDist) {
                    minSumDist = sumDist;
                    closestIdx = i;
                }
            }
            if (closestIdx !== -1) {
                const newCoord = { latitude: e.latlng.lat, longitude: e.latlng.lng };
                drawnCoordinates.splice(closestIdx + 1, 0, newCoord);
                redrawAllStudioMarkers();
                showToast('Punto intermedio insertado.');
            }
        } else if (drawingMode) {
             handleMapClickForDrawing(e.latlng);
        }
    });"""

# Because of potential formatting differences, we can just replace everything between map.on('contextmenu'... and the next listener which is 'mousemove' maybe?
# Let's find map.on('contextmenu', (e) => { and the closing }); before mapElement.addEventListener
import re
pattern = re.compile(r"map\.on\('contextmenu',\s*\([^)]*\)\s*=>\s*\{.*?\n    \}\);", re.DOTALL)
if pattern.search(content):
    content = pattern.sub(new_context_menu_code, content)
else:
    print("Could not find context menu event.")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("File patched successfully.")
