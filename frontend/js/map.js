/* -----------------------------------------------------
   GESTIÓN DEL MAPA LEAFLET (Ruta_Bus)
   ----------------------------------------------------- */

// Coordenadas base: Mazatlán, Sinaloa
const MAP_CENTER = [23.2329, -106.4062];
const DEFAULT_ZOOM = 13;

let mapInstance = null;
let activePolylines = []; // Almacena las líneas dibujadas
let activeMarkers = [];    // Almacena los marcadores de paradas
let allStopsMarkers = [];  // Almacena los marcadores de todas las paradas físicas del sistema
let activeArrows = [];     // Almacena las flechas de dirección del recorrido
let allPhysicalStopsList = []; // Catálogo global de paradas físicas para búsqueda y autocompletado

// Inicializa el mapa
function initLeafletMap(containerId) {
    if (mapInstance) return mapInstance;

    // Crear mapa centrado en Mazatlán
    mapInstance = L.map(containerId, {
        zoomControl: false // Quitamos control de zoom por defecto para posicionarlo a la derecha
    });
    
    mapInstance.setView(MAP_CENTER, DEFAULT_ZOOM);

    // Añadir control de zoom en la esquina superior izquierda
    L.control.zoom({ position: 'topleft' }).addTo(mapInstance);

    // Cargar capa base premium (CartoDB Positron - Grayscale/Light elegante)
    // Esto hace que las líneas de colores de las rutas resalten de forma espectacular
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(mapInstance);

    return mapInstance;
}

// Limpia el mapa de trazados y paradas seleccionadas
function clearMapDrawings() {
    activePolylines.forEach(p => mapInstance.removeLayer(p));
    activePolylines = [];

    activeMarkers.forEach(m => mapInstance.removeLayer(m));
    activeMarkers = [];
    
    if (activeArrows) {
        activeArrows.forEach(a => mapInstance.removeLayer(a));
        activeArrows = [];
    }
}

// Dibuja flechas de dirección a lo largo de una polilínea para indicar el sentido del camión
function drawRouteArrows(latLngs, color = '#6366f1') {
    if (!mapInstance || !latLngs || latLngs.length < 2) return [];

    const arrows = [];
    let totalDistance = 0;
    const distances = [0];

    // 1. Calcular distancias acumuladas en metros entre puntos
    for (let i = 0; i < latLngs.length - 1; i++) {
        const p1 = L.latLng(latLngs[i][0], latLngs[i][1]);
        const p2 = L.latLng(latLngs[i+1][0], latLngs[i+1][1]);
        totalDistance += p1.distanceTo(p2);
        distances.push(totalDistance);
    }

    // 2. Definir distancia entre flechas (ej. cada 70 metros o ~55 flechas por ruta para que sea super clara y continua en cada calle)
    let step = Math.max(70, totalDistance / 55);
    let nextArrowDist = step / 2; // Colocar la primera flecha cerca del inicio

    for (let i = 0; i < latLngs.length - 1; i++) {
        while (nextArrowDist >= distances[i] && nextArrowDist < distances[i+1]) {
            const segmentLen = distances[i+1] - distances[i];
            if (segmentLen > 0.1) {
                const ratio = (nextArrowDist - distances[i]) / segmentLen;
                const lat = latLngs[i][0] + (latLngs[i+1][0] - latLngs[i][0]) * ratio;
                const lng = latLngs[i][1] + (latLngs[i+1][1] - latLngs[i][1]) * ratio;

                // Calcular ángulo trigonométrico en proyección Mercator aproximada
                const dLat = latLngs[i+1][0] - latLngs[i][0];
                const dLon = (latLngs[i+1][1] - latLngs[i][1]) * Math.cos(lat * Math.PI / 180);
                const angle = Math.atan2(dLon, dLat) * (180 / Math.PI);

                // Crear icono SVG de flecha directriz (estilo navegación GPS)
                const arrowIcon = L.divIcon({
                    className: 'route-direction-arrow',
                    html: `<div style="transform: rotate(${angle}deg); display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.5)); pointer-events: none;">
                             <svg viewBox="0 0 24 24" width="16" height="16" style="fill: ${color}; stroke: #ffffff; stroke-width: 2.5px; stroke-linejoin: round;">
                               <path d="M12 2 L19 21 L12 17 L5 21 Z" />
                             </svg>
                           </div>`,
                    iconSize: [22, 22],
                    iconAnchor: [11, 11]
                });

                const arrowMarker = L.marker([lat, lng], { icon: arrowIcon, interactive: false }).addTo(mapInstance);
                arrows.push(arrowMarker);
            }
            nextArrowDist += step;
        }
    }

    return arrows;
}

