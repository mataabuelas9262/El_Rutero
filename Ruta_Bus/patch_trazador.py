import re

file_path = r'C:\Users\kevin\Downloads\Ruta_Bus\trazador_alianza.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to replace the state variables and functions up to 'function exportRoute()'
start_marker = "// Estado Global"
end_marker = "// Función Exportar"

new_script = """// Estado Global
        let coordinates = [];
        let polyline = null;
        let markers = [];
        let historyStack = [];

        // Colores y Estilos
        const routeColor = '#6366f1'; // Azul indigo elegante
        
        function saveToHistory() {
            historyStack.push(JSON.parse(JSON.stringify(coordinates)));
        }

        // Función para actualizar contador
        function updateCounter() {
            document.getElementById('points-counter').textContent = `${coordinates.length} puntos trazados`;
        }

        function createDraggableMarker(latlng, index) {
            const isStart = index === 0;
            const isEnd = index === coordinates.length - 1 && coordinates.length > 1;
            
            let color = '#ffffff';
            let bgColor = routeColor;
            let radius = 4;
            
            if (isStart) { bgColor = '#10b981'; radius = 6; } // Verde inicio
            if (isEnd) { bgColor = '#ef4444'; radius = 6; }   // Rojo fin

            const iconHtml = `<div style="background-color: ${bgColor}; width: ${radius*2}px; height: ${radius*2}px; border-radius: 50%; border: 2px solid ${color}; box-shadow: 0 1px 3px rgba(0,0,0,0.4);"></div>`;
            
            const icon = L.divIcon({
                html: iconHtml,
                className: 'custom-div-icon',
                iconSize: [radius*2 + 4, radius*2 + 4],
                iconAnchor: [radius + 2, radius + 2]
            });

            const marker = L.marker(latlng, { icon: icon, draggable: true }).addTo(map);

            marker.on('dragstart', function() {
                saveToHistory();
            });

            marker.on('drag', function(e) {
                const idx = markers.indexOf(marker);
                if (idx !== -1) {
                    coordinates[idx] = [e.latlng.lat, e.latlng.lng];
                    renderLineOnly();
                }
            });

            marker.on('contextmenu', function(e) {
                L.DomEvent.stopPropagation(e);
                saveToHistory();
                const idx = markers.indexOf(marker);
                if (idx !== -1) {
                    coordinates.splice(idx, 1);
                    redrawAll();
                }
            });

            return marker;
        }

        function renderLineOnly() {
            if (polyline) map.removeLayer(polyline);
            if (coordinates.length === 0) return;
            polyline = L.polyline(coordinates, {
                color: routeColor,
                weight: 5,
                opacity: 0.8,
                smoothFactor: 1
            }).addTo(map);
        }

        function redrawAll() {
            if (polyline) map.removeLayer(polyline);
            markers.forEach(m => map.removeLayer(m));
            markers = [];

            if (coordinates.length === 0) {
                updateCounter();
                return;
            }

            polyline = L.polyline(coordinates, {
                color: routeColor,
                weight: 5,
                opacity: 0.8,
                smoothFactor: 1
            }).addTo(map);

            coordinates.forEach((coord, i) => {
                markers.push(createDraggableMarker(coord, i));
            });

            updateCounter();
        }

        // EVENTO: Clic Izquierdo para agregar puntos
        map.on('click', (e) => {
            saveToHistory();
            const { lat, lng } = e.latlng;
            coordinates.push([lat, lng]);
            redrawAll();
        });

        // EVENTO: Clic Derecho en el mapa para insertar punto en la línea
        map.on('contextmenu', (e) => {
            if (coordinates.length < 2) return;
            
            const clickLatLng = e.latlng;
            let closestSegmentIdx = -1;
            let minDistanceToSegment = Infinity;
            let insertLatLng = null;

            for (let i = 0; i < coordinates.length - 1; i++) {
                const p1 = L.latLng(coordinates[i][0], coordinates[i][1]);
                const p2 = L.latLng(coordinates[i+1][0], coordinates[i+1][1]);
                const p0 = clickLatLng;
                
                const L2 = (p1.lat - p2.lat)**2 + (p1.lng - p2.lng)**2;
                let t = ((p0.lat - p1.lat) * (p2.lat - p1.lat) + (p0.lng - p1.lng) * (p2.lng - p1.lng)) / L2;
                t = Math.max(0, Math.min(1, t));
                
                const projLat = p1.lat + t * (p2.lat - p1.lat);
                const projLng = p1.lng + t * (p2.lng - p1.lng);
                
                const dist = map.distance(p0, L.latLng(projLat, projLng));
                
                if (dist < minDistanceToSegment) {
                    minDistanceToSegment = dist;
                    closestSegmentIdx = i;
                    insertLatLng = [projLat, projLng];
                }
            }

            if (closestSegmentIdx !== -1 && minDistanceToSegment < 100) {
                saveToHistory();
                coordinates.splice(closestSegmentIdx + 1, 0, insertLatLng);
                redrawAll();
                showToast('Punto intermedio insertado 📍');
            }
        });

        // Bloquear menú nativo de clic derecho
        document.getElementById('map').addEventListener('contextmenu', (e) => e.preventDefault());

        // Función Deshacer
        function undoLastPoint() {
            if (historyStack.length === 0) {
                showToast('No hay más acciones para deshacer');
                return;
            }
            coordinates = historyStack.pop();
            redrawAll();
        }

        // Función Limpiar
        function clearMap() {
            if (coordinates.length > 0 && confirm('¿Estás seguro de que deseas limpiar todo tu progreso?')) {
                saveToHistory();
                coordinates = [];
                redrawAll();
            }
        }

        """

if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    new_content = content[:start_idx] + new_script + content[end_idx:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("trazador_alianza.html updated successfully!")
else:
    print("Markers not found in trazador_alianza.html.")
