/* =========================================================
   DON RUTERO — Lógica Principal de la Vista de Usuario
   ========================================================= */

let allRoutes = [];
let currentFilter = 'all';
let currentSearch = '';

document.addEventListener('DOMContentLoaded', async () => {
    initLeafletMap('map');
    await Auth.init();
    await loadRoutesList();
    await loadAllPhysicalStopsOnMap();
    setupEventListeners();
});

// ----------------------------------------------------------
// CARGA Y RENDERIZADO DE RUTAS
// ----------------------------------------------------------

async function loadRoutesList() {
    try {
        allRoutes = await Api.getRoutes();
        // Cargar paradas y recorrido de cada ruta para que el buscador predictivo y los filtros funcionen en colonias y destinos
        for (let route of allRoutes) {
            try {
                route.stopsList = await Api.getRouteStops(route.id);
                route.coordinatesList = await Api.getRouteCoordinates(route.id);
            } catch (e) {
                route.stopsList = [];
                route.coordinatesList = [];
            }
        }
        renderRoutes(allRoutes);
    } catch (err) {
        showToast('Error al conectar con el servidor', 'error');
        console.error(err);
    }
}

function renderRoutes(routes) {
    const list = document.getElementById('route-list');
    list.innerHTML = '';

    if (routes.length === 0) {
        list.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:0.88rem; padding:24px 0;">No se encontraron rutas.</div>`;
        return;
    }

    routes.forEach(route => {
        const card = document.createElement('div');
        card.className = 'route-card';
        card.style.setProperty('--card-accent', route.color);
        card.dataset.id = route.id;

        let metaHtml = '';
        if (route.price) {
            metaHtml += `<span class="route-meta-tag price">
                <img src="assets/icons/ui_moneda.svg" alt="" class="tag-icon">$${route.price.toFixed(2)}
            </span>`;
        }
        if (route.frequencyMinutes) {
            metaHtml += `<span class="route-meta-tag">
                <img src="assets/icons/ui_reloj.svg" alt="" class="tag-icon">c/${route.frequencyMinutes} min aprox.
            </span>`;
        }

        const isAguilas = (route.name && route.name.toLowerCase().includes('aguila')) ||
                          (route.description && route.description.toLowerCase().includes('aguila')) ||
                          route.concesionario === 'aguilas';
        const badgeHtml = isAguilas 
            ? `<span class="route-line-badge aguilas">Águilas del Pacífico</span>`
            : `<span class="route-line-badge alianza">Alianza (Camiones Verdes)</span>`;

        card.innerHTML = `
            <div class="route-indicator" style="background-color:${route.color}; color:${route.color};"></div>
            <div class="route-info">
                <div>${badgeHtml}</div>
                <div class="route-name">${route.name}</div>
                <div class="route-desc">${route.description || ''}</div>
                ${metaHtml ? `<div class="route-meta">${metaHtml}</div>` : ''}
            </div>
        `;

        card.addEventListener('click', () => selectRoute(route.id, card));
        list.appendChild(card);
    });
}

// ----------------------------------------------------------
// SELECCIÓN DE RUTA Y PANEL DE DETALLES
// ----------------------------------------------------------

async function selectRoute(routeId, cardElement) {
    document.querySelectorAll('.route-card').forEach(c => c.classList.remove('active'));
    if (cardElement) cardElement.classList.add('active');

    try {
        clearMapDrawings();
        const route = allRoutes.find(r => r.id === routeId) || await Api.getRouteDetails(routeId);
        const coords = await Api.getRouteCoordinates(routeId);
        drawRouteLine(coords, route.color);
        const routeStops = await Api.getRouteStops(routeId);
        drawRouteStops(routeStops, route.color);
        showDetailPanel(route, routeStops);
    } catch (err) {
        showToast('Error al cargar la ruta', 'error');
        console.error(err);
    }
}

function showDetailPanel(route, routeStops) {
    const detailPanel = document.getElementById('detail-panel');
    const mainList = document.getElementById('main-list-section');
    mainList.style.display = 'none';

    const title = document.getElementById('detail-title');
    title.textContent = route.name;
    title.style.borderLeft = `4px solid ${route.color}`;
    title.style.paddingLeft = '10px';

    document.getElementById('detail-desc').textContent = route.description || '';

    // Meta tags with SVG icons
    const metaContainer = document.getElementById('detail-meta');
    metaContainer.innerHTML = '';
    if (route.price) {
        metaContainer.innerHTML += `<span class="route-meta-tag price"><img src="assets/icons/ui_moneda.svg" alt="" class="tag-icon">$${route.price.toFixed(2)}</span>`;
    }
    if (route.frequencyMinutes) {
        metaContainer.innerHTML += `<span class="route-meta-tag"><img src="assets/icons/ui_reloj.svg" alt="" class="tag-icon">Cada ${route.frequencyMinutes} min</span>`;
    }
    if (routeStops.length > 0) {
        metaContainer.innerHTML += `<span class="route-meta-tag"><img src="assets/icons/pin_parada.svg" alt="" class="tag-icon">${routeStops.length} paradas</span>`;
    }

    // Timeline
    const timeline = document.getElementById('detail-stops-timeline');
    timeline.innerHTML = '';

    if (routeStops.length === 0) {
        timeline.innerHTML = `<div style="color:var(--text-muted); font-size:0.88rem;">Sin paradas registradas.</div>`;
    } else {
        routeStops.forEach(rs => {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.innerHTML = `
                <div class="timeline-dot" style="border-color:${route.color}"></div>
                <div>
                    <div class="timeline-title">${rs.stop.name}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">Parada #${rs.stopOrder}</div>
                </div>
            `;
            timeline.appendChild(item);
        });
    }

    detailPanel.classList.add('visible');
}

function closeDetailPanel() {
    document.getElementById('detail-panel').classList.remove('visible');
    document.getElementById('main-list-section').style.display = 'flex';
    document.querySelectorAll('.route-card').forEach(c => c.classList.remove('active'));
    clearMapDrawings();
}

// ----------------------------------------------------------
// BÚSQUEDA Y FILTROS
// ----------------------------------------------------------
window.currentSearchLocation = null;

