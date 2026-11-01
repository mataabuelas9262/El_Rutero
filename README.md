# 🚍 Don Rutero — Rutas de Camiones y Transporte Público de Mazatlán

<div align="center">

![Don Rutero Logo](frontend/assets/horizontal_compacto.svg)

**La plataforma web interactiva definitiva para navegar y consultar el transporte público en la "Perla del Pacífico" (Mazatlán, Sinaloa).**

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.1-brightgreen.svg?logo=springboot)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-17%2B-orange.svg?logo=openjdk)](https://openjdk.org/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900.svg?logo=leaflet)](https://leafletjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue.svg?logo=mysql)](https://www.mysql.com/)
[![Security](https://img.shields.io/badge/Security-JWT%20RBAC-red.svg?logo=springsecurity)](https://jwt.io/)

</div>

---

## 🌟 ¿Por qué nació Don Rutero?
En Mazatlán existen numerosas rutas de autobuses urbanos operadas por diversos concesionarios (como los **Camiones Verdes "Puro Sinaloa" de la Alianza** y las **Águilas del Pacífico**). Sin embargo, históricamente no ha existido una plataforma digital moderna, clara y accesible donde los ciudadanos locales y los turistas puedan ver el trayecto exacto calle por calle, identificar el sentido de la circulación en calles de doble sentido y conocer las paradas oficiales, tarifas y frecuencias.

**Don Rutero** resuelve este problema ofreciendo una experiencia visual **estilo Figma / Glassmorphism** hiper-rápida, intuitiva y optimizada para cualquier dispositivo.

---

## ✨ Características Principales

### 🗺️ Para el Pasajero / Usuario
* **Mapa Interactivo Fullscreen:** Desarrollado sobre *Leaflet.js* con capa base *CartoDB Positron*, haciendo que las polilíneas de colores de cada ruta resalten de manera clara y estética.
* **Flechas Vectoriales Directrices de Alta Densidad:** Cada ruta incluye flechas indicadoras (`^` / `v`) integradas a lo largo de toda la polilínea (cada ~70 metros) para que el pasajero sepa al instante en qué dirección avanza el camión sin confusiones ni traslapes.
* **Buscador Instantáneo y Filtros Rápidos:** Filtra en una sola línea por rutas *Turísticas* (Zona Dorada, Malecón, Cerritos), *Centro* (Mercado Pino Suárez, Olas Altas) o por *Frecuencia Alta* (<12 min).
* **Paradas Oficiales y Línea de Tiempo (Timeline):** Visualiza las paradas físicas en el mapa y en un panel de recorrido paso a paso con su orden secuencial.
* **Geolocalización GPS en Tiempo Real:** Centra el mapa en la posición actual del usuario con un solo clic.
* **Sistema de Notificaciones y Avisos:** Panel de alertas sobre obras, desvíos temporales y nuevas rutas agregadas.
* **Aporte Ciudadano (+ Sugerir Ruta):** Formulario integrado para que los usuarios reporten cambios, obras en la vía o sugieran rutas faltantes.

### 🛠️ Para el Administrador (Studio GPS de Trazado)
* **Trazado Quirúrgico en el Mapa:** Dibuja recorridos haciendo clics directamente en las calles, garantizando que el camión pase exactamente por donde debe circular.
* **Modificación de Geometrías Existentes:** Carga rutas de la base de datos de forma asíncrona para editar tramos específicos sin empezar desde cero.
* **Herramientas de Importación y Exportación (JSON & SQL):** Compatible con coordenadas generadas por IA o herramientas externas para dibujar rutas instantáneamente.
* **Escudo de Seguridad Anti-Pérdida (`beforeunload` & `popstate`):** Intercepta clics accidentales en el botón atrás del navegador o ratón, recargas de página o cierres de pestaña para evitar que el administrador pierda su trabajo de trazado.
* **Gestión de Paradas Físicas:** Creación, edición y desvinculación de paradas en tiempo real.

---

## 🛠️ Arquitectura y Tecnologías

El proyecto sigue una arquitectura limpia basada en micro-capas **REST API (Backend)** + **Single Page Application (Frontend Vanilla)**:

| Componente | Tecnología / Librería | Uso en el Proyecto |
| :--- | :--- | :--- |
| **Backend Core** | Java 17 + Spring Boot 3.3 | API RESTful, gestión de transacciones e inyección de dependencias. |
| **Persistencia** | Spring Data JPA (Hibernate) + MySQL | Mapeo relacional de 5 entidades principales y consultas optimizadas. |
| **Seguridad** | Spring Security 6 + JWT + BCrypt | Autenticación sin estado (Stateless), encriptación de claves y control de roles (`ROLE_ADMIN` / `ROLE_USER`). |
| **Frontend UI** | HTML5 + CSS3 (Variables / Tokens) | Diseño *Glassmorphism*, paleta HSL curada, animaciones suaves y diseño 100% responsivo para pantallas divididas. |
| **Frontend Lógica** | JavaScript ES6+ (Vanilla Fetch API) | Conectividad asíncrona, gestión de modales y enrutamiento dinámico de API (`localhost` y red local). |
| **Mapas & Geometría** | Leaflet.js + CartoDB Tiles | Renderizado vectorial de polilíneas, marcadores personalizados SVG y cálculo trigonométrico de flechas de orientación. |

---

## 🚀 Guía de Instalación y Ejecución Local

### 1. Requisitos Previos
* **Java Development Kit (JDK) 17** o superior instalado.
* **MySQL Server 8.0** o superior corriendo en el puerto por defecto (`3306`).
* Un navegador web moderno (Chrome, Edge, Firefox, Safari).

### 2. Configuración de la Base de Datos
1. Abre tu cliente MySQL favorito (MySQL Workbench, DBeaver, phpMyAdmin o terminal).
2. Ejecuta el script de inicialización incluido en la carpeta `database`:
   ```sql
   source database/schema.sql;
   ```
   *Esto creará la base de datos `ruta_bus_db`, las tablas estructurales e insertará las rutas de prueba de Mazatlán con sus usuarios por defecto.*

### 3. Ejecución del Backend (Spring Boot)
Abre una terminal en la carpeta del backend y ejecuta el Wrapper de Maven:
```powershell
cd backend
.\mvnw.cmd spring-boot:run
```
El servidor backend arrancará en **`http://localhost:8080`**.

### 4. Uso de la Aplicación
Al iniciar el backend, Spring Boot servirá automáticamente la aplicación web desde la carpeta de recursos estáticos:
* 👉 **Abre tu navegador en:** [http://localhost:8080](http://localhost:8080)

> **Nota para desarrollo:** El frontend cuenta con detección dinámica de host en `api.js`. Si abres el archivo `frontend/index.html` directamente en tu navegador (`file://`) o usando la extensión *Live Server* de VS Code en los puertos `5500` o `3000`, la aplicación se conectará automáticamente a tu backend en `localhost:8080`. Cuando la publiques o la abras desde un celular conectado a tu red Wi-Fi (ej. `http://192.168.1.15:8080`), detectará la IP de forma automática sin romper los enlaces.

---

## 🔑 Credenciales de Acceso (Demo)

El script `schema.sql` incluye dos cuentas preconfiguradas para probar la aplicación inmediatamente:

| Rol | Usuario | Contraseña | Permisos |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin` | `admin123` | Acceso completo al Panel de Administración y Studio GPS de Trazado. |
| **Usuario Normal** | `usuario` | `user123` | Consulta de rutas, guardado en favoritos y reporte de sugerencias. |

> **Tip Pro:** Al registrar una cuenta nueva en la app, si utilizas un correo electrónico terminando en `@rutabus.com`, `@admin.com` o `@mazatlan.gob.mx`, el sistema te asignará automáticamente privilegios de Administrador.

---

## 📁 Estructura del Proyecto

```text
Ruta_Bus/
├── backend/                       # Servidor Spring Boot (API RESTful)
│   ├── src/main/java/com/rutabus/
│   │   ├── config/                # Configuración de Seguridad (CORS, JWT Filter) y Datos
│   │   ├── controller/            # Endpoints REST (Auth, Rutas, Admin Studio)
│   │   ├── entity/                # Entidades JPA (Route, Stop, RouteStop, RouteCoordinate, User)
│   │   ├── repository/            # Interfaces de acceso a base de datos (Spring Data JPA)
│   │   └── security/              # Proveedor y Filtros de tokens JWT
│   └── src/main/resources/
│       ├── application.properties # Configuración de MySQL y JWT Secret
│       └── static/                # Archivos estáticos web servidos por Spring Boot
├── frontend/                      # Cliente SPA (Vanilla HTML/CSS/JS)
│   ├── index.html                 # Vista principal del usuario y mapa de rutas
│   ├── admin.html                 # Panel de control y Studio GPS para trazar rutas
│   ├── css/styles.css             # Design tokens, variables HSL y estilos responsivos
│   ├── js/                        # Controladores de interfaz (app.js, admin.js, map.js, api.js, auth.js)
│   └── assets/                    # Logotipos oficiales e iconos vectoriales SVG
├── database/
│   └── schema.sql                 # Script DDL/DML para crear la base de datos de Mazatlán
└── README.md                      # Documentación oficial del proyecto
```

---

## 🏖️ Sobre Mazatlán y el Transporte Urbano
Este proyecto está dedicado a mejorar la movilidad en el municipio de Mazatlán, Sinaloa. Cubre arterias principales como la **Avenida Ejército Mexicano**, el **Malecón (Av. del Mar)**, la **Zona Dorada (Av. Camarón Sábalo)**, **Playa Cerritos**, el **Centro Histórico**, **Mercado Pino Suárez** y zonas periféricas como **El Conchi**, **Alarcón**, **Prados del Sol** y **Chula Vista**.

---

<div align="center">
  <p>Hecho con ❤️ para la comunidad de Mazatlán, Sinaloa.</p>
  <p><b>© 2026 Don Rutero</b></p>
</div>
