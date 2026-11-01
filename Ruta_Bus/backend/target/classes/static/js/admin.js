/* -----------------------------------------------------
   LÓGICA DEL PANEL DE ADMINISTRACIÓN (Ruta_Bus)
   ----------------------------------------------------- */

let adminRoutes = [];
let selectedRouteId = null;

// Estados del mapa en edición
let drawingMode = false;       // Trazar línea de calles
let stopCreationMode = false;  // Colocar una nueva parada
let drawnCoordinates = [];

let historyStack = [];

function saveToHistory() {
    historyStack.push(JSON.parse(JSON.stringify(drawnCoordinates)));
    if (historyStack.length > 50) {
        historyStack.shift();
    }
}
     // [{latitude, longitude}]
let selectedStopIds = [];      // [stopId] (en orden)
let tempPolyline = null;       // Línea temporal dibujada en caliente
let studioBaseColor = '#ff4b2b'; // Color principal activo para el Studio
let tempMarkers = [];          // Marcadores temporales de trazado
let tempArrows = [];           // Flechas de dirección temporales en el Studio
let physicalStopsData = [];    // Lista de paradas físicas cargadas de la DB

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inicializar sesión. Si no es admin, fuera
    await Auth.init();
    if (!Auth.user || Auth.user.role !== 'ROLE_ADMIN') {
        window.location.href = 'index.html';
        return;
    }

    // 2. Inicializar el mapa de Leaflet
    const map = initLeafletMap('map');

    // 3. Cargar rutas y paradas físicas
    await refreshAdminRoutes();
    await refreshPhysicalStops();

    // 4. Configurar eventos del panel
    setupAdminEventListeners(map);
});

// Obtiene y recarga la lista de rutas en el panel lateral del admin
async function refreshAdminRoutes() {
    try {
        adminRoutes = await Api.getRoutes();
        renderAdminRoutes(adminRoutes);
    } catch (err) {
        showToast('Error al cargar rutas administrativas', 'error');
    }
}

// Renderiza las rutas con botones de acción (Editar, Borrar, Trazar)
function renderAdminRoutes(routes) {
    const listContainer = document.getElementById('route-list');
    listContainer.innerHTML = '';

    if (routes.length === 0) {
        listContainer.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:0.9rem; padding: 20px;">No hay rutas. Crea una para empezar.</div>`;
        return;
    }

    routes.forEach(route => {
        const card = document.createElement('div');
        card.className = 'route-card';
        card.dataset.id = route.id;
        
        card.innerHTML = `
            <div class="route-indicator" style="background-color: ${route.color}; color: ${route.color};"></div>
            <div class="route-info">
                <div class="route-name">${route.name}</div>
                <div class="route-desc">${route.description || 'Sin descripción.'}</div>
                <div class="admin-header-actions" style="margin-top: 10px;">
                    <button class="btn btn-secondary" onclick="event.stopPropagation(); startTrazadoMode(${route.id}, '${route.color}')" style="padding: 6px 12px; font-size: 0.8rem; width: auto;">
                        🗺️ Trazar
                    </button>
                    <button class="route-actions-btn" onclick="event.stopPropagation(); openEditRouteModal(${route.id})" title="Editar Info">✏️</button>
                    <button class="route-actions-btn" onclick="event.stopPropagation(); confirmDeleteRoute(${route.id})" title="Eliminar Ruta" style="color:var(--danger)">🗑️</button>
                </div>
            </div>
        `;

        card.addEventListener('click', () => selectRouteAdmin(route.id, card));
        listContainer.appendChild(card);
    });
}

// Selecciona una ruta y muestra su trazado actual
async function selectRouteAdmin(routeId, cardElement) {
    if (drawingMode) {
        const msg = drawnCoordinates.length > 0 
            ? `⚠️ Tienes ${drawnCoordinates.length} puntos trazados sin guardar en el Studio. ¿Estás seguro de que deseas salir del modo trazado y descartar tus cambios para ver otra ruta?`
            : 'Estás en modo de trazado. ¿Deseas salir sin guardar los cambios?';
        if (!confirm(msg)) {
            return;
        }
        exitDrawingMode();
    }

    document.querySelectorAll('.route-card').forEach(c => c.classList.remove('active'));
    if (cardElement) cardElement.classList.add('active');

    selectedRouteId = routeId;

    try {
        clearMapDrawings();

        const route = adminRoutes.find(r => r.id === routeId);
        
        // Cargar trazado
        const coords = await Api.getRouteCoordinates(routeId);
        drawRouteLine(coords, route.color);

        // Cargar paradas
        const stops = await Api.getRouteStops(routeId);
        drawRouteStops(stops, route.color);

    } catch (err) {
        showToast('Error al visualizar ruta seleccionada', 'error');
    }
}