// Helper de distancia GPS (Haversine) en metros
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
    const R = 6371e3; // Radio de la tierra en metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function updateRouteDisplay() {
    const q = currentSearch.toLowerCase().trim();
    
    const filtered = allRoutes.filter(r => {
        // 1. Filtro por búsqueda de texto (Ruta, Descripción, Colonias/CP, Paradas y Destinos que recorre)
        let matchSearch = !q || 
            r.name.toLowerCase().includes(q) || 
            (r.description && r.description.toLowerCase().includes(q)) ||
            (r.stopsList && r.stopsList.some(rs => {
                const s = rs.stop || rs;
                const nameMatch = s.name && s.name.toLowerCase().includes(q);
                const addrMatch = s.address && s.address.toLowerCase().includes(q);
                const typeMatch = s.type && s.type.toLowerCase().includes(q);
                return nameMatch || addrMatch || typeMatch;
            }));
            
        // Si no coincidió por texto directo, verificar si hay una ubicación buscada globalmente (por OSM)
        if (!matchSearch && window.currentSearchLocation) {
            matchSearch = r.coordinatesList && r.coordinatesList.some(s => {
                if (!s.latitude || !s.longitude) return false;
                return calculateDistanceMeters(window.currentSearchLocation.lat, window.currentSearchLocation.lng, s.latitude, s.longitude) <= 1200;
            });
        }
            
        if (!matchSearch) return false;
        
        // 2. Filtro por categoría (Pills)
        if (currentFilter === 'all') return true;
        
        const nameDesc = (r.name + ' ' + (r.description || '')).toLowerCase();
        
        if (currentFilter === 'turistico') {
            const turisticoKeywords = ['turístic', 'turistic', 'playa', 'costera', 'malecón', 'malecon', 'dorada', 'faro', 'cerritos', 'acuario', 'hotel', 'olas altas'];
            return turisticoKeywords.some(kw => nameDesc.includes(kw));
        }
        
        if (currentFilter === 'centro') {
            const centroKeywords = ['centro', 'mercado', 'suárez', 'suarez', 'catedral', 'pino suárez', 'ololas', 'olas altas', 'juarez', 'juárez'];
            return centroKeywords.some(kw => nameDesc.includes(kw));
        }
        
        if (currentFilter === 'frecuente') {
            return r.frequencyMinutes && r.frequencyMinutes <= 12;
        }
        
        return true;
    });

    renderRoutes(filtered);
}

function filterRoutes(searchText) {
    currentSearch = searchText;
    updateRouteDisplay();
    renderSearchSuggestions(searchText);
}

// ----------------------------------------------------------
// BUSCADOR PREDICTIVO Y AUTOCOMPLETADO DE COLONIAS Y DESTINOS
// ----------------------------------------------------------
let osmSearchTimeout = null;

