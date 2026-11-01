package com.rutabus.controller;

import com.rutabus.entity.Route;
import com.rutabus.entity.RouteCoordinate;
import com.rutabus.entity.RouteStop;
import com.rutabus.entity.Stop;
import com.rutabus.repository.RouteCoordinateRepository;
import com.rutabus.repository.RouteRepository;
import com.rutabus.repository.RouteStopRepository;
import com.rutabus.repository.StopRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private RouteRepository routeRepository;

    @Autowired
    private StopRepository stopRepository;

    @Autowired
    private RouteStopRepository routeStopRepository;

    @Autowired
    private RouteCoordinateRepository routeCoordinateRepository;

    // -----------------------------------------------------
    // CRUD DE RUTAS (ROUTES)
    // -----------------------------------------------------

    @PostMapping("/routes")
    public ResponseEntity<Route> createRoute(@RequestBody Route route) {
        Route savedRoute = routeRepository.save(route);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedRoute);
    }

    @PutMapping("/routes/{id}")
    public ResponseEntity<Route> updateRoute(@PathVariable Long id, @RequestBody Route routeDetails) {
        return routeRepository.findById(id).map(route -> {
            route.setName(routeDetails.getName());
            route.setDescription(routeDetails.getDescription());
            route.setColor(routeDetails.getColor());
            route.setActive(routeDetails.getActive());
            route.setPrice(routeDetails.getPrice());
            route.setFrequencyMinutes(routeDetails.getFrequencyMinutes());
            return ResponseEntity.ok(routeRepository.save(route));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/routes/{id}")
    public ResponseEntity<?> deleteRoute(@PathVariable Long id) {
        return routeRepository.findById(id).map(route -> {
            routeRepository.delete(route);
            return ResponseEntity.ok(Map.of("message", "Ruta eliminada correctamente"));
        }).orElse(ResponseEntity.notFound().build());
    }

    // -----------------------------------------------------
    // CRUD DE PARADAS (STOPS)
    // -----------------------------------------------------

    @PostMapping("/stops")
    public ResponseEntity<Stop> createStop(@RequestBody Stop stop) {
        Stop savedStop = stopRepository.save(stop);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedStop);
    }

    @PutMapping("/stops/{id}")
    public ResponseEntity<Stop> updateStop(@PathVariable Long id, @RequestBody Stop stopDetails) {
        return stopRepository.findById(id).map(stop -> {
            stop.setName(stopDetails.getName());
            stop.setLatitude(stopDetails.getLatitude());
            stop.setLongitude(stopDetails.getLongitude());
            return ResponseEntity.ok(stopRepository.save(stop));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/stops/{id}")
    public ResponseEntity<?> deleteStop(@PathVariable Long id) {
        return stopRepository.findById(id).map(stop -> {
            stopRepository.delete(stop);
            return ResponseEntity.ok(Map.of("message", "Parada eliminada correctamente"));
        }).orElse(ResponseEntity.notFound().build());
    }

    // -----------------------------------------------------
    // GESTIÓN DE GEOMETRÍA Y RECORRIDO DE RUTA (TRAZADO)
    // -----------------------------------------------------

    @Transactional
    @PostMapping("/routes/{id}/geometry")
    public ResponseEntity<?> updateRouteGeometry(@PathVariable Long id, @RequestBody GeometryRequest request) {
        return routeRepository.findById(id).map(route -> {
            // 1. Eliminar coordenadas e paradas anteriores asociadas a la ruta
            routeCoordinateRepository.deleteByRouteId(id);
            routeStopRepository.deleteByRouteId(id);

            // 2. Guardar nuevas coordenadas de trazado de la línea
            List<CoordinateDTO> coords = request.getCoordinates();
            if (coords != null) {
                List<RouteCoordinate> routeCoordsList = new ArrayList<>();
                for (int i = 0; i < coords.size(); i++) {
                    RouteCoordinate rc = new RouteCoordinate();
                    rc.setRoute(route);
                    rc.setLatitude(coords.get(i).getLatitude());
                    rc.setLongitude(coords.get(i).getLongitude());
                    rc.setSequenceOrder(i + 1);
                    routeCoordsList.add(rc);
                }
                routeCoordinateRepository.saveAll(routeCoordsList);
            }

            // 3. Asociar paradas seleccionadas en orden
            List<Long> stopIds = request.getStopIds();
            if (stopIds != null) {
                List<RouteStop> routeStopsList = new ArrayList<>();
                for (int i = 0; i < stopIds.size(); i++) {
                    Long stopId = stopIds.get(i);
                    Stop stop = stopRepository.findById(stopId)
                            .orElseThrow(() -> new IllegalArgumentException("Parada con ID " + stopId + " no existe."));
                    
                    RouteStop rs = new RouteStop();
                    rs.setRoute(route);
                    rs.setStop(stop);
                    rs.setStopOrder(i + 1);
                    routeStopsList.add(rs);
                }
                routeStopRepository.saveAll(routeStopsList);
            }

            return ResponseEntity.ok(Map.of("message", "Trazado y paradas de la ruta actualizados exitosamente"));
        }).orElse(ResponseEntity.notFound().build());
    }

    // DTOs para la petición de actualización geométrica
    public static class GeometryRequest {
        private List<CoordinateDTO> coordinates;
        private List<Long> stopIds;

        public List<CoordinateDTO> getCoordinates() {
            return coordinates;
        }

        public void setCoordinates(List<CoordinateDTO> coordinates) {
            this.coordinates = coordinates;
        }

        public List<Long> getStopIds() {
            return stopIds;
        }

        public void setStopIds(List<Long> stopIds) {
            this.stopIds = stopIds;
        }
    }

    public static class CoordinateDTO {
        private Double latitude;
        private Double longitude;

        public Double getLatitude() {
            return latitude;
        }

        public void setLatitude(Double latitude) {
            this.latitude = latitude;
        }

        public Double getLongitude() {
            return longitude;
        }

        public void setLongitude(Double longitude) {
            this.longitude = longitude;
        }
    }
}