// Obtiene todas las paradas de la base de datos y las dibuja interactivamente en el mapa
async function refreshPhysicalStops() {
    try {
        physicalStopsData = await Api.getAllStops();
        
        // Limpiar marcadores físicos previos
        allStopsMarkers.forEach(m => mapInstance.removeLayer(m));
        allStopsMarkers = [];

        physicalStopsData.forEach(stop => {
            const config = (typeof getStopIconConfig === 'function') ? getStopIconConfig(stop.name, stop.type) : { iconUrl: 'assets/icons/pin_parada.svg', bgColor: '#475569' };
            const stopIcon = L.divIcon({
                className: 'physical-stop-marker-admin',
                html: `<div style="background-color: ${config.bgColor}; border: 2px solid white; width: 22px; height: 22px; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; cursor: pointer;" id="physical-stop-${stop.id}">
                         <img src="${config.iconUrl}" alt="" style="width: 12px; height: 12px; filter: brightness(0) invert(1); pointer-events: none;">
                       </div>`,
                iconSize: [22, 22],
                iconAnchor: [11, 11]
            });

            // Marcador físico en el mapa
            const marker = L.marker([stop.latitude, stop.longitude], { icon: stopIcon })
                .addTo(mapInstance);

            // Al hacer clic en un marcador de parada física en modo de trazado, se asocia a la ruta
            marker.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                if (drawingMode) {
                    addStopToRouteDrawing(stop);
                } else {
                    // Mostrar popup con opción de eliminar parada física
                    marker.bindPopup(`
                        <div style="font-family: 'Inter', sans-serif; min-width: 170px;">
                            <span style="font-size: 0.7rem; background: ${config.bgColor}15; color: ${config.bgColor}; padding: 2px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase; display: inline-block; margin-bottom: 4px;">${config.category || 'Punto de Interés'}</span>
                            <h4 style="margin:0 0 4px 0; color:#1f2937; font-size: 0.9rem;">${stop.name}</h4>
                            <p style="margin: 0 0 6px 0; color: #475569; font-size: 0.78rem;">📍 ${stop.address || 'Mazatlán, Sinaloa'}</p>
                            <button class="btn btn-danger" onclick="confirmDeleteStop(${stop.id})" style="padding: 4px 8px; font-size:0.75rem; width:100%; border-radius:4px;">
                                Eliminar Parada Física
                            </button>
                        </div>
                    `).openPopup();
                }
            });

            allStopsMarkers.push(marker);
        });
    } catch (err) {
        console.error("Error al refrescar paradas físicas", err);
    }
}

// -----------------------------------------------------
// MODO TRAZADO: DIBUJAR COORDENADAS Y AGREGAR PARADAS A LA RUTA
// -----------------------------------------------------

// Renderiza las líneas y flechas del Studio en vivo separando Ida y Regreso con desplazamiento anti-amontonamiento
// Renderiza la línea y flechas del Studio en vivo pasando exactamente por los puntos trazados
function renderStudioRoute() {
    if (tempPolyline) { mapInstance.removeLayer(tempPolyline); tempPolyline = null; }
    if (typeof tempArrows !== 'undefined' && tempArrows) {
        tempArrows.forEach(a => mapInstance.removeLayer(a));
        tempArrows = [];
    }

    if (!drawnCoordinates || drawnCoordinates.length === 0) return;

    const baseColor = typeof studioBaseColor !== 'undefined' && studioBaseColor ? studioBaseColor : '#ff4b2b';
    const latLngs = drawnCoordinates.map(c => [c.latitude, c.longitude]);

    tempPolyline = L.polyline(latLngs, {
        color: baseColor,
        weight: 5,
        opacity: 0.9,
        lineJoin: 'round'
    }).addTo(mapInstance);

    if (drawnCoordinates.length >= 2 && typeof drawRouteArrows === 'function') {
        const arrows = drawRouteArrows(latLngs, baseColor);
        tempArrows.push(...arrows);
    }
}

function updateStudioCounter() {
    const counterEl = document.getElementById('studio-points-counter');
    if (counterEl) {
        counterEl.innerHTML = `📍 ${drawnCoordinates.length} puntos trazados | 🚏 ${selectedStopIds.length} paradas vinculadas`;
    }
    
    if (typeof renderStopSequenceManager === 'function') {
        renderStopSequenceManager();
    }
}

// -----------------------------------------------------
// Gestor de Secuencia de Paradas (UI Panel)
// -----------------------------------------------------
function renderStopSequenceManager() {
    const listContainer = document.getElementById('stop-sequence-list');
    const countSpan = document.getElementById('sequence-count');
    if (!listContainer || !countSpan) return;

    countSpan.textContent = selectedStopIds.length.toString();

    if (selectedStopIds.length === 0) {
        listContainer.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:0.75rem; padding: 12px 0; font-style: italic;">No hay paradas vinculadas.</div>`;
        return;
    }

    listContainer.innerHTML = '';
    selectedStopIds.forEach((stopId, index) => {
        const stop = physicalStopsData.find(s => s.id === stopId);
        if (!stop) return;

        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'space-between';
        item.style.padding = '6px 8px';
        item.style.background = 'white';
        item.style.border = '1px solid #e2e8f0';
        item.style.borderRadius = '6px';
        item.style.fontSize = '0.75rem';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = `${index + 1}. ${stop.name}`;
        nameSpan.style.whiteSpace = 'nowrap';
        nameSpan.style.overflow = 'hidden';
        nameSpan.style.textOverflow = 'ellipsis';
        nameSpan.style.flex = '1';
        nameSpan.style.marginRight = '8px';
        nameSpan.style.fontWeight = '500';
        nameSpan.style.color = 'var(--text-dark)';

        const btnsDiv = document.createElement('div');
        btnsDiv.style.display = 'flex';
        btnsDiv.style.gap = '4px';

        const upBtn = document.createElement('button');
        upBtn.innerHTML = '▲';
        upBtn.style.padding = '2px 6px';
        upBtn.style.border = '1px solid #cbd5e1';
        upBtn.style.background = '#f1f5f9';
        upBtn.style.borderRadius = '4px';
        upBtn.style.cursor = index === 0 ? 'not-allowed' : 'pointer';
        upBtn.style.opacity = index === 0 ? '0.5' : '1';
        upBtn.title = "Mover arriba";
        if (index > 0) {
            upBtn.onclick = () => moveStopInSequence(index, -1);
        }

        const downBtn = document.createElement('button');
        downBtn.innerHTML = '▼';
        downBtn.style.padding = '2px 6px';
        downBtn.style.border = '1px solid #cbd5e1';
        downBtn.style.background = '#f1f5f9';
        downBtn.style.borderRadius = '4px';
        downBtn.style.cursor = index === selectedStopIds.length - 1 ? 'not-allowed' : 'pointer';
        downBtn.style.opacity = index === selectedStopIds.length - 1 ? '0.5' : '1';
        downBtn.title = "Mover abajo";
        if (index < selectedStopIds.length - 1) {
            downBtn.onclick = () => moveStopInSequence(index, 1);
        }
        
        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '❌';
        removeBtn.style.padding = '2px 4px';
        removeBtn.style.border = 'none';
        removeBtn.style.background = 'transparent';
        removeBtn.style.cursor = 'pointer';
        removeBtn.title = "Desvincular parada";
        removeBtn.onclick = () => {
            selectedStopIds.splice(index, 1);
            updateStudioCounter();
            // Revertir estilo visual del marcador en el mapa
            const markerDiv = document.getElementById(`physical-stop-${stop.id}`);
            if (markerDiv) {
                markerDiv.style.backgroundColor = 'white';
                markerDiv.style.borderColor = '#94a3b8';
                markerDiv.style.transform = 'scale(1)';
            }
        };

        btnsDiv.appendChild(upBtn);
        btnsDiv.appendChild(downBtn);
        btnsDiv.appendChild(removeBtn);

        item.appendChild(nameSpan);
        item.appendChild(btnsDiv);
        listContainer.appendChild(item);
    });
}

