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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/routes")
public class RouteController {

    @Autowired
    private RouteRepository routeRepository;

    @Autowired
    private StopRepository stopRepository;

    @Autowired
    private RouteStopRepository routeStopRepository;

    @Autowired
    private RouteCoordinateRepository routeCoordinateRepository;

    // Obtener todas las rutas activas
    @GetMapping
    public List<Route> getAllRoutes() {
        return routeRepository.findByActiveTrue();
    }

    // Obtener detalles de una ruta específica
    @GetMapping("/{id}")
    public ResponseEntity<Route> getRouteById(@PathVariable Long id) {
        return routeRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Obtener las paradas asociadas a una ruta específica, en orden
    @GetMapping("/{id}/stops")
    public List<RouteStop> getRouteStops(@PathVariable Long id) {
        return routeStopRepository.findByRouteIdOrderByStopOrderAsc(id);
    }

    // Obtener el trazado de coordenadas de una ruta específica, en orden
    @GetMapping("/{id}/coordinates")
    public List<RouteCoordinate> getRouteCoordinates(@PathVariable Long id) {
        return routeCoordinateRepository.findByRouteIdOrderBySequenceOrderAsc(id);
    }

    // Obtener todas las paradas físicas registradas (útil para mostrarlas en el mapa o buscador)
    @GetMapping("/stops")
    public List<Stop> getAllStops() {
        return stopRepository.findAll();
    }
}
