/* -----------------------------------------------------
   MÓDULO DE AUTENTICACIÓN Y GESTIÓN DE SESIÓN (Ruta_Bus)
   ----------------------------------------------------- */

// Estado global de la sesión
const Auth = {
    user: null, // { username, role }

    init: async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const userData = await Api.verifyToken();
                Auth.user = userData;
                Auth.updateUI();
            } catch (err) {
                console.warn("Token guardado no válido:", err.message);
                Auth.logout();
            }
        } else {
            Auth.updateUI();
        }
    },

    login: async (username, password) => {
        try {
            const data = await Api.login(username, password);
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.username);
            localStorage.setItem('role', data.role);
            Auth.user = { username: data.username, role: data.role };
            Auth.updateUI();
            showToast('Sesión iniciada correctamente');
            return true;
        } catch (err) {
            showToast(err.message, 'error');
            return false;
        }
    },

    register: async (email, username, password) => {
        try {
            await Api.register(email, username, password);
            showToast('¡Cuenta creada y verificada con éxito! Ya puedes iniciar sesión.');
            return true;
        } catch (err) {
            showToast(err.message, 'error');
            return false;
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        Auth.user = null;
        Auth.updateUI();
        showToast('Sesión cerrada');
        
        // Si el usuario está en el panel de administrador, redireccionar a la página principal
        if (window.location.pathname.includes('admin.html')) {
            window.location.href = 'index.html';
        }
    },

    updateUI: () => {
        const userBadge = document.getElementById('user-badge');
        const adminBtn = document.getElementById('admin-btn');
        const loginBtn = document.getElementById('login-btn');
        const menuTitle = document.getElementById('menu-auth-title');
        const menuSub = document.getElementById('menu-auth-subtitle');
        
        if (Auth.user) {
            // Usuario Autenticado
            if (userBadge) {
                userBadge.innerHTML = `<img src="assets/icons/ui_usuario.svg" style="width:14px; height:14px; vertical-align:-2px;"> <span>${Auth.user.username}</span>`;
                userBadge.style.display = 'flex';
                userBadge.title = 'Ver mi perfil';
            }
            if (loginBtn) loginBtn.style.display = 'none';

            // Mostrar botón de Admin si tiene el rol
            if (Auth.user.role === 'ROLE_ADMIN') {
                if (adminBtn) adminBtn.style.display = 'flex';
            } else {
                if (adminBtn) adminBtn.style.display = 'none';
            }
            if (menuTitle) menuTitle.textContent = `Hola, ${Auth.user.username}`;
            if (menuSub) menuSub.textContent = 'Haz clic para cerrar sesión';
        } else {
            // Usuario Anónimo
            if (userBadge) {
                userBadge.style.display = 'none';
            }
            if (loginBtn) {
                loginBtn.style.display = 'flex';
            }
            if (adminBtn) {
                adminBtn.style.display = 'none';
            }
            if (menuTitle) menuTitle.textContent = 'Iniciar sesión';
            if (menuSub) menuSub.textContent = 'Guarda tus favoritos y comenta';
        }
    }
};

// Función global para mostrar notificaciones flotantes (Toast)
function showToast(message, type = 'success') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'toast show';
    if (type === 'error') {
        toast.classList.add('error');
    }
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}