function moveStopInSequence(index, direction) {
    if (index + direction < 0 || index + direction >= selectedStopIds.length) return;
    
    // Intercambiar elementos en el arreglo principal
    const temp = selectedStopIds[index];
    selectedStopIds[index] = selectedStopIds[index + direction];
    selectedStopIds[index + direction] = temp;
    
    // Forzar actualización visual (sólo repinta la lista)
    renderStopSequenceManager();
}

function startDirectStudioMode() {
    if (drawingMode && drawnCoordinates.length > 0) {
        if (!confirm(`⚠️ Tienes ${drawnCoordinates.length} puntos trazados sin guardar en el Studio. ¿Estás seguro de que deseas iniciar un nuevo trazado desde cero y descartar el progreso actual?`)) {
            return;
        }
    }
    clearMapDrawings();
    
    try {
        if (!history.state || !history.state.studio) {
            history.pushState({ studio: true }, "Studio de Trazado", window.location.href);
        }
    } catch (e) {}

    selectedRouteId = null; // null indica que estamos creando una ruta nueva desde cero en el Studio
    drawingMode = true;
    stopCreationMode = false;
    drawnCoordinates = [];
    selectedStopIds = [];
    studioBaseColor = '#ff4b2b';
    
    document.getElementById('admin-tool-indicator').classList.add('visible');
    document.getElementById('admin-draw-actions').style.display = 'flex';
    document.getElementById('main-list-section').style.display = 'none';

    const btnSave = document.getElementById('btn-save-draw');
    if (btnSave) btnSave.innerHTML = `🚀 Finalizar: Datos y Mandar a BD ➔`;

    renderStudioRoute();
    updateStudioCounter();
    showToast('🗺️ Studio Activo: Haz clics en las calles para dibujar el trayecto o importa con JSON/SQL.');
}

// Inicia el modo de creación de nueva ruta en el mapa
async function startTrazadoMode(routeId, color) {
    if (drawingMode && selectedRouteId !== routeId && drawnCoordinates.length > 0) {
        if (!confirm(`⚠️ Tienes ${drawnCoordinates.length} puntos trazados sin guardar en la ruta actual. ¿Estás seguro de que deseas cambiar a otra ruta y descartar las modificaciones no guardadas?`)) {
            return;
        }
    }
    clearMapDrawings();
    
    try {
        if (!history.state || !history.state.studio) {
            history.pushState({ studio: true }, "Studio de Trazado", window.location.href);
        }
    } catch (e) {}

    const route = typeof adminRoutes !== 'undefined' ? adminRoutes.find(r => r.id === routeId) : null;

    selectedRouteId = routeId;
    drawingMode = true;
    stopCreationMode = false;
    studioBaseColor = color || (route ? route.color : '#6366f1');

    drawnCoordinates = [];
    tempMarkers = [];
    selectedStopIds = [];
    
    // UI
    document.getElementById('admin-tool-indicator').classList.add('visible');
    document.getElementById('admin-draw-actions').style.display = 'flex';
    document.getElementById('main-list-section').style.display = 'none';

    const btnSave = document.getElementById('btn-save-draw');
    if (btnSave) btnSave.innerHTML = `💾 Actualizar Trazado en Base de Datos ➔`;

    showToast('Cargando el trazado existente de la ruta desde la BD...');

    try {
        // Cargar coordenadas y paradas reales desde la API del backend
        const [coords, stops] = await Promise.all([
            Api.getRouteCoordinates(routeId),
            Api.getRouteStops(routeId)
        ]);

        if (coords && coords.length > 0) {
            coords.forEach(c => {
                const lat = c.latitude !== undefined ? parseFloat(c.latitude) : parseFloat(c[0]);
                const lng = c.longitude !== undefined ? parseFloat(c.longitude) : parseFloat(c[1]);
                if (!isNaN(lat) && !isNaN(lng)) {
                    drawnCoordinates.push({ latitude: lat, longitude: lng });

                    const latlng = L.latLng(lat, lng);
                    const pointIcon = L.divIcon({
                        className: 'temp-point-marker',
                        html: `<div style="background-color: white; border: 2px solid #6366f1; width: 8px; height: 8px; border-radius: 50%;"></div>`,
                        iconSize: [8, 8],
                        iconAnchor: [4, 4]
                    });
                    const marker = createDraggableMarker(latlng, pointIcon);
                    tempMarkers.push(marker);
                }
            });
        }

        if (stops && stops.length > 0) {
            stops.forEach(s => {
                if (s && s.stop && s.stop.id) {
                    selectedStopIds.push(s.stop.id);
                } else if (s && s.id) {
                    selectedStopIds.push(s.id);
                }
            });
        }

        renderStudioRoute();
        updateStudioCounter();
        
        if (drawnCoordinates.length > 0) {
            const bounds = L.latLngBounds(drawnCoordinates.map(c => [c.latitude, c.longitude]));
            mapInstance.fitBounds(bounds, { padding: [40, 40] });
            showToast(`🗺️ Studio Activo: Cargados ${drawnCoordinates.length} puntos de "${route ? route.name : 'la ruta'}". Puedes modificar o añadir puntos.`, 'success');
        } else {
            showToast('Modo trazado activo. Esta ruta aún no tiene puntos en la BD. Haz clics para trazar.');
        }
    } catch (err) {
        showToast('Error al cargar coordenadas de la ruta: ' + err.message, 'error');
    }
}

