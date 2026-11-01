/* -----------------------------------------------------
   MÓDULO DE COMUNICACIÓN CON API REST (Ruta_Bus)
   ----------------------------------------------------- */

// Configuración dinámica de URL para que funcione en desarrollo local (localhost:8080 / Live Server / file://) y cuando se publique en producción o red local
const API_BASE_URL = (window.location.protocol === 'file:' || window.location.port === '5500' || window.location.port === '3000' || !window.location.host) 
    ? 'http://localhost:8080/api' 
    : window.location.origin + '/api';

// Helper para obtener cabeceras HTTP con token de autenticación
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

// Helper para procesar errores HTTP en endpoints de administración e informar si la sesión expiró
async function handleAdminError(response, defaultMsg) {
    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            throw new Error('⚠️ Tu sesión o token de administrador ha expirado o es inválido. Por favor ABRE UNA NUEVA PESTAÑA en tu navegador, inicia sesión como admin nuevamente y luego regresa a esta pestaña para pulsar Guardar otra vez (¡NO recargues esta página y no perderás ni un solo punto de tu trazado!).');
        }
        let errorMsg = defaultMsg;
        try {
            const errData = await response.json();
            if (errData.error || errData.message) {
                errorMsg += `: ${errData.error || errData.message}`;
            }
        } catch (e) {
            try {
                const text = await response.text();
                if (text && text.length < 200) errorMsg += `: ${text}`;
            } catch (err) {}
        }
        throw new Error(errorMsg);
    }
}

// Objeto API con todos los métodos de consumo
const Api = {
    // -----------------------------------------------------
    // AUTENTICACIÓN
    // -----------------------------------------------------
    login: async (username, password) => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Error al iniciar sesión');
        }
        return await response.json();
    },

    register: async (email, username, password) => {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Error al registrarse');
        }
        return await response.json();
    },

    sendVerificationCode: async (email) => {
        const response = await fetch(`${API_BASE_URL}/auth/send-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Error al enviar código de verificación');
        }
        return await response.json();
    },

    forgotPassword: async (email) => {
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'No existe ninguna cuenta con este correo');
        }
        return await response.json();
    },

    verifyToken: async () => {
        const response = await fetch(`${API_BASE_URL}/auth/verify`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            throw new Error('Sesión inválida o expirada');
        }
        return await response.json();
    },

    // -----------------------------------------------------
    // CONSULTA DE RUTAS Y PARADAS (PÚBLICAS)
    // -----------------------------------------------------
    getRoutes: async () => {
        const response = await fetch(`${API_BASE_URL}/routes`);
        if (!response.ok) throw new Error('Error al obtener las rutas');
        return await response.json();
    },

    getRouteDetails: async (id) => {
        const response = await fetch(`${API_BASE_URL}/routes/${id}`);
        if (!response.ok) throw new Error('Error al obtener los detalles de la ruta');
        return await response.json();
    },

    getRouteStops: async (id) => {
        const response = await fetch(`${API_BASE_URL}/routes/${id}/stops`);
        if (!response.ok) throw new Error('Error al obtener las paradas de la ruta');
        return await response.json();
    },

    getRouteCoordinates: async (id) => {
        const response = await fetch(`${API_BASE_URL}/routes/${id}/coordinates`);
        if (!response.ok) throw new Error('Error al obtener las coordenadas de la ruta');
        return await response.json();
    },

    getAllStops: async () => {
        const response = await fetch(`${API_BASE_URL}/routes/stops`);
        if (!response.ok) throw new Error('Error al obtener todas las paradas');
        return await response.json();
    },

    // -----------------------------------------------------
    // GESTIÓN DE ADMINISTRACIÓN (PROTEGIDAS)
    // -----------------------------------------------------
    createRoute: async (routeData) => {
        const response = await fetch(`${API_BASE_URL}/admin/routes`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(routeData)
        });
        await handleAdminError(response, 'Error al crear la ruta');
        return await response.json();
    },

    updateRoute: async (id, routeData) => {
        const response = await fetch(`${API_BASE_URL}/admin/routes/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(routeData)
        });
        await handleAdminError(response, 'Error al actualizar la ruta');
        return await response.json();
    },

    deleteRoute: async (id) => {
        const response = await fetch(`${API_BASE_URL}/admin/routes/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        await handleAdminError(response, 'Error al eliminar la ruta');
        return await response.json();
    },

    createStop: async (stopData) => {
        const response = await fetch(`${API_BASE_URL}/admin/stops`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(stopData)
        });
        await handleAdminError(response, 'Error al crear la parada');
        return await response.json();
    },

    updateStop: async (id, stopData) => {
        const response = await fetch(`${API_BASE_URL}/admin/stops/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(stopData)
        });
        await handleAdminError(response, 'Error al actualizar la parada');
        return await response.json();
    },

    deleteStop: async (id) => {
        const response = await fetch(`${API_BASE_URL}/admin/stops/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        await handleAdminError(response, 'Error al eliminar la parada');
        return await response.json();
    },

    updateRouteGeometry: async (routeId, coordinates, stopIds) => {
        const response = await fetch(`${API_BASE_URL}/admin/routes/${routeId}/geometry`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ coordinates, stopIds })
        });
        await handleAdminError(response, 'Error al guardar la geometría de la ruta');
        return await response.json();
    }
};