async function fetchOSMPlaces(query, dropdownId, type) {
    if (query.length < 3) return;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Mazatlan, Sinaloa')}&format=json&limit=3&addressdetails=1`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown || dropdown.style.display === 'none') return;
        
        let html = '';
        data.forEach(item => {
            const fullName = item.display_name;
            const shortName = fullName.split(',')[0];
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            
            let title = isNaN(shortName) ? shortName : fullName.split(',')[1]?.trim() || shortName;
            
            const osmType = item.type || '';
            const osmClass = item.class || '';
            
            let badgeText = "Lugar de Internet";
            let iconUrl = "assets/icons/ui_buscar.svg";
            let color = "#3b82f6";
            
            if (osmClass === 'amenity') {
                if (osmType === 'hospital' || osmType === 'clinic' || osmType === 'doctors') { badgeText = 'Salud / Médico'; color = '#ef4444'; iconUrl = 'assets/icons/pin_hospital.svg'; }
                else if (osmType === 'school' || osmType === 'university' || osmType === 'college') { badgeText = 'Educación'; color = '#f59e0b'; iconUrl = 'assets/icons/pin_escuela.svg'; }
                else if (osmType === 'restaurant' || osmType === 'cafe' || osmType === 'fast_food') { badgeText = 'Comida'; color = '#f97316'; iconUrl = 'assets/icons/ui_comida.svg'; }
                else { badgeText = 'Establecimiento'; color = '#8b5cf6'; iconUrl = 'assets/icons/ui_buscar.svg'; }
            } else if (osmClass === 'shop') {
                badgeText = 'Comercio'; color = '#10b981'; iconUrl = 'assets/icons/pin_tienda.svg';
            } else if (osmClass === 'tourism' || osmType === 'hotel') {
                badgeText = 'Turismo'; color = '#0ea5e9'; iconUrl = 'assets/icons/pin_hotel.svg';
            } else if (osmClass === 'place' || osmType === 'residential' || osmType === 'suburb' || osmType === 'neighbourhood') {
                badgeText = 'Colonia / Residencial'; color = '#16a34a'; iconUrl = 'assets/icons/ui_casita.svg';
            } else if (osmClass === 'highway') {
                badgeText = 'Calle / Avenida'; color = '#64748b'; iconUrl = 'assets/icons/ui_buscar.svg';
            }
            
            const pointObj = { name: title, lat: lat, lng: lng };
            const objStr = encodeURIComponent(JSON.stringify(pointObj));
            
            const onclickFn = type === 'main' ? `selectColoniaSuggestion('${objStr}')` : `selectTripPoint('${objStr}', '${type}')`;
            
            html += `
                <div class="search-suggestion-item" onclick="${onclickFn}">
                    <div class="suggestion-icon" style="background: ${color};">
                        <img src="${iconUrl}" alt="" style="filter: brightness(0) invert(1); width: 14px; height: 14px;">
                    </div>
                    <div class="suggestion-content">
                        <div class="suggestion-title">🌍 ${title}</div>
                        <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px; flex-wrap: wrap;">
                            <span class="suggestion-badge" style="background: ${color}15; color: ${color};">${badgeText}</span>
                            <span class="suggestion-subtitle" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; display: block;">📍 ${fullName}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        if (html !== '') {
            const noResults = dropdown.querySelector('div[style*="text-align: center"]');
            if (noResults && noResults.textContent.includes('No se encontraron')) {
                noResults.remove();
            }
            // Eliminar sugerencias previas de OSM si existieran (para evitar duplicados al teclear rápido)
            const oldOSM = dropdown.querySelectorAll('.suggestion-title');
            oldOSM.forEach(el => { if (el.textContent.includes('🌍')) el.closest('.search-suggestion-item').remove(); });
            
            dropdown.innerHTML += html;
        }
    } catch (e) {
        console.error("OSM Geocoding Error:", e);
    }
}
function renderSearchSuggestions(q) {
    const dropdown = document.getElementById('search-suggestions');
    if (!dropdown) return;
    
    const query = (q || '').toLowerCase().trim();
    if (query.length < 1) {
        dropdown.style.display = 'none';
        return;
    }
    
    let html = '';
    let matchesCount = 0;
    
    // Búsqueda delegada enteramente a OSM y Destinos Verificados.
    
    // 2. Buscar en Rutas
    allRoutes.forEach(r => {
        if (r.name.toLowerCase().includes(query) || (r.description && r.description.toLowerCase().includes(query))) {
            matchesCount++;
            html += `
                <div class="search-suggestion-item" onclick="selectRouteSuggestion(${r.id})">
                    <div class="suggestion-icon" style="background: ${r.color};">
                        <img src="assets/icons/ui_camion.svg" alt="">
                    </div>
                    <div class="suggestion-content">
                        <div class="suggestion-title">${r.name}</div>
                        <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px; flex-wrap: wrap;">
                            <span class="suggestion-badge" style="background: ${r.color}15; color: ${r.color};">Ruta</span>
                            <span class="suggestion-subtitle">${r.description || 'Ruta de autobús urbano en Mazatlán'}</span>
                        </div>
                    </div>
                </div>
            `;
        }
    });
    
    // 3. Buscar en Destinos y Puntos de Interés (allPhysicalStopsList)
    if (typeof allPhysicalStopsList !== 'undefined' && allPhysicalStopsList.length > 0) {
        let stopMatches = 0;
        allPhysicalStopsList.forEach(stop => {
            if (stopMatches >= 5) return; // Limitar a 5 sugerencias de destinos
            
            const nameMatch = stop.name && stop.name.toLowerCase().includes(query);
            const addrMatch = stop.address && stop.address.toLowerCase().includes(query);
            const typeMatch = stop.type && stop.type.toLowerCase().includes(query);
            
            if (nameMatch || addrMatch || typeMatch) {
                stopMatches++;
                matchesCount++;
                const config = (typeof getStopIconConfig === 'function') ? getStopIconConfig(stop.name, stop.type) : { iconUrl: 'assets/icons/pin_parada.svg', bgColor: '#475569', category: 'Destino' };
                
                // Determinar qué rutas pasan por o cerca de esta parada
                const passingRoutes = allRoutes.filter(r => r.stopsList && r.stopsList.some(rs => (rs.stop || rs).id === stop.id || (rs.stop || rs).name === stop.name)).map(r => r.name);
                const subtitleText = passingRoutes.length > 0 ? `📍 ${stop.address || 'Mazatlán'} — Pasa: ${passingRoutes.join(', ')}` : `📍 ${stop.address || 'Mazatlán, Sinaloa'}`;
                
                const stopJsonAttr = encodeURIComponent(JSON.stringify(stop));
                html += `
                    <div class="search-suggestion-item" onclick="selectStopSuggestion('${stopJsonAttr}')">
                        <div class="suggestion-icon" style="background: ${config.bgColor};">
                            <img src="${config.iconUrl}" alt="">
                        </div>
                        <div class="suggestion-content">
                            <div class="suggestion-title">${stop.name}</div>
                            <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px; flex-wrap: wrap;">
                                <span class="suggestion-badge" style="background: ${config.bgColor}15; color: ${config.bgColor};">${config.category || 'Destino'}</span>
                                <span class="suggestion-subtitle">${subtitleText}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
    }
    
    if (matchesCount === 0) {
        html = `
            <div style="padding: 14px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
                No se encontraron colonias, destinos ni rutas para "<b>${q}</b>"
            </div>
        `;
    }
    
    dropdown.innerHTML = html;
    dropdown.style.display = 'block';

    // Disparar búsqueda asíncrona a OpenStreetMap (con debounce)
    if (query.length >= 3) {
        if (osmSearchTimeout) clearTimeout(osmSearchTimeout);
        osmSearchTimeout = setTimeout(() => {
            fetchOSMPlaces(query, 'search-suggestions', 'main');
        }, 500);
    }
}

function selectRouteSuggestion(routeId) {
    const dropdown = document.getElementById('search-suggestions');
    if (dropdown) dropdown.style.display = 'none';
    
    const route = allRoutes.find(r => r.id === routeId);
    if (route) {
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = route.name;
        filterRoutes(route.name);
        
        const card = document.querySelector(`.route-card[data-id="${routeId}"]`);
        if (card) card.click();
        else {
            drawRoutePolyline(routeId, route.color);
            showDetailPanel(route, route.stopsList || []);
        }
    }
}

function selectStopSuggestion(stopJsonStr) {
    const dropdown = document.getElementById('search-suggestions');
    if (dropdown) dropdown.style.display = 'none';
    
    try {
        const stop = JSON.parse(decodeURIComponent(stopJsonStr));
        const searchInput = document.getElementById('search-input');
        
        if (searchInput) searchInput.value = stop.name;
        filterRoutes(stop.name);
        
        if (mapInstance && typeof L !== 'undefined') {
            mapInstance.flyTo([stop.latitude, stop.longitude], 16, { duration: 1.2 });
            
            if (typeof allStopsMarkers !== 'undefined' && allStopsMarkers.length > 0) {
                const marker = allStopsMarkers.find(m => {
                    const latlng = m.getLatLng();
                    return Math.abs(latlng.lat - stop.latitude) < 0.0001 && Math.abs(latlng.lng - stop.longitude) < 0.0001;
                });
                if (marker) {
                    setTimeout(() => marker.openPopup(), 1200);
                }
            }
        }
    } catch (e) {
        console.error("Error al seleccionar destino:", e);
    }
}

function selectColoniaSuggestion(colJsonStr) {
    try {
        const col = JSON.parse(decodeURIComponent(colJsonStr));
        const searchInput = document.getElementById('search-input');
        
        if (searchInput) searchInput.value = col.name;
        window.currentSearchLocation = { lat: col.lat, lng: col.lng, name: col.name };
        currentSearch = col.name;
        updateRouteDisplay();
        
        const dropdown = document.getElementById('search-suggestions');
        if (dropdown) dropdown.style.display = 'none';
        
        if (mapInstance && typeof L !== 'undefined') {
            mapInstance.flyTo([col.lat, col.lng], 15, { duration: 1.2 });
            
            if (window._tempColoniaMarker) mapInstance.removeLayer(window._tempColoniaMarker);
            
            const cpText = col.cp ? ` (C.P. ${col.cp})` : '';
            window._tempColoniaMarker = L.marker([col.lat, col.lng], {
                icon: L.divIcon({
                    className: 'custom-pin-badge',
                    html: `<div style="background: #16a34a; color: white; padding: 5px 12px; border-radius: 9999px; font-weight: 800; font-size: 0.8rem; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); white-space: nowrap; transform: translate(-50%, -100%); margin-top: 5px; display: inline-block;">🏘️ ${col.name}${cpText}</div>`,
                    iconSize: null
                })
            }).addTo(mapInstance);
            
            showToast(`📍 Mostrando rutas que pasan cerca de ${col.name}${cpText}`);
        }
    } catch (e) {
        console.error("Error al seleccionar colonia:", e);
    }
}

// ==========================================================
// PLANIFICADOR DE VIAJES ("¿CÓMO LLEGO?" ORIGEN ➔ DESTINO)
// ==========================================================
let selectedOrigin = null;
let selectedDestination = null;

function switchSidebarMode(mode) {
    const tabRutas = document.getElementById('tab-rutas');
    const tabPlan = document.getElementById('tab-planificador');
    const secRutas = document.getElementById('main-list-section');
    const secPlan = document.getElementById('trip-planner-section');
    const detailPanel = document.getElementById('detail-panel');
    
    if (mode === 'rutas') {
        if (tabRutas) tabRutas.classList.add('active');
        if (tabPlan) tabPlan.classList.remove('active');
        if (secRutas) secRutas.style.display = 'flex';
        if (secPlan) secPlan.style.display = 'none';
    } else {
        if (tabPlan) tabPlan.classList.add('active');
        if (tabRutas) tabRutas.classList.remove('active');
        if (secPlan) secPlan.style.display = 'flex';
        if (secRutas) secRutas.style.display = 'none';
        if (detailPanel) detailPanel.classList.remove('active');
    }
}

function setupTripPlannerListeners() {
    const origInput = document.getElementById('origin-input');
    const destInput = document.getElementById('destination-input');
    const btnMyLocation = document.getElementById('btn-use-mylocation');
    
    if (origInput) {
        origInput.addEventListener('input', (e) => renderTripSuggestions(e.target.value, 'origin-suggestions', 'origin'));
        origInput.addEventListener('focus', () => { if (origInput.value.trim().length >= 1) renderTripSuggestions(origInput.value, 'origin-suggestions', 'origin'); });
    }
    if (destInput) {
        destInput.addEventListener('input', (e) => renderTripSuggestions(e.target.value, 'destination-suggestions', 'destination'));
        destInput.addEventListener('focus', () => { if (destInput.value.trim().length >= 1) renderTripSuggestions(destInput.value, 'destination-suggestions', 'destination'); });
    }
    if (btnMyLocation) {
        btnMyLocation.addEventListener('click', () => {
            if (!navigator.geolocation) { showToast('Navegador sin soporte GPS', 'error'); return; }
            showToast('Obteniendo tu ubicación GPS...');
            navigator.geolocation.getCurrentPosition(pos => {
                const { latitude, longitude } = pos.coords;
                selectedOrigin = { name: '📍 Mi Ubicación Actual', lat: latitude, lng: longitude };
                if (origInput) origInput.value = '📍 Mi Ubicación Actual';
                showToast('🟢 Punto de origen fijado en tu ubicación GPS');
                if (mapInstance) mapInstance.flyTo([latitude, longitude], 16);
            }, () => showToast('No se pudo obtener tu ubicación GPS', 'error'));
        });
    }
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#trip-planner-section')) {
            const d1 = document.getElementById('origin-suggestions');
            const d2 = document.getElementById('destination-suggestions');
            if (d1) d1.style.display = 'none';
            if (d2) d2.style.display = 'none';
        }
    });
}