// Dibuja una línea de ruta en el mapa exactamente por las coordenadas trazadas
function drawRouteLine(coordinates, color = '#6366f1') {
    if (!mapInstance || !coordinates || coordinates.length === 0) return;

    // Convertir coordenadas del backend {latitude, longitude} a formato Leaflet [lat, lng]
    const latLngs = coordinates.map(c => [c.latitude, c.longitude]);

    // Crear polilínea exacta sin desplazamientos ni separaciones para que pase justo por las calles marcadas
    const polyline = L.polyline(latLngs, {
        color: color,
        weight: 5,
        opacity: 0.9,
        lineJoin: 'round'
    }).addTo(mapInstance);

    activePolylines.push(polyline);

    // Dibuja flechas directrices a lo largo de la ruta para indicar el sentido del camión en cada calle
    const arrows = drawRouteArrows(latLngs, color);
    activeArrows.push(...arrows);

    // Ajustar vista para encuadrar la ruta
    mapInstance.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    return polyline;
}

// Helper para obtener configuración vectorial SVG y color de marca según la categoría del lugar en Mazatlán (sin emojis)
function getStopIconConfig(stopName, stopType) {
    const type = (stopType || '').toLowerCase();
    const name = (stopName || '').toLowerCase();
    
    if (type === 'escuela' || name.includes('uas') || name.includes('itmaz') || name.includes('upsin') || name.includes('ico') || name.includes('universidad') || name.includes('tecnológico') || name.includes('campus') || name.includes('escuela') || name.includes('colegio') || name.includes('instituto') || name.includes('cbtis') || name.includes('cetmar') || name.includes('conalep')) {
        return { iconUrl: 'assets/icons/pin_escuela.svg', bgColor: '#2563EB', category: 'Centro Educativo / Campus' };
    }
    if (type === 'hospital' || type === 'salud' || name.includes('hospital') || name.includes('imss') || name.includes('issste') || name.includes('sharp') || name.includes('martiniano') || name.includes('clínica') || name.includes('médico') || name.includes('salud') || name.includes('cruz roja') || name.includes('alhma')) {
        return { iconUrl: 'assets/icons/pin_hospital.svg', bgColor: '#DC2626', category: 'Hospital / Centro Médico' };
    }
    if (type === 'centro_comercial' || type === 'comercio' || type === 'mercado' || name.includes('mercado') || name.includes('plaza') || name.includes('galerías') || name.includes('sendero') || name.includes('acaya') || name.includes('soriana') || name.includes('ley') || name.includes('walmart') || name.includes('tienda') || name.includes('comercial') || name.includes('home depot') || name.includes('sams club') || name.includes('bodega aurrera') || name.includes('office depot')) {
        return { iconUrl: 'assets/icons/pin_tienda.svg', bgColor: '#059669', category: 'Plaza Comercial / Mercado' };
    }
    if (type === 'transporte' || name.includes('central') || name.includes('terminal') || name.includes('autobuses') || name.includes('cam') || name.includes('marítima') || name.includes('ferry') || name.includes('ferries') || name.includes('aeropuerto') || name.includes('puerto') || name.includes('embarcadero') || name.includes('cruceros')) {
        return { iconUrl: 'assets/icons/pin_puerto.svg', bgColor: '#D97706', category: 'Terminal de Transporte' };
    }
    if (type === 'hotel' || type === 'playa' || name.includes('hotel') || name.includes('riu') || name.includes('resort') || name.includes('playa') || name.includes('cerritos') || name.includes('dorada') || name.includes('olas altas') || name.includes('marina') || name.includes('yates') || name.includes('venadito') || name.includes('pueblo bonito') || name.includes('brujas')) {
        return { iconUrl: 'assets/icons/pin_hotel.svg', bgColor: '#0891B2', category: 'Zona Costera / Hotelera' };
    }
    if (type === 'turistico' || type === 'parque' || type === 'plaza' || type === 'iglesia' || type === 'deportivo' || type === 'gobierno' || type === 'entretenimiento' || name.includes('parque') || name.includes('acuario') || name.includes('estadio') || name.includes('teodoro') || name.includes('encanto') || name.includes('glorieta') || name.includes('plazuela') || name.includes('monumento') || name.includes('monos') || name.includes('clavadista') || name.includes('catedral') || name.includes('teatro') || name.includes('mirador') || name.includes('malecón') || name.includes('cinépolis') || name.includes('cinemex') || name.includes('museo') || name.includes('palacio')) {
        return { iconUrl: 'assets/icons/pin_parque.svg', bgColor: '#7C3AED', category: 'Punto Emblemático / Turismo' };
    }
    
    return { iconUrl: 'assets/icons/pin_parada.svg', bgColor: '#475569', category: 'Parada Oficial del Sistema' };
}

