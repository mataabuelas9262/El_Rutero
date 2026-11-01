package com.rutabus.repository;

import com.rutabus.entity.RouteCoordinate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RouteCoordinateRepository extends JpaRepository<RouteCoordinate, Long> {
    List<RouteCoordinate> findByRouteIdOrderBySequenceOrderAsc(Long routeId);
    void deleteByRouteId(Long routeId);
}
