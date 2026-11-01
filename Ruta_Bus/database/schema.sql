-- Creación de la Base de Datos si no existe
CREATE DATABASE IF NOT EXISTS ruta_bus_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ruta_bus_db;

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) UNIQUE DEFAULT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL
) ENGINE=InnoDB;

-- Tabla de Rutas
CREATE TABLE IF NOT EXISTS routes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) NOT NULL, -- Código Hexadecimal (ej. #007BFF)
    active BOOLEAN DEFAULT TRUE,
    price DOUBLE DEFAULT NULL, -- Tarifa en pesos MXN
    frequency_minutes INT DEFAULT NULL -- Frecuencia en minutos
) ENGINE=InnoDB;

-- Tabla de Paradas (Stops)
CREATE TABLE IF NOT EXISTS stops (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    type VARCHAR(50) DEFAULT NULL,
    address VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB;

-- Tabla intermedia de Paradas por Ruta
CREATE TABLE IF NOT EXISTS route_stops (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    route_id BIGINT NOT NULL,
    stop_id BIGINT NOT NULL,
    stop_order INT NOT NULL,
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
    FOREIGN KEY (stop_id) REFERENCES stops(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tabla de Coordenadas de Ruta (para dibujar el trazo completo de la calle)
CREATE TABLE IF NOT EXISTS route_coordinates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    route_id BIGINT NOT NULL,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    sequence_order INT NOT NULL,
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- DATOS DE PRUEBA (Mazatlán, Sinaloa)
-- -----------------------------------------------------

-- Usuarios por defecto
-- Contraseña admin: "admin123" encriptada con BCrypt
-- Contraseña usuario: "user123" encriptada con BCrypt
INSERT INTO users (username, password, role) VALUES 
('admin', '$2b$10$nTrlOl75bUHdXJbRSkGDauaBKTCQIfGBUhJOgP0exeHwCemzniDxC', 'ROLE_ADMIN'),
('usuario', '$2b$10$Ts26Pevyt3QYndZTtMifQ.KvVFeB/S0KuNpY05mkBWMA5BtHDJwc2', 'ROLE_USER')
ON DUPLICATE KEY UPDATE username=username;

-- Rutas
INSERT INTO routes (id, name, description, color, active, price, frequency_minutes) VALUES
(1, 'Sábalo Centro', 'Ruta turística y costera que recorre desde Playa Cerritos, cruzando Zona Dorada, el Malecón, el Centro Histórico hasta llegar al Faro.', '#007BFF', TRUE, 13.00, 12),
(2, 'Alarcón - Conchi', 'Ruta interior que conecta colonias del norte como Villa Verde y Alarcón con la zona del Conchi y el Mercado del Centro.', '#28A745', TRUE, 13.00, 15)
ON DUPLICATE KEY UPDATE id=id;

-- Paradas (Stops) y Puntos de Interés Verificados de Mazatlán
INSERT INTO stops (id, name, latitude, longitude, type, address) VALUES
(1, 'Playa Cerritos', 23.272556, -106.466542, 'playa', 'Playa Cerritos, Sinaloa'),
(2, 'Hotel Riu Emerald Bay', 23.300905, -106.486216, 'hotel', 'Av. Sábalo Cerritos 3404, Cerritos'),
(3, 'Playas de Mazatlán (Zona Dorada)', 23.292033, -106.479141, 'playa', 'Quintas del Mar, 82112 Mazatlán'),
(4, 'Valentinos (Malecón)', 23.238356, -106.445794, 'turistico', '1304 Av. Camarón Sábalo, Zona Dorada'),
(5, 'Gran Acuario Mazatlán', 23.228906, -106.427609, 'turistico', 'Av. de los Deportes 111, Tellería'),
(6, 'Plazuela Machado', 23.198354, -106.423209, 'turistico', 'Constitución s/n, Centro'),
(7, 'Faro de Mazatlán (Cerro del Crestón)', 23.181188, -106.425404, 'turistico', 'Cap. Joel Montes Camarena s/n, Cerro El Crestón'),
(8, 'Plaza Acaya', 23.272670, -106.417250, 'centro_comercial', 'Av. Lib. Núm. 2 Pte. s/n, El Venadillo'),
(9, 'Instituto Tecnológico de Mazatlán Unidad II', 23.271445, -106.369852, 'escuela', 'Fracc. Pradera Dorada'),
(10, 'Soriana Insurgentes', 23.236737, -106.421084, 'comercio', 'Av. Insurgentes esq. Carretera Internacional Norte'),
(11, 'Ley Plaza', 23.221686, -106.420158, 'comercio', 'Av Río Piaxtla 307, Palos Prietos'),
(12, 'Mercado Pino Suárez', 23.202240, -106.421078, 'mercado', 'Melchor Ocampo, Centro'),
(13, 'Hospital General de Mazatlán', 23.292307, -106.452427, 'hospital', 'Av. Óscar Pérez Escobosa #6505, 82124 Mazatlán'),
(14, 'Hospital ALHMA Medical Center', 23.259256, -106.443220, 'hospital', 'Av. Carlos Canseco 3735, Francisco Villa, 82127 Mazatlán'),
(15, 'Hospital Médica de la Ciudad', 23.270691, -106.452616, 'hospital', 'Blvd. Marina Mazatlan 2207, La Marina, 82100 Mazatlán'),
(16, 'Sharp Hospital Mazatlán', 23.242936, -106.440613, 'hospital', 'Av. Rafael Buelna y Jesús Kumate, 82126 Mazatlán'),
(17, 'Hospital Clínica del Mar', 23.239654, -106.430410, 'hospital', 'Av. Revolución SN, Lopez Mateos, 82140 Mazatlán'),
(18, 'IMSS Mazatlán (HGZMF 003)', 23.233489, -106.423854, 'hospital', 'Av. Ejército Mexicano 1804, Sembradores de la Amistad'),
(19, 'ISSSTE Mazatlán', 23.252763, -106.418687, 'hospital', 'Internacional 107, Plaza San Ignacio'),
(20, 'Salud Digna Mazatlán', 23.223175, -106.419393, 'salud', 'Av. Ejército Mexicano 1018, San Ángel'),
(21, 'Cruz Roja Mazatlán', 23.207260, -106.412110, 'salud', 'Juan Luis Vives #200, Polanco I Secc'),
(22, 'UPSIN - Universidad Politécnica de Sinaloa', 23.265594, -106.374257, 'escuela', 'Carretera Municipal Libre Lote Higueras-Km 3, 82199 Mazatlán'),
(23, 'UAD Campus Mazatlán', 23.244572, -106.437698, 'escuela', 'Av. Universidad S/N, Alameda, 82123 Mazatlán'),
(24, 'University of the West', 23.234197, -106.437315, 'escuela', 'Av del Mar 1200, Tellería, 82100 Mazatlán'),
(25, 'CETMAR 08', 23.213201, -106.374282, 'escuela', 'Corsario I No. 204, Urías'),
(26, 'CBTIS No.51', 23.238651, -106.415867, 'escuela', 'Guillermo Haro Barraza, Villa Galaxia'),
(27, 'Conalep Mazatlán II Centro', 23.196938, -106.420023, 'escuela', 'Roosevelt 519, Centro'),
(28, 'Instituto Cultural de Occidente', 23.248773, -106.420019, 'escuela', 'Internacional México 15 Km 1202, Plaza San Ignacio'),
(29, 'Universidad Tecmilenio Campus Mazatlán', 23.275811, -106.448730, 'escuela', 'Av. de la Marina 6102, Marina Mazatlán'),
(30, 'Mirador de Cristal', 23.177453, -106.427743, 'turistico', 'Cap. Joel Montes Camarena, Cerro del Vigía'),
(31, 'El Mirador (Cerro del Vigía)', 23.187674, -106.424366, 'turistico', 'Observatorio, Playas del Sur'),
(32, 'Malecón de Mazatlán', 23.202463, -106.429963, 'turistico', 'P.º Olas Altas 75, Centro'),
(33, 'Observatorio Mazatlán 1873', 23.189064, -106.425520, 'turistico', 'P.º del Centenario 218, Cerro del Vigía'),
(34, 'El Clavadista (The Diver)', 23.201290, -106.430682, 'turistico', 'Malecón de Mazatlán'),
(35, 'Letras de Mazatlán', 23.238076, -106.445199, 'turistico', 'Av del Mar, Tellería'),
(36, 'Teatro Ángela Peralta', 23.198175, -106.422657, 'turistico', 'Carnaval S/N, Centro'),
(37, 'Monumento al Pescador', 23.211570, -106.421550, 'turistico', 'Av del Mar s/n, Centro'),
(38, 'Monumento a la Pulmonía', 23.218622, -106.422519, 'turistico', 'Malecón de Mazatlán 46, Centro'),
(39, 'El Venadito (Centro)', 23.198631, -106.427448, 'turistico', 'Calle Gral. Ángel Flores 206, Centro'),
(40, 'Playa Olas Altas', 23.196363, -106.426693, 'playa', 'Olas Altas, Centro'),
(41, 'Playa Las Brujas', 23.251619, -106.422828, 'playa', 'Playa Las Brujas, Playas'),
(42, 'Playa Norte', 23.267117, -106.431301, 'playa', 'Playa Nte., Mazatlán'),
(43, 'Parque Ciudades Hermanas', 23.204910, -106.428286, 'parque', 'Av. Zaragoza 318C, Centro'),
(44, 'Plaza República', 23.200432, -106.421801, 'plaza', 'Calle Gral. Ángel Flores s/n, Centro'),
(45, 'Mazatlán Central Park', 23.231947, -106.429982, 'parque', 'Av. Leonismo Internacional 158, Casa Blanca'),
(46, 'Parque Martiniano Carvajal', 23.210461, -106.421540, 'parque', 'P.º Claussen, Centro'),
(47, 'Gran Plaza Mazatlán', 23.239306, -106.438300, 'centro_comercial', 'Av. Reforma s/n, Alameda'),
(48, 'Galerías Mazatlán', 23.278889, -106.449444, 'centro_comercial', 'Av. de la Marina 6204, Marina Mazatlán'),
(49, 'Home Depot Mazatlán', 23.244836, -106.436655, 'comercio', 'Av. Rafael Buelna 600, Alameda'),
(50, 'Sams Club Alameda', 23.240408, -106.440033, 'comercio', 'Av. Reforma Fracc 2150, Alameda'),
(51, 'Sams Club Marina', 23.280890, -106.444771, 'comercio', 'Av. Paseo del Pacífico 6105, Marina'),
(52, 'Walmart Hacienda del Mar', 23.244404, -106.423690, 'comercio', 'Carretera Federal 15, Hacienda del Mar'),
(53, 'Walmart Marina', 23.280000, -106.445357, 'comercio', 'Blvd. Marina Mazatlan 6023, La Marina'),
(54, 'Soriana Rafael Buelna', 23.240052, -106.442764, 'comercio', 'Av. Rafael Buelna 128, Lomas de Mazatlán'),
(55, 'Ley Centro', 23.203392, -106.419044, 'comercio', 'Carvajal esq. Melchor Ocampo, Centro'),
(56, 'Bodega Aurrera Petróleos', 23.253210, -106.401367, 'comercio', 'Carretera Colosio M S/N, Petróleos'),
(57, 'Office Depot Mazatlán', 23.246766, -106.438054, 'comercio', 'Av. Rafael Buelna 701, El Toreo'),
(58, 'Catedral Basílica de la Inmaculada Concepción', 23.200737, -106.421844, 'iglesia', '21 de Marzo, Centro'),
(59, 'Parroquia de la Sagrada Familia', 23.246239, -106.450161, 'iglesia', 'Calle Río de la Plata & Del Cisne, Las Gaviotas'),
(60, 'Church of San Judas Tadeo', 23.260932, -106.460998, 'iglesia', 'Av del Mero 55, Sábalo Country'),
(61, 'Central de Autobuses de Mazatlán', 23.225784, -106.422079, 'transporte', 'Palos Prietos, 82010 Mazatlán'),
(62, 'Embarcadero Isla de la Piedra', 23.205267, -106.410597, 'transporte', 'Embarcadero Isla de la Piedra'),
(63, 'Marina Mazatlán (puerto)', 23.274713, -106.465491, 'transporte', 'Blvd. Marina Mazatlan 50'),
(64, 'Estadio Teodoro Mariscal', 23.235996, -106.432374, 'deportivo', "Justo Sierra S/N, Estadio"),
(65, 'Unidad Deportiva Benito Juárez', 23.236627, -106.415316, 'deportivo', 'Av Insurgentes, Olímpica'),
(66, 'Unidad Administrativa de Mazatlán', 23.227074, -106.424314, 'gobierno', 'Arroyo Jabalines, Tellería'),
(67, 'Mazatlán City Hall (Palacio Municipal)', 23.200220, -106.422303, 'gobierno', 'Calle Guillermo Nelson Nte. S/N, Centro'),
(68, 'Museo Arqueológico de Mazatlán', 23.196649, -106.425754, 'turistico', 'Sixto Osuna 76, Centro'),
(69, 'Museo de Arte de Mazatlán', 23.196399, -106.425663, 'turistico', 'Sixto Osuna 71, Centro'),
(70, 'Museo El Rincón de Pedro Infante', 23.200044, -106.416780, 'turistico', 'Constitución 1106, Centro'),
(71, 'Carpa Olivera Alberca de Mar', 23.198750, -106.428642, 'turistico', 'P.º Claussen, Centro'),
(72, 'Las Labradas (sitio arqueológico)', 23.620529, -106.766901, 'turistico', 'San Ignacio, 82967 (a 50km al norte de Mazatlán)'),
(73, 'Instituto Tecnológico de Mazatlán', 23.213970, -106.374629, 'escuela', 'Corsario I 203, Urías'),
(74, 'Mercado Juan Carrasco', 23.211100, -106.419924, 'mercado', 'Av. Gutiérrez Nájera S/N, Reforma'),
(75, 'Cinépolis Gran Plaza', 23.240148, -106.436727, 'entretenimiento', 'Av. Reforma S/N, Alameda'),
(76, 'Cinépolis Acaya', 23.271996, -106.418904, 'entretenimiento', 'Av. Óscar Pérez Escobosa 8201, El Venadillo'),
(77, 'Cinemex Marina', 23.279623, -106.450693, 'entretenimiento', 'Av. de la Marina 6204'),
(78, 'Hotel Pueblo Bonito Beach Resort', 23.263995, -106.465552, 'hotel', 'Av Camarón Sábalo 2121, Sábalo Country'),
(79, 'Terminal de Cruceros Mazatlán', 23.194836, -106.414468, 'transporte', 'Av. Emilio Barragán 517, Lázaro Cárdenas')
ON DUPLICATE KEY UPDATE name=VALUES(name), latitude=VALUES(latitude), longitude=VALUES(longitude), type=VALUES(type), address=VALUES(address);

-- Relación de Paradas por Ruta
INSERT IGNORE INTO route_stops (route_id, stop_id, stop_order) VALUES
-- Sábalo Centro (Ruta 1)
(1, 1, 1),
(1, 2, 2),
(1, 3, 3),
(1, 4, 4),
(1, 5, 5),
(1, 6, 6),
(1, 7, 7),

-- Alarcón - Conchi (Ruta 2)
(2, 8, 1),
(2, 9, 2),
(2, 10, 3),
(2, 11, 4),
(2, 12, 5);

-- Coordenadas de trazado para la línea en el mapa
-- Ruta 1: Sábalo Centro
INSERT IGNORE INTO route_coordinates (route_id, latitude, longitude, sequence_order) VALUES
(1, 23.2989, -106.4712, 1),
(1, 23.2842, -106.4688, 2),
(1, 23.2685, -106.4632, 3),
(1, 23.2492, -106.4578, 4),
(1, 23.2329, -106.4445, 5),
(1, 23.2245, -106.4350, 6),
(1, 23.2215, -106.4312, 7),
(1, 23.2120, -106.4250, 8),
(1, 23.1994, -106.4215, 9),
(1, 23.1895, -106.4225, 10),
(1, 23.1788, -106.4262, 11);

-- Ruta 2: Alarcón - Conchi
INSERT IGNORE INTO route_coordinates (route_id, latitude, longitude, sequence_order) VALUES
(2, 23.2672, -106.3762, 1),
(2, 23.2590, -106.3810, 2),
(2, 23.2505, -106.3888, 3),
(2, 23.2420, -106.3955, 4),
(2, 23.2355, -106.4022, 5),
(2, 23.2210, -106.4080, 6),
(2, 23.2045, -106.4172, 7);