// Dibuja los marcadores de paradas en el mapa
function drawRouteStops(stops, color = '#6366f1') {
    if (!mapInstance || !stops || stops.length === 0) return;

    stops.forEach((rs, index) => {
        const stop = rs.stop;
        const config = getStopIconConfig(stop.name, stop.type);
        const markerBg = color || config.bgColor;
        
        // Crear un icono vectorial SVG moderno sin emojis
        const stopIcon = L.divIcon({
            className: 'custom-stop-marker',
            html: `<div style="background-color: ${markerBg}; border: 2.5px solid white; width: 26px; height: 26px; border-radius: 50%; box-shadow: 0 3px 8px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; transition: transform 0.2s;">
                     <img src="${config.iconUrl}" alt="" style="width: 14px; height: 14px; filter: brightness(0) invert(1); pointer-events: none;">
                   </div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
        });

        // Crear marcador con popup elegante
        const marker = L.marker([stop.latitude, stop.longitude], { icon: stopIcon })
            .addTo(mapInstance)
            .bindPopup(`
                <div style="font-family: 'Inter', sans-serif; padding: 2px; min-width: 170px;">
                    <span style="font-size: 0.7rem; background: rgba(0,0,0,0.06); color: ${config.bgColor}; padding: 2px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase; display: inline-block; margin-bottom: 4px;">${config.category}</span>
                    <h4 style="margin: 0 0 4px 0; color: #1f2937; font-weight: 700; font-size: 0.95rem;">Parada #${rs.stopOrder} — ${stop.name}</h4>
                    <p style="margin: 0 0 4px 0; color: #475569; font-size: 0.78rem;">📍 ${stop.address || 'Mazatlán, Sinaloa'}</p>
                    <p style="margin: 0; color: #64748b; font-size: 0.75rem;">GPS: ${stop.latitude.toFixed(4)}, ${stop.longitude.toFixed(4)}</p>
                </div>
            `);

        activeMarkers.push(marker);
    });
}

// Carga y dibuja todas las paradas físicas del sistema (con iconos SVG inteligentes por categoría)
async function loadAllPhysicalStopsOnMap() {
    try {
        // Limpiar paradas físicas previas si las hay
        allStopsMarkers.forEach(m => mapInstance.removeLayer(m));
        allStopsMarkers = [];

        allPhysicalStopsList = await Api.getAllStops();
        allPhysicalStopsList.forEach(stop => {
            const config = getStopIconConfig(stop.name, stop.type);

            const defaultIcon = L.divIcon({
                className: 'physical-stop-marker',
                html: `<div style="background-color: ${config.bgColor}; border: 2px solid #ffffff; width: 22px; height: 22px; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; opacity: 0.9;">
                         <img src="${config.iconUrl}" alt="" style="width: 12px; height: 12px; filter: brightness(0) invert(1); pointer-events: none;">
                       </div>`,
                iconSize: [22, 22],
                iconAnchor: [11, 11]
            });

            const marker = L.marker([stop.latitude, stop.longitude], { icon: defaultIcon })
                .addTo(mapInstance)
                .bindPopup(`
                    <div style="font-family: 'Inter', sans-serif; padding: 2px; min-width: 180px;">
                        <span style="font-size: 0.7rem; background: ${config.bgColor}15; color: ${config.bgColor}; padding: 3px 8px; border-radius: 9999px; font-weight: 700; text-transform: uppercase; display: inline-block; margin-bottom: 6px;">${config.category}</span>
                        <h4 style="margin: 0 0 4px 0; color: #0f172a; font-size: 0.9rem; font-weight: 700; line-height: 1.3;">${stop.name}</h4>
                        <p style="margin: 0 0 4px 0; color: #475569; font-size: 0.78rem;">📍 ${stop.address || 'Mazatlán, Sinaloa'}</p>
                        <p style="margin: 0; color: #64748b; font-size: 0.72rem;">GPS: ${stop.latitude.toFixed(4)}, ${stop.longitude.toFixed(4)}</p>
                    </div>
                `);

            allStopsMarkers.push(marker);
        });
    } catch (err) {
        console.error("Error al cargar paradas físicas:", err.message);
    }
}