// Agrega una coordenada al trazado cuando se hace clic en el mapa

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
    

    marker.on('dragstart', function(e) {
        saveToHistory();
    });
    
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
        saveToHistory();
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

function handleMapClickForDrawing(latlng) {
    if (!drawingMode) return;
    saveToHistory();

    const coord = { latitude: latlng.lat, longitude: latlng.lng };
    drawnCoordinates.push(coord);

    // Actualizar polilíneas de Ida y Regreso con desplazamiento lateral
    renderStudioRoute();

    // Crear un pequeño marcador temporal para el punto de control
    const pointIcon = L.divIcon({
        className: 'temp-point-marker',
        html: `<div style="background-color: white; border: 2px solid #6366f1; width: 8px; height: 8px; border-radius: 50%;"></div>`,
        iconSize: [8, 8],
        iconAnchor: [4, 4]
    });

    const marker = createDraggableMarker(latlng, pointIcon);
    tempMarkers.push(marker);
    updateStudioCounter();
}

// Añade una parada a la ruta en el orden del trazado
function addStopToRouteDrawing(stop) {
    if (selectedStopIds.includes(stop.id)) {
        showToast('Esta parada ya está asociada a la ruta', 'error');
        return;
    }
    
    selectedStopIds.push(stop.id);

    // Cambiar color visual de la parada física elegida temporalmente
    const markerEl = document.getElementById(`physical-stop-${stop.id}`);
    if (markerEl) {
        markerEl.style.backgroundColor = '#10b981'; // Verde para indicar asignada
        markerEl.style.transform = 'scale(1.3)';
    }

    updateStudioCounter();
    showToast(`Parada "${stop.name}" añadida como parada #${selectedStopIds.length} de la ruta.`);
}