function renderTripSuggestions(q, dropdownId, type) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    const query = (q || '').toLowerCase().trim();
    if (query.length < 1) { dropdown.style.display = 'none'; return; }
    
    let html = '';
    let count = 0;
    
    // Búsqueda de colonias delegada a OSM
    
    // Destinos / Paradas
    if (typeof allPhysicalStopsList !== 'undefined') {
        allPhysicalStopsList.filter(s => (s.name && s.name.toLowerCase().includes(query)) || (s.address && s.address.toLowerCase().includes(query)) || (s.type && s.type.toLowerCase().includes(query))).slice(0, 4).forEach(stop => {
            count++;
            const config = (typeof getStopIconConfig === 'function') ? getStopIconConfig(stop.name, stop.type) : { iconUrl: 'assets/icons/pin_parada.svg', bgColor: '#475569', category: 'Destino' };
            const objStr = encodeURIComponent(JSON.stringify({ name: stop.name, lat: stop.latitude, lng: stop.longitude }));
            html += `
                <div class="search-suggestion-item" onclick="selectTripPoint('${objStr}', '${type}')">
                    <div class="suggestion-icon" style="background: ${config.bgColor};"><img src="${config.iconUrl}" alt=""></div>
                    <div class="suggestion-content">
                        <div class="suggestion-title">${stop.name}</div>
                        <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px; flex-wrap: wrap;">
                            <span class="suggestion-badge" style="background: ${config.bgColor}15; color: ${config.bgColor};">${config.category || 'Destino'}</span>
                            <span class="suggestion-subtitle">📍 ${stop.address || 'Mazatlán'}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    if (count === 0) {
        html = `<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">Sin resultados para "${q}"</div>`;
    }
    dropdown.innerHTML = html;
    dropdown.style.display = 'block';

    // Disparar búsqueda asíncrona a OpenStreetMap (con debounce)
    if (query.length >= 3) {
        if (osmSearchTimeout) clearTimeout(osmSearchTimeout);
        osmSearchTimeout = setTimeout(() => {
            fetchOSMPlaces(query, dropdownId, type);
        }, 500);
    }
}

function selectTripPoint(objStr, type) {
    try {
        const point = JSON.parse(decodeURIComponent(objStr));
        if (type === 'origin') {
            selectedOrigin = point;
            const inp = document.getElementById('origin-input');
            if (inp) inp.value = point.name;
            const d = document.getElementById('origin-suggestions');
            if (d) d.style.display = 'none';
        } else {
            selectedDestination = point;
            const inp = document.getElementById('destination-input');
            if (inp) inp.value = point.name;
            const d = document.getElementById('destination-suggestions');
            if (d) d.style.display = 'none';
        }
    } catch (e) {
        console.error("Error en selectTripPoint:", e);
    }
}

function calculateTripRoute() {
    const container = document.getElementById('trip-results-container');
    if (!container) return;
    
    const origText = document.getElementById('origin-input')?.value.trim();
    const destText = document.getElementById('destination-input')?.value.trim();
    
    // Ya no hacemos fallback a COLONIAS_MAZATLAN
    
    if (!selectedOrigin || !selectedDestination) {
        showToast('⚠️ Por favor selecciona un Origen y Destino de la lista de sugerencias o GPS.', 'error');
        return;
    }
    
    container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.88rem;">🔄 Analizando rutas de autobús en Mazatlán...</div>`;
    
    setTimeout(() => {
        const validRoutes = [];
        allRoutes.forEach(r => {
            if (!r.coordinatesList || r.coordinatesList.length === 0) return;
            
            let minOrigDist = 999999;
            let minDestDist = 999999;
            
            r.coordinatesList.forEach(s => {
                if (!s.latitude || !s.longitude) return;
                
                const dOrig = calculateDistanceMeters(selectedOrigin.lat, selectedOrigin.lng, s.latitude, s.longitude);
                if (dOrig < minOrigDist) { minOrigDist = dOrig; }
                
                const dDest = calculateDistanceMeters(selectedDestination.lat, selectedDestination.lng, s.latitude, s.longitude);
                if (dDest < minDestDist) { minDestDist = dDest; }
            });
            
            // Si ambas distancias son razonables (ej. < 1400m caminando)
            if (minOrigDist <= 1400 && minDestDist <= 1400) {
                validRoutes.push({
                    route: r,
                    origDist: minOrigDist,
                    destDist: minDestDist,
                    score: minOrigDist + minDestDist
                });
            }
        });
        
        validRoutes.sort((a, b) => a.score - b.score);
        
        if (validRoutes.length === 0) {
            container.innerHTML = `
                <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: var(--radius-md); padding: 14px; text-align: center;">
                    <div style="font-size: 1.2rem; margin-bottom: 6px;"><img src="assets/icons/ui_alerta_error.svg" style="width:24px; filter: invert(19%) sepia(86%) saturate(2891%) hue-rotate(334deg) brightness(91%) contrast(92%);"></div>
                    <h4 style="margin: 0 0 6px 0; color: #9f1239; font-size: 0.95rem;">No hay ruta directa a menos de 1.4 km a pie</h4>
                    <p style="margin: 0; font-size: 0.8rem; color: #881337; line-height: 1.4;">
                        Te recomendamos tomar un camión hacia <b>Mercado Juárez</b> o <b>Av. Ejército Mexicano</b> donde transbordan la mayoría de rutas en Mazatlán.
                    </p>
                </div>
            `;
            return;
        }
        
        let html = `<h4 style="margin: 4px 0 8px 0; font-size: 0.85rem; font-weight: 800; color: #15803d; display: flex; align-items: center; gap: 6px;"><img src="assets/icons/ui_check.svg" style="width:16px; filter: invert(41%) sepia(81%) saturate(464%) hue-rotate(85deg) brightness(93%) contrast(92%);"> Opciones recomendadas (${validRoutes.length} encontradas):</h4>`;
        
        validRoutes.slice(0, 3).forEach((item, idx) => {
            const r = item.route;
            const badgeLabel = idx === 0 ? '🏆 Mejor Opción' : '👍 Alternativa';
            
            const args = `${r.id}, ${selectedOrigin.lat}, ${selectedOrigin.lng}, '${encodeURIComponent(selectedOrigin.name)}', ${selectedDestination.lat}, ${selectedDestination.lng}, '${encodeURIComponent(selectedDestination.name)}'`;
            
            html += `
                <div class="route-card trip-card" style="border-left: 5px solid ${r.color}; padding: 14px; background: var(--bg-white, #ffffff); box-shadow: 0 2px 8px rgba(0,0,0,0.06); cursor: pointer; transition: 0.2s;" onclick="toggleTripCard(this, ${args})">
                    <!-- HEADER COMPACTO (Siempre visible) -->
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="background: ${r.color}; width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 0 4px ${r.color};"></div>
                            <div>
                                <span style="background: ${r.color}15; color: ${r.color}; font-weight: 800; font-size: 0.65rem; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">${badgeLabel}</span>
                                <h4 style="margin: 4px 0 0 0; font-size: 1.1rem; font-weight: 800; color: var(--text-primary);">${r.name}</h4>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.1rem; font-weight: 800; color: #16a34a;">$${(r.price || 13).toFixed(2)}</div>
                        </div>
                    </div>
                    
                    <!-- DETALLES EXPANDIBLES (Ocultos por defecto) -->
                    <div class="trip-card-details" style="display: none; margin-top: 14px; border-top: 1px solid #e2e8f0; padding-top: 14px;">
                        <p style="margin: 0 0 10px 0; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4;">
                            ${r.description || 'Autobús urbano Mazatlán'} <br>
                            <b>Frecuencia:</b> Cada ${r.frequencyMinutes || 10} min. aprox.
                        </p>
                        
                        <div style="background: #f8fafc; border-radius: 8px; padding: 12px; font-size: 0.82rem; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 12px;">
                            <div style="display: flex; align-items: flex-start; gap: 10px; color: #1e293b;">
                                <div style="min-width: 10px; height: 10px; border-radius: 50%; background: #16a34a; margin-top: 4px; border: 2px solid white; box-shadow: 0 0 0 1px #16a34a;"></div>
                                <div>
                                    <span style="font-weight: 800; color: #16a34a;">Sube:</span> <b>Trayecto cercano</b><br>
                                    <span style="color: #64748b; font-size: 0.75rem;">A ~${Math.round(item.origDist)}m caminando desde el Origen</span>
                                </div>
                            </div>
                            <div style="display: flex; align-items: flex-start; gap: 10px; color: #1e293b;">
                                <div style="min-width: 10px; height: 10px; border-radius: 50%; background: #dc2626; margin-top: 4px; border: 2px solid white; box-shadow: 0 0 0 1px #dc2626;"></div>
                                <div>
                                    <span style="font-weight: 800; color: #dc2626;">Baja:</span> <b>Trayecto cercano</b><br>
                                    <span style="color: #64748b; font-size: 0.75rem;">A ~${Math.round(item.destDist)}m caminando hacia el Destino</span>
                                </div>
                            </div>
                        </div>
                        
                        <div style="margin-top: 12px; text-align: center; font-size: 0.85rem; font-weight: 800; color: ${r.color}; background: ${r.color}15; padding: 10px; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 6px;">
                            <img src="assets/icons/ui_ubicacion.svg" style="width:14px; height:14px; filter: opacity(0.7);"> Trazado mostrado en el mapa principal
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }, 400);
}

function toggleTripCard(cardEl, routeId, origLat, origLng, origNameEnc, destLat, destLng, destNameEnc) {
    const isExpanded = cardEl.querySelector('.trip-card-details').style.display === 'block';
    
    // Cerrar todas las demás tarjetas
    document.querySelectorAll('.trip-card').forEach(c => {
        c.querySelector('.trip-card-details').style.display = 'none';
        c.style.backgroundColor = 'var(--bg-white, #ffffff)';
    });
    
    if (!isExpanded) {
        // Expandir esta
        cardEl.querySelector('.trip-card-details').style.display = 'block';
        cardEl.style.backgroundColor = '#f8fafc'; // Resaltar ligeramente el fondo
        viewTripOnMap(routeId, origLat, origLng, origNameEnc, destLat, destLng, destNameEnc);
        
        // Auto-scroll
        setTimeout(() => {
            cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    } else {
        clearMapDrawings(); // Limpiar mapa al colapsar
    }
}

function viewTripOnMap(routeId, origLat, origLng, origNameEnc, destLat, destLng, destNameEnc) {
    const route = allRoutes.find(r => r.id === routeId);
    if (!route) return;
    
    clearMapDrawings(); // Limpiamos pines genéricos
    
    if (route.coordinatesList && route.coordinatesList.length > 0) {
        drawRouteLine(route.coordinatesList, route.color);
    }
    
    const origName = decodeURIComponent(origNameEnc);
    const destName = decodeURIComponent(destNameEnc);
    
    if (window._tripOrigMarker) mapInstance.removeLayer(window._tripOrigMarker);
    if (window._tripDestMarker) mapInstance.removeLayer(window._tripDestMarker);
    
    window._tripOrigMarker = L.marker([origLat, origLng], {
        icon: L.divIcon({
            className: 'custom-trip-pin',
            html: `<div style="background: #16a34a; color: white; padding: 5px 10px; border-radius: 9999px; font-weight: 800; font-size: 0.8rem; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); white-space: nowrap;">🟢 Origen: ${origName}</div>`,
            iconSize: [160, 30],
            iconAnchor: [80, 15]
        })
    }).addTo(mapInstance);
    
    window._tripDestMarker = L.marker([destLat, destLng], {
        icon: L.divIcon({
            className: 'custom-trip-pin',
            html: `<div style="background: #dc2626; color: white; padding: 5px 10px; border-radius: 9999px; font-weight: 800; font-size: 0.8rem; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); white-space: nowrap;">🔴 Destino: ${destName}</div>`,
            iconSize: [160, 30],
            iconAnchor: [80, 15]
        })
    }).addTo(mapInstance);
    
    const bounds = L.latLngBounds([[origLat, origLng], [destLat, destLng]]);
    mapInstance.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 });
    
    showToast(`🗺️ Mostrando viaje en ${route.name} (🟢 Origen ➔ 🔴 Destino)`);
}

// ----------------------------------------------------------
// GEOLOCALIZACIÓN
// ----------------------------------------------------------

function geolocateUser() {
    if (!navigator.geolocation) {
        showToast('Tu navegador no soporta geolocalización', 'error');
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;
            if (mapInstance) {
                mapInstance.setView([latitude, longitude], 16);
                if (window._userLocationMarker) {
                    mapInstance.removeLayer(window._userLocationMarker);
                }
                const userIcon = L.divIcon({
                    className: 'user-location-marker',
                    html: `<div style="width:18px;height:18px;border-radius:50%;background:#005C97;border:3px solid white;box-shadow:0 0 12px rgba(0,92,151,0.5);"></div>`,
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                });
                window._userLocationMarker = L.marker([latitude, longitude], { icon: userIcon })
                    .addTo(mapInstance)
                    .bindPopup('<b style="font-family:Inter,sans-serif;">Tu ubicación</b>');
            }
        },
        () => showToast('No se pudo obtener tu ubicación', 'error'),
        { enableHighAccuracy: true }
    );
}

// ----------------------------------------------------------
// EVENT LISTENERS
// ----------------------------------------------------------

function setupEventListeners() {
    // Sidebar toggle -> Abre el Menú Principal Drawer
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => toggleMainMenu(true));
    }

    const closeMenuBtn = document.getElementById('close-menu-btn');
    if (closeMenuBtn) closeMenuBtn.addEventListener('click', () => toggleMainMenu(false));

    const menuBackdrop = document.getElementById('menu-backdrop');
    if (menuBackdrop) menuBackdrop.addEventListener('click', () => toggleMainMenu(false));

    const menuAuthCard = document.getElementById('menu-auth-card');
    if (menuAuthCard) {
        menuAuthCard.addEventListener('click', () => {
            toggleMainMenu(false);
            if (Auth.user) {
                if (confirm('¿Deseas cerrar sesión?')) Auth.logout();
            } else {
                const lModal = document.getElementById('login-modal');
                if (lModal) lModal.style.display = 'flex';
            }
        });
    }

    const infoClose = document.getElementById('info-close');
    const infoBtn = document.getElementById('info-modal-btn');
    const infoModal = document.getElementById('info-modal');
    if (infoClose && infoModal) infoClose.addEventListener('click', () => { infoModal.style.display = 'none'; });
    if (infoBtn && infoModal) infoBtn.addEventListener('click', () => { infoModal.style.display = 'none'; });

    const btnNotificaciones = document.getElementById('btn-notificaciones');
    const notificationsModal = document.getElementById('notifications-modal');
    const notificationsClose = document.getElementById('notifications-close');
    
    if (btnNotificaciones && notificationsModal) {
        btnNotificaciones.addEventListener('click', () => notificationsModal.style.display = 'flex');
    }
    if (notificationsClose && notificationsModal) {
        notificationsClose.addEventListener('click', () => notificationsModal.style.display = 'none');
    }

    const reportClose = document.getElementById('report-close');
    const reportModal = document.getElementById('report-modal');
    const reportForm = document.getElementById('report-form');
    if (reportClose && reportModal) reportClose.addEventListener('click', () => { reportModal.style.display = 'none'; });
    if (reportForm) {
        reportForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (reportModal) reportModal.style.display = 'none';
            reportForm.reset();
            showToast('¡Reporte enviado con éxito! Gracias por ayudar a mejorar Don Rutero.');
        });
    }

    // Inicializar listeners del Planificador Inteligente ("¿Cómo Llego?")
    if (typeof setupTripPlannerListeners === 'function') setupTripPlannerListeners();

    // Search & Autocomplete
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            window.currentSearchLocation = null;
            filterRoutes(e.target.value);
        });
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length >= 1) renderSearchSuggestions(searchInput.value);
        });
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const dropdown = document.getElementById('search-suggestions');
                if (dropdown) dropdown.style.display = 'none';
            }
        });
    }
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            const dropdown = document.getElementById('search-suggestions');
            if (dropdown) dropdown.style.display = 'none';
        }
    });

    // Close detail
    const closeBtn = document.getElementById('close-detail-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeDetailPanel);

    // Filter pills
    document.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFilter = pill.dataset.filter || 'all';
            updateRouteDisplay();
        });
    });

    // Toggle Lugares
    const toggleLugares = document.getElementById('toggle-lugares-btn');
    if (toggleLugares) {
        toggleLugares.addEventListener('click', () => {
            toggleLugares.classList.toggle('active');
            const text = toggleLugares.querySelector('.toggle-text');
            if (text) text.textContent = toggleLugares.classList.contains('active') ? 'ON' : 'OFF';
            // Future: toggle POI markers on map
        });
    }

    // User badge (logout)
    const userBadge = document.getElementById('user-badge');
    const accountModal = document.getElementById('account-modal');
    const accountClose = document.getElementById('account-close');
    const accountLogoutBtn = document.getElementById('account-logout-btn');
    
    if (userBadge && accountModal) {
        userBadge.addEventListener('click', () => accountModal.style.display = 'flex');
    }
    if (accountClose && accountModal) {
        accountClose.addEventListener('click', () => accountModal.style.display = 'none');
    }
    if (accountLogoutBtn && accountModal) {
        accountLogoutBtn.addEventListener('click', () => {
            accountModal.style.display = 'none';
            Auth.logout();
        });
    }

    // Admin button
    const adminBtn = document.getElementById('admin-btn');
    if (adminBtn) adminBtn.addEventListener('click', () => { window.location.href = 'admin.html'; });

    // Geolocation FAB
    const fabLocation = document.getElementById('fab-location');
    if (fabLocation) fabLocation.addEventListener('click', geolocateUser);

    // Login modal
    const loginBtn = document.getElementById('login-btn');
    const loginModal = document.getElementById('login-modal');
    const loginClose = document.getElementById('login-close');
    const loginForm = document.getElementById('login-form');
    const loginErrorBanner = document.getElementById('login-error-banner');
    const loginErrorText = document.getElementById('login-error-text');

    if (loginBtn) loginBtn.addEventListener('click', () => { 
        if (loginErrorBanner) loginErrorBanner.style.display = 'none';
        loginModal.style.display = 'flex'; 
    });
    if (loginClose) loginClose.addEventListener('click', () => { loginModal.style.display = 'none'; });

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (loginErrorBanner) loginErrorBanner.style.display = 'none';
            const u = document.getElementById('login-username').value.trim();
            const p = document.getElementById('login-password').value;
            if (!u || !p) {
                if (loginErrorText) loginErrorText.textContent = 'Por favor ingresa usuario y contraseña';
                if (loginErrorBanner) loginErrorBanner.style.display = 'flex';
                return;
            }
            try {
                const success = await Auth.login(u, p);
                if (success) { 
                    loginModal.style.display = 'none'; 
                    loginForm.reset(); 
                } else {
                    if (loginErrorText) loginErrorText.textContent = 'Usuario o contraseña incorrectos';
                    if (loginErrorBanner) loginErrorBanner.style.display = 'flex';
                }
            } catch (err) {
                if (loginErrorText) loginErrorText.textContent = err.message || 'Error al iniciar sesión';
                if (loginErrorBanner) loginErrorBanner.style.display = 'flex';
            }
        });
    }

    // Register modal (2 Pasos)
    const registerModal = document.getElementById('register-modal');
    const registerClose = document.getElementById('register-close');
    const registerForm = document.getElementById('register-form');
    const verifyForm = document.getElementById('verify-form');
    const openRegister = document.getElementById('open-register');
    const openLogin = document.getElementById('open-login');
    const step1Container = document.getElementById('register-step-1-form');
    const step2Container = document.getElementById('register-step-2-code');
    const regErrorBanner = document.getElementById('register-error-banner');
    const regErrorText = document.getElementById('register-error-text');
    const verifyErrorBanner = document.getElementById('verify-error-banner');
    const verifyErrorText = document.getElementById('verify-error-text');

    function resetRegisterModal() {
        if (regErrorBanner) regErrorBanner.style.display = 'none';
        if (verifyErrorBanner) verifyErrorBanner.style.display = 'none';
        if (step1Container) step1Container.style.display = 'flex';
        if (step2Container) step2Container.style.display = 'none';
        if (registerForm) registerForm.reset();
        if (verifyForm) verifyForm.reset();
    }

    if (openRegister) openRegister.addEventListener('click', (e) => { 
        e.preventDefault(); 
        loginModal.style.display = 'none'; 
        resetRegisterModal();
        registerModal.style.display = 'flex'; 
    });
    if (openLogin) openLogin.addEventListener('click', (e) => { 
        e.preventDefault(); 
        registerModal.style.display = 'none'; 
        if (loginErrorBanner) loginErrorBanner.style.display = 'none';
        loginModal.style.display = 'flex'; 
    });
    if (registerClose) registerClose.addEventListener('click', () => { registerModal.style.display = 'none'; });

    // PASO 1: Enviar formulario principal
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (regErrorBanner) regErrorBanner.style.display = 'none';

            const email = document.getElementById('register-email').value.trim();
            const u = document.getElementById('register-username').value.trim();
            const p = document.getElementById('register-password').value;
            const confirmP = document.getElementById('register-confirm-password').value;

            // Validaciones
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                regErrorText.textContent = 'Ingresa un correo electrónico válido';
                regErrorBanner.style.display = 'flex';
                return;
            }
            if (u.length < 3) {
                regErrorText.textContent = 'El usuario debe tener al menos 3 caracteres';
                regErrorBanner.style.display = 'flex';
                return;
            }
            if (p.length < 6) {
                regErrorText.textContent = 'La contraseña debe tener al menos 6 caracteres';
                regErrorBanner.style.display = 'flex';
                return;
            }
            if (p !== confirmP) {
                regErrorText.textContent = 'Las contraseñas no coinciden';
                regErrorBanner.style.display = 'flex';
                return;
            }

            try {
                // Solicitar código de verificación al backend
                const res = await Api.sendVerificationCode(email);
                window._tempRegEmail = email;
                window._tempRegUsername = u;
                window._tempRegPassword = p;
                window._tempRegCode = res.code;

                // Pasar al Paso 2
                step1Container.style.display = 'none';
                step2Container.style.display = 'flex';
                const emailDisplay = document.getElementById('register-email-display');
                if (emailDisplay) emailDisplay.textContent = email;

                // Notificación demo
                showToast(`📲 Demo: Tu código para ${email} es ${res.code}`);
            } catch (err) {
                regErrorText.textContent = err.message || 'Error al validar el correo';
                regErrorBanner.style.display = 'flex';
            }
        });
    }

    // PASO 2: Verificar código y crear cuenta
    if (verifyForm) {
        verifyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (verifyErrorBanner) verifyErrorBanner.style.display = 'none';

            const codeInput = document.getElementById('register-code-input').value.trim();
            if (codeInput !== window._tempRegCode) {
                verifyErrorText.textContent = 'Código incorrecto. Inténtalo de nuevo';
                verifyErrorBanner.style.display = 'flex';
                return;
            }

            try {
                const success = await Auth.register(window._tempRegEmail, window._tempRegUsername, window._tempRegPassword);
                if (success) {
                    registerModal.style.display = 'none';
                    resetRegisterModal();
                    if (loginErrorBanner) loginErrorBanner.style.display = 'none';
                    loginModal.style.display = 'flex';
                }
            } catch (err) {
                verifyErrorText.textContent = err.message || 'Error al crear la cuenta';
                verifyErrorBanner.style.display = 'flex';
            }
        });
    }

    const resendLink = document.getElementById('resend-code-link');
    if (resendLink) {
        resendLink.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const res = await Api.sendVerificationCode(window._tempRegEmail);
                window._tempRegCode = res.code;
                showToast(`📲 Demo: Nuevo código enviado: ${res.code}`);
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    const backStep1 = document.getElementById('back-to-step-1');
    if (backStep1) {
        backStep1.addEventListener('click', (e) => {
            e.preventDefault();
            step2Container.style.display = 'none';
            step1Container.style.display = 'flex';
            if (regErrorBanner) regErrorBanner.style.display = 'none';
        });
    }

    // Forgot Password modal
    const forgotModal = document.getElementById('forgot-modal');
    const forgotClose = document.getElementById('forgot-close');
    const forgotForm = document.getElementById('forgot-form');
    const openForgot = document.getElementById('open-forgot');
    const forgotBackLogin = document.getElementById('forgot-back-login');
    const forgotErrorBanner = document.getElementById('forgot-error-banner');
    const forgotErrorText = document.getElementById('forgot-error-text');
    const forgotSuccessBanner = document.getElementById('forgot-success-banner');
    const forgotSuccessText = document.getElementById('forgot-success-text');

    function resetForgotModal() {
        if (forgotErrorBanner) forgotErrorBanner.style.display = 'none';
        if (forgotSuccessBanner) forgotSuccessBanner.style.display = 'none';
        if (forgotForm) forgotForm.reset();
    }

    if (openForgot) {
        openForgot.addEventListener('click', (e) => {
            e.preventDefault();
            loginModal.style.display = 'none';
            resetForgotModal();
            forgotModal.style.display = 'flex';
        });
    }
    if (forgotClose) forgotClose.addEventListener('click', () => { forgotModal.style.display = 'none'; });
    if (forgotBackLogin) {
        forgotBackLogin.addEventListener('click', (e) => {
            e.preventDefault();
            forgotModal.style.display = 'none';
            if (loginErrorBanner) loginErrorBanner.style.display = 'none';
            loginModal.style.display = 'flex';
        });
    }

    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (forgotErrorBanner) forgotErrorBanner.style.display = 'none';
            if (forgotSuccessBanner) forgotSuccessBanner.style.display = 'none';

            const email = document.getElementById('forgot-email').value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                if (forgotErrorText) forgotErrorText.textContent = 'Ingresa un correo electrónico válido';
                if (forgotErrorBanner) forgotErrorBanner.style.display = 'flex';
                return;
            }

            try {
                const res = await Api.forgotPassword(email);
                if (forgotSuccessText) forgotSuccessText.textContent = res.message || 'Enlace enviado con éxito';
                if (forgotSuccessBanner) forgotSuccessBanner.style.display = 'flex';
            } catch (err) {
                if (forgotErrorText) forgotErrorText.textContent = err.message || 'No existe ninguna cuenta con este correo';
                if (forgotErrorBanner) forgotErrorBanner.style.display = 'flex';
            }
        });
    }
}

// ----------------------------------------------------------
// LÓGICA DEL MENÚ PRINCIPAL Y MODALES INFORMATIVOS
// ----------------------------------------------------------
const menuContentData = {
    'guia_app': {
        title: '¿Cómo usar Don Rutero?',
        icon: 'assets/icons/ui_buscar.svg',
        body: '1. Buscador Principal:\nEscribe el nombre de la colonia, hospital o plaza a la que quieres ir. Te mostraremos las rutas que pasan cerca.\n\n2. Planificador Inteligente (¿Cómo llego?):\nPon el lugar donde estás y el lugar a donde vas. El sistema calculará automáticamente qué camión te lleva más directo.\n\n3. Detalles de Ruta:\nToca cualquier camión de la lista para ver su recorrido exacto en el mapa.'
    },
    'faq': {
        title: 'Preguntas Frecuentes (FAQ)',
        icon: 'assets/icons/ui_campana.svg',
        body: '• ¿Cuánto cuesta el pasaje?\n$13 MXN para los normales y $15 MXN para los que tienen aire acondicionado (Verdes).\n\n• ¿Tienen descuento de estudiante?\nSí, presentando tu credencial escolar vigente el cobro es preferencial.\n\n• ¿A qué hora dejan de pasar?\nLa gran mayoría inician sus recorridos a las 5:30 AM y terminan su última vuelta alrededor de las 10:00 PM o 10:30 PM. ¡Toma tus precauciones!\n\n• ¿La aplicación es gratis?\nSí, 100% gratuita para apoyar a todos los mazatlecos y turistas.'
    },
    'transporte_mzt': {
        title: 'Guía del Transporte en Mazatlán',
        icon: 'assets/icons/ui_camion.svg',
        body: 'En Mazatlán operan principalmente dos concesionarios:\n\n- Alianza de Camiones (Verdes / "Puro Sinaloa"):\nOperan unidades modernas, la mayoría con aire acondicionado, cubriendo toda la ciudad y zona costera.\n\n- Águilas del Pacífico (Rojos):\nAutobuses tradicionales que conectan colonias populares con el Centro Histórico y Zona Dorada.'
    },
    'acerca': {
        title: 'Acerca de Don Rutero',
        icon: 'assets/icons/ui_ubicacion.svg',
        body: 'Don Rutero es una plataforma digital de movilidad urbana creada para facilitar los traslados en transporte público en Mazatlán, Sinaloa.\n\nNuestra misión es ayudar tanto a locales como a turistas a navegar la ciudad de forma fácil, rápida y sin perderse en el intento.'
    },
    'legal': {
        title: 'Privacidad y Avisos Legales',
        icon: 'assets/icons/ui_filtro.svg',
        body: 'La información mostrada es referencial y puede sufrir cambios sin previo aviso.\n\nPrivacidad: Tu ubicación GPS solo se usa de forma local en tu dispositivo y nunca se comparte con terceros.'
    }
};

function toggleMainMenu(show) {
    const drawer = document.getElementById('main-menu-drawer');
    const backdrop = document.getElementById('menu-backdrop');
    if (!drawer || !backdrop) return;
    
    const isOpen = show !== undefined ? show : !drawer.classList.contains('open');
    if (isOpen) {
        drawer.classList.add('open');
        backdrop.classList.add('open');
    } else {
        drawer.classList.remove('open');
        backdrop.classList.remove('open');
    }
}

function showMenuModal(type) {
    toggleMainMenu(false);
    
    if (type === 'sugerir') {
        const reportModal = document.getElementById('report-modal');
        if (reportModal) reportModal.style.display = 'flex';
        return;
    }

    const data = menuContentData[type];
    if (!data) return;
    
    const modal = document.getElementById('info-modal');
    const titleEl = document.getElementById('info-modal-title');
    const bodyEl = document.getElementById('info-modal-body');
    const iconEl = document.querySelector('#info-modal-icon img');
    
    if (titleEl) titleEl.textContent = data.title;
    if (bodyEl) bodyEl.textContent = data.body;
    if (iconEl) iconEl.src = data.icon;
    
    if (modal) {
        modal.style.display = 'flex';
    }
}