// Guarda la geometría dibujada o pasa al paso de datos si es creación
async function saveRouteGeometry() {
    if (drawnCoordinates.length < 2) {
        showToast('Dibuja al menos 2 puntos en el mapa o importa desde JSON/SQL antes de continuar', 'error');
        return;
    }

    // Si selectedRouteId es null, significa que estamos en el Studio directo creando una NUEVA ruta
    if (!selectedRouteId) {
        openCreateRouteModalFromStudio();
        return;
    }

    try {
        await Api.updateRouteGeometry(selectedRouteId, drawnCoordinates, selectedStopIds);
        showToast('Trazado y paradas guardadas con éxito en la Base de Datos');
        exitDrawingMode();
        // Recargar ruta visual
        selectRouteAdmin(selectedRouteId);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Cancela o sale del modo trazado limpiando estados temporales
function exitDrawingMode() {
    drawingMode = false;
    historyStack = [];
    selectedRouteId = null;
    
    // Ocultar banner
    document.getElementById('admin-tool-indicator').classList.remove('visible');
    document.getElementById('admin-draw-actions').style.display = 'none';
    document.getElementById('main-list-section').style.display = 'flex';

    // Limpiar temporales
    if (tempPolyline) {
        mapInstance.removeLayer(tempPolyline);
        tempPolyline = null;
    }
    if (typeof tempPolylineRegreso !== 'undefined' && tempPolylineRegreso) {
        mapInstance.removeLayer(tempPolylineRegreso);
        tempPolylineRegreso = null;
    }
    tempMarkers.forEach(m => mapInstance.removeLayer(m));
    tempMarkers = [];
    if (typeof tempArrows !== 'undefined' && tempArrows) {
        tempArrows.forEach(a => mapInstance.removeLayer(a));
        tempArrows = [];
    }
    drawnCoordinates = [];
    selectedStopIds = [];

    // Refrescar paradas para quitar marcas temporales
    refreshPhysicalStops();
    updateStudioCounter();
}

// Borra el último punto dibujado en el trazado
function undoLastPoint() {
    if (historyStack.length === 0) {
        showToast('No hay más acciones para deshacer', 'info');
        return;
    }
    drawnCoordinates = historyStack.pop();
    redrawAllStudioMarkers();
}

// -----------------------------------------------------
// HERRAMIENTAS DE IMPORTACIÓN Y EXPORTACIÓN JSON/SQL (IDEA DE CLAUDE)
// -----------------------------------------------------

function openExportModal() {
    if (drawnCoordinates.length === 0) {
        showToast('No hay puntos trazados para exportar. Dibuja o importa puntos primero en el mapa.', 'error');
        return;
    }
    const jsonString = JSON.stringify(drawnCoordinates, null, 2);
    document.getElementById('export-json-text').value = jsonString;

    const routeIdForSql = selectedRouteId || 1001;
    let sqlString = `-- Sentencias SQL generadas para insertar coordenadas en MySQL/H2 (Ruta ID: ${routeIdForSql})\n`;
    sqlString += `INSERT INTO route_coordinates (route_id, latitude, longitude, sequence_order) VALUES\n`;
    const values = drawnCoordinates.map((c, i) => `(${routeIdForSql}, ${c.latitude.toFixed(6)}, ${c.longitude.toFixed(6)}, ${i + 1})`);
    sqlString += values.join(',\n') + ';';
    
    document.getElementById('export-sql-text').value = sqlString;
    document.getElementById('export-modal').style.display = 'flex';
}

function openImportModal() {
    document.getElementById('import-textarea').value = '';
    document.getElementById('import-modal').style.display = 'flex';
}

function processImportedText() {
    const text = document.getElementById('import-textarea').value.trim();
    if (!text) {
        showToast('Por favor pega un código JSON o sentencias SQL antes de procesar.', 'error');
        return;
    }

    let parsedCoords = [];

    try {
        if (text.startsWith('[') || text.startsWith('{')) {
            const data = JSON.parse(text);
            const arr = Array.isArray(data) ? data : (data.coordinates || data.points || []);
            arr.forEach(item => {
                const lat = parseFloat(item.lat || item.latitude || item.latitud || item[0]);
                const lng = parseFloat(item.lng || item.lon || item.longitude || item.longitud || item[1]);
                if (!isNaN(lat) && !isNaN(lng)) {
                    parsedCoords.push({ latitude: lat, longitude: lng });
                }
            });
        }
    } catch (e) {
        // Ignorar si no es JSON, intentaremos con Regex
    }

    if (parsedCoords.length === 0) {
        const regex = /(-?\d{1,2}\.\d{4,8})\s*(?:,|\s+)\s*(-?\d{1,3}\.\d{4,8})/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
            const val1 = parseFloat(match[1]);
            const val2 = parseFloat(match[2]);
            if (val1 > -90 && val1 < 90 && val2 > -180 && val2 < 180) {
                if (Math.abs(val1 - 23) < 5 && Math.abs(val2 - (-106)) < 5) {
                    parsedCoords.push({ latitude: val1, longitude: val2 });
                } else if (Math.abs(val2 - 23) < 5 && Math.abs(val1 - (-106)) < 5) {
                    parsedCoords.push({ latitude: val2, longitude: val1 });
                } else {
                    parsedCoords.push({ latitude: val1, longitude: val2 });
                }
            }
        }
    }

    if (parsedCoords.length === 0) {
        showToast('No se detectaron coordenadas válidas. Verifica el formato JSON o SQL.', 'error');
        return;
    }

    clearStudioDrawings(true);
    
    const bounds = L.latLngBounds();
    parsedCoords.forEach(coord => {
        drawnCoordinates.push(coord);
        const latlng = L.latLng(coord.latitude, coord.longitude);
        bounds.extend(latlng);

        const pointIcon = L.divIcon({
            className: 'temp-point-marker',
            html: `<div style="background-color: white; border: 2px solid #6366f1; width: 8px; height: 8px; border-radius: 50%;"></div>`,
            iconSize: [8, 8],
            iconAnchor: [4, 4]
        });
        const marker = createDraggableMarker(latlng, pointIcon);
        tempMarkers.push(marker);
    });

    renderStudioRoute();

    if (drawnCoordinates.length > 0) {
        mapInstance.fitBounds(bounds, { padding: [40, 40] });
    }

    updateStudioCounter();
    document.getElementById('import-modal').style.display = 'none';
    showToast(`⚡ ¡Importación exitosa! ${parsedCoords.length} puntos cargados al mapa.`, 'success');
}

function clearStudioDrawings(force = false) {
    if (drawnCoordinates.length > 0 && (!force || force instanceof Event)) {
        if (!confirm(`⚠️ ¿Estás seguro de que deseas limpiar todo el lienzo? Se borrarán los ${drawnCoordinates.length} puntos trazados actualmente en el Studio.`)) {
            return;
        }
    }
    if (tempPolyline) { mapInstance.removeLayer(tempPolyline); tempPolyline = null; }
    if (typeof tempPolylineRegreso !== 'undefined' && tempPolylineRegreso) { mapInstance.removeLayer(tempPolylineRegreso); tempPolylineRegreso = null; }
    tempMarkers.forEach(m => mapInstance.removeLayer(m));
    tempMarkers = [];
    if (typeof tempArrows !== 'undefined' && tempArrows) {
        tempArrows.forEach(a => mapInstance.removeLayer(a));
        tempArrows = [];
    }
    drawnCoordinates = [];
    selectedStopIds = [];
    refreshPhysicalStops();
    updateStudioCounter();
    showToast('Trazado limpio en el mapa.');
}

// -----------------------------------------------------
// GESTIÓN DE PARADAS FÍSICAS (CREAR / ELIMINAR)
// -----------------------------------------------------

function startStopCreationMode() {
    if (drawingMode) {
        if (drawnCoordinates.length > 0 && !confirm(`⚠️ Tienes ${drawnCoordinates.length} puntos trazados sin guardar en el Studio. ¿Estás seguro de que deseas cambiar a crear paradas físicas y descartar tu trazado actual?`)) {
            return;
        }
        exitDrawingMode();
    }

    stopCreationMode = true;
    showToast('Haz clic en cualquier punto del mapa para colocar una parada física.');
}

// Muestra modal para ingresar nombre de la nueva parada
function handleMapClickForStop(latlng) {
    if (!stopCreationMode) return;

    stopCreationMode = false;

    const stopModal = document.getElementById('stop-modal');
    stopModal.style.display = 'flex';
    
    document.getElementById('stop-latitude').value = latlng.lat;
    document.getElementById('stop-longitude').value = latlng.lng;
    document.getElementById('stop-name').focus();
}

// Guarda la nueva parada física
async function handleStopFormSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('stop-name').value;
    const latitude = parseFloat(document.getElementById('stop-latitude').value);
    const longitude = parseFloat(document.getElementById('stop-longitude').value);

    try {
        await Api.createStop({ name, latitude, longitude });
        showToast('Parada física registrada correctamente.');
        document.getElementById('stop-modal').style.display = 'none';
        document.getElementById('stop-form').reset();
        await refreshPhysicalStops();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function confirmDeleteStop(stopId) {
    if (confirm('¿Estás seguro de que deseas eliminar esta parada física? Se desvinculará de cualquier ruta que la use.')) {
        try {
            await Api.deleteStop(stopId);
            showToast('Parada física eliminada.');
            mapInstance.closePopup();
            await refreshPhysicalStops();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }
}

// -----------------------------------------------------
// OPERACIONES CRUD DE RUTAS
// -----------------------------------------------------

function openCreateRouteModal() {
    document.getElementById('route-modal-title').textContent = 'Crear Nueva Ruta';
    document.getElementById('route-form-id').value = '';
    document.getElementById('route-name-input').value = '';
    document.getElementById('route-desc-input').value = '';
    document.getElementById('route-color-input').value = '#ff4b2b';
    if (document.getElementById('route-price-input')) document.getElementById('route-price-input').value = '13.0';
    if (document.getElementById('route-freq-input')) document.getElementById('route-freq-input').value = '10';
    document.getElementById('route-active-input').checked = true;
    
    const btnEditStudio = document.getElementById('btn-edit-route-studio');
    if (btnEditStudio) btnEditStudio.style.display = 'none';

    document.getElementById('route-modal').style.display = 'flex';
}

function openCreateRouteModalFromStudio() {
    document.getElementById('route-modal-title').textContent = 'Finalizar y Crear Nueva Ruta';
    document.getElementById('route-form-id').value = '';
    document.getElementById('route-name-input').value = '';
    document.getElementById('route-desc-input').value = `Ruta trazada interactivamente desde el Studio con ${drawnCoordinates.length} puntos GPS y ${selectedStopIds.length} paradas.`;
    document.getElementById('route-color-input').value = '#ff4b2b';
    if (document.getElementById('route-price-input')) document.getElementById('route-price-input').value = '13.0';
    if (document.getElementById('route-freq-input')) document.getElementById('route-freq-input').value = '10';
    document.getElementById('route-active-input').checked = true;
    
    const btnEditStudio = document.getElementById('btn-edit-route-studio');
    if (btnEditStudio) btnEditStudio.style.display = 'none';

    document.getElementById('route-modal').style.display = 'flex';
}

function openEditRouteModal(routeId) {
    const route = adminRoutes.find(r => r.id === routeId);
    if (!route) return;

    document.getElementById('route-modal-title').textContent = 'Editar Ruta';
    document.getElementById('route-form-id').value = route.id;
    document.getElementById('route-name-input').value = route.name;
    document.getElementById('route-desc-input').value = route.description || '';
    document.getElementById('route-color-input').value = route.color;
    if (document.getElementById('route-price-input')) document.getElementById('route-price-input').value = route.price || '13.0';
    if (document.getElementById('route-freq-input')) document.getElementById('route-freq-input').value = route.frequencyMinutes || '10';
    document.getElementById('route-active-input').checked = route.active;

    const btnEditStudio = document.getElementById('btn-edit-route-studio');
    if (btnEditStudio) {
        btnEditStudio.style.display = 'flex';
        btnEditStudio.onclick = () => {
            document.getElementById('route-modal').style.display = 'none';
            startTrazadoMode(route.id, route.color);
        };
    }

    document.getElementById('route-modal').style.display = 'flex';
}

async function handleRouteFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('route-form-id').value;
    const name = document.getElementById('route-name-input').value;
    const description = document.getElementById('route-desc-input').value;
    const color = document.getElementById('route-color-input').value;
    const active = document.getElementById('route-active-input').checked;
    const price = document.getElementById('route-price-input') ? (parseFloat(document.getElementById('route-price-input').value) || 13.0) : 13.0;
    const frequencyMinutes = document.getElementById('route-freq-input') ? (parseInt(document.getElementById('route-freq-input').value, 10) || 10) : 10;

    const routeData = { name, description, color, active, price, frequencyMinutes };

    try {
        if (id) {
            // Update
            await Api.updateRoute(id, routeData);
            showToast('Ruta actualizada exitosamente.');
        } else {
            // Create
            const newRoute = await Api.createRoute(routeData);
            
            // ¡MAGIA DEL STUDIO! Si estamos trazando e importando, enviamos las coordenadas y paradas a la Base de Datos en un solo paso
            if (drawingMode && drawnCoordinates.length > 0) {
                await Api.updateRouteGeometry(newRoute.id, drawnCoordinates, selectedStopIds);
                showToast(`🎉 ¡Ruta "${newRoute.name}" creada, trazada con ${drawnCoordinates.length} puntos y guardada en la Base de Datos!`, 'success');
                exitDrawingMode();
            } else {
                showToast('Ruta creada exitosamente en la Base de Datos.');
            }
        }
        document.getElementById('route-modal').style.display = 'none';
        document.getElementById('route-form').reset();
        await refreshAdminRoutes();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function confirmDeleteRoute(routeId) {
    if (drawingMode && drawnCoordinates.length > 0) {
        if (!confirm(`⚠️ Tienes ${drawnCoordinates.length} puntos trazados sin guardar en el Studio. ¿Seguro que deseas eliminar esta ruta y descartar tu trabajo actual?`)) {
            return;
        }
        exitDrawingMode();
    }
    if (confirm('¿Estás seguro de que deseas eliminar esta ruta por completo? Esta acción es irreversible.')) {
        try {
            await Api.deleteRoute(routeId);
            showToast('Ruta eliminada.');
            await refreshAdminRoutes();
            clearMapDrawings();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }
}

// -----------------------------------------------------
// Auto-asignar paradas cercanas al trazado actual (umbral de 150 metros)
// Auto-asignar paradas cercanas al trazado actual (umbral de 300 metros) y ordenarlas por el trazado
function autoAssignStopsByProximity() {
    if (!drawingMode || drawnCoordinates.length === 0) {
        showToast('⚠️ No hay ningún trazado activo para comparar.', true);
        return;
    }

    if (!physicalStopsData || physicalStopsData.length === 0) {
        showToast('⚠️ No hay paradas físicas cargadas en el mapa.', true);
        return;
    }

    let newlyAssignedCount = 0;
    const thresholdMeters = 500; // 500 metros
    
    // Arreglo para guardar { stopId, closestPathIndex } de todas las paradas
    let stopsWithOrder = [];

    physicalStopsData.forEach(stop => {
        const stopLatLng = L.latLng(stop.latitude, stop.longitude);
        let minDistance = Infinity;
        let closestIndex = -1;

        // Encontrar la distancia mínima a la polilínea y el índice del punto más cercano
        for (let i = 0; i < drawnCoordinates.length; i++) {
            const coordLatLng = L.latLng(drawnCoordinates[i].latitude, drawnCoordinates[i].longitude);
            const dist = mapInstance.distance(stopLatLng, coordLatLng);
            if (dist < minDistance) {
                minDistance = dist;
                closestIndex = i;
            }
        }

        const isAlreadySelected = selectedStopIds.includes(stop.id);

        // Si ya estaba seleccionada o está dentro del umbral de proximidad
        if (isAlreadySelected || minDistance <= thresholdMeters) {
            stopsWithOrder.push({ id: stop.id, index: closestIndex });
            
            if (!isAlreadySelected) {
                newlyAssignedCount++;
                // Actualizar visualmente el marcador
                const markerDiv = document.getElementById(`physical-stop-${stop.id}`);
                if (markerDiv) {
                    markerDiv.style.backgroundColor = '#10b981';
                    markerDiv.style.borderColor = '#059669';
                    markerDiv.style.transform = 'scale(1.2)';
                }
            }
        }
    });

    // Ordenar las paradas basándose en su aparición a lo largo de la ruta (closestIndex de menor a mayor)
    stopsWithOrder.sort((a, b) => a.index - b.index);
    
    // Sobrescribir el arreglo principal con el nuevo orden geográfico perfecto
    selectedStopIds = stopsWithOrder.map(s => s.id);

    if (newlyAssignedCount > 0) {
        updateStudioCounter();
        showToast(`✨ Se auto-asignaron y ordenaron geográficamente ${newlyAssignedCount} nuevas paradas.`);
    } else {
        updateStudioCounter();
        showToast(`✅ Las paradas han sido ordenadas geográficamente según el trazado.`);
    }
}

// CONFIGURACIÓN DE EVENT LISTENERS DEL ADMINISTRADOR
// -----------------------------------------------------

function setupAdminEventListeners(map) {
    // Escuchar clics en el mapa
    map.on('click', (e) => {
        if (drawingMode) {
            handleMapClickForDrawing(e.latlng);
        } else if (stopCreationMode) {
            handleMapClickForStop(e.latlng);
        }
    });

    // Clic derecho para mover rápidamente el punto del trazado más cercano a la ubicación del clic
        map.on('contextmenu', (e) => {
        if (e.originalEvent) {
            e.originalEvent.preventDefault();
        }
        // Insertar nuevo punto en el segmento más cercano
        if (drawingMode && drawnCoordinates.length >= 2) {
            let closestIdx = -1;
            let minDistance = Infinity;
            const clickPoint = mapInstance.project(e.latlng); // Proyectar a píxeles para cálculo geométrico plano
            
            for (let i = 0; i < drawnCoordinates.length - 1; i++) {
                const p1 = mapInstance.project(L.latLng(drawnCoordinates[i].latitude, drawnCoordinates[i].longitude));
                const p2 = mapInstance.project(L.latLng(drawnCoordinates[i+1].latitude, drawnCoordinates[i+1].longitude));
                
                // Usar la distancia perpendicular real al segmento de la línea
                const dist = L.LineUtil.pointToSegmentDistance(clickPoint, p1, p2);
                
                if (dist < minDistance) {
                    minDistance = dist;
                    closestIdx = i;
                }
            }
            if (closestIdx !== -1) {
                saveToHistory();
                const newCoord = { latitude: e.latlng.lat, longitude: e.latlng.lng };
                drawnCoordinates.splice(closestIdx + 1, 0, newCoord);
                redrawAllStudioMarkers();
                showToast('Punto intermedio insertado.');
            }
        } else if (drawingMode) {
             handleMapClickForDrawing(e.latlng);
        }
    });

    // Bloquear el menú contextual nativo del navegador en todo el mapa
    const mapElement = document.getElementById('map');
    if (mapElement) {
        mapElement.addEventListener('contextmenu', (e) => {
            if (drawingMode) {
                e.preventDefault();
            }
        });
    }

    // Función de confirmación al presionar "Cancelar / Salir del Studio"
    const handleConfirmExitStudio = () => {
        if (drawingMode && drawnCoordinates.length > 0) {
            if (!confirm(`⚠️ Tienes ${drawnCoordinates.length} puntos trazados sin guardar en el Studio. ¿Estás seguro de que deseas salir y perder todas tus modificaciones?`)) {
                return;
            }
        }
        exitDrawingMode();
    };

    // Guardar / Cancelar / Deshacer en modo trazado Studio
    document.getElementById('btn-save-draw').addEventListener('click', saveRouteGeometry);
    document.getElementById('btn-cancel-draw').addEventListener('click', handleConfirmExitStudio);
    document.getElementById('btn-undo-draw').addEventListener('click', undoLastPoint);
    if (document.getElementById('btn-clear-draw')) document.getElementById('btn-clear-draw').addEventListener('click', clearStudioDrawings);
    if (document.getElementById('btn-import-json')) document.getElementById('btn-import-json').addEventListener('click', openImportModal);
    if (document.getElementById('btn-auto-assign')) document.getElementById('btn-auto-assign').addEventListener('click', autoAssignStopsByProximity);
    if (document.getElementById('btn-export-json')) document.getElementById('btn-export-json').addEventListener('click', openExportModal);
    if (document.getElementById('btn-process-import')) document.getElementById('btn-process-import').addEventListener('click', processImportedText);

    // Botones del panel para activar herramientas
    document.getElementById('btn-create-route').addEventListener('click', startDirectStudioMode);
    document.getElementById('btn-create-stop').addEventListener('click', startStopCreationMode);

    // Submits de Formularios
    document.getElementById('route-form').addEventListener('submit', handleRouteFormSubmit);
    document.getElementById('stop-form').addEventListener('submit', handleStopFormSubmit);

    // Cerrar Modales
    document.getElementById('route-modal-close').addEventListener('click', () => {
        document.getElementById('route-modal').style.display = 'none';
    });
    document.getElementById('stop-modal-close').addEventListener('click', () => {
        document.getElementById('stop-modal').style.display = 'none';
        stopCreationMode = false;
    });
    if (document.getElementById('import-modal-close')) {
        document.getElementById('import-modal-close').addEventListener('click', () => {
            document.getElementById('import-modal').style.display = 'none';
        });
    }
    if (document.getElementById('export-modal-close')) {
        document.getElementById('export-modal-close').addEventListener('click', () => {
            document.getElementById('export-modal').style.display = 'none';
        });
    }
    if (document.getElementById('copy-json-btn')) {
        document.getElementById('copy-json-btn').addEventListener('click', () => {
            const el = document.getElementById('export-json-text');
            navigator.clipboard.writeText(el.value);
            showToast('JSON copiado al portapapeles 📋');
        });
    }
    if (document.getElementById('copy-sql-btn')) {
        document.getElementById('copy-sql-btn').addEventListener('click', () => {
            const el = document.getElementById('export-sql-text');
            navigator.clipboard.writeText(el.value);
            showToast('Sentencia SQL copiada al portapapeles 📋');
        });
    }

    // Logout en badge de usuario
    const userBadge = document.getElementById('user-badge');
    if (userBadge) {
        userBadge.addEventListener('click', () => {
            if (confirm('¿Deseas cerrar sesión?')) {
                Auth.logout();
            }
        });
    }

    // Botón de Volver a Vista de Usuario con protección anti-pérdida
    document.getElementById('user-view-btn').addEventListener('click', () => {
        if (drawingMode && drawnCoordinates.length > 0) {
            if (!confirm(`⚠️ Tienes ${drawnCoordinates.length} puntos trazados sin guardar en el Studio. ¿Estás seguro de que deseas volver al mapa de usuario y descartar tu trabajo?`)) {
                return;
            }
        }
        window.location.href = 'index.html';
    });

    // Protección universal contra recargas de pestaña, cierre de ventana o navegación del navegador
    window.addEventListener('beforeunload', (e) => {
        if (drawingMode && drawnCoordinates.length > 0) {
            e.preventDefault();
            e.returnValue = `⚠️ Tienes ${drawnCoordinates.length} puntos trazados sin guardar en el Studio. ¿Seguro que quieres salir y perder tus cambios?`;
            return e.returnValue;
        }
    });

    // Protección contra el botón "Atrás" (flecha atrás o botón de ratón) del navegador
    window.addEventListener('popstate', (e) => {
        if (drawingMode && drawnCoordinates.length > 0) {
            if (!confirm(`⚠️ Tienes ${drawnCoordinates.length} puntos trazados sin guardar en el Studio. ¿Estás seguro de que deseas volver atrás en el navegador y perder todo el trazado actual?`)) {
                // El usuario canceló: restaurar el estado en el historial para evitar que el navegador salga de admin.html
                try {
                    history.pushState({ studio: true }, "Studio de Trazado", window.location.href);
                } catch (err) {}
                return;
            }
            exitDrawingMode();
        } else if (drawingMode) {
            exitDrawingMode();
        }
    });
}
