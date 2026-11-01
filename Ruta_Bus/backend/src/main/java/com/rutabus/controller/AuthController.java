package com.rutabus.controller;

import com.rutabus.entity.User;
import com.rutabus.repository.UserRepository;
import com.rutabus.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody AuthRequest registerRequest) {
        if (userRepository.existsByUsername(registerRequest.getUsername())) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "El nombre de usuario ya está registrado.");
            return ResponseEntity.badRequest().body(response);
        }
        if (registerRequest.getEmail() != null && !registerRequest.getEmail().trim().isEmpty() && userRepository.existsByEmail(registerRequest.getEmail().trim())) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "El correo electrónico ya está registrado en otra cuenta.");
            return ResponseEntity.badRequest().body(response);
        }

        User user = new User();
        user.setUsername(registerRequest.getUsername());
        String emailStr = "";
        if (registerRequest.getEmail() != null) {
            emailStr = registerRequest.getEmail().trim().toLowerCase();
            user.setEmail(emailStr);
        }
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));

        // Verificación de dominio del correo para asignar permisos de Administrador automáticamente
        if (emailStr.endsWith("@rutabus.com") || emailStr.endsWith("@admin.rutabus.com") || emailStr.endsWith("@admin.com") || emailStr.endsWith("@mazatlan.gob.mx")) {
            user.setRole("ROLE_ADMIN");
        } else {
            user.setRole("ROLE_USER"); // Usuario común para dominios como gmail, hotmail, yahoo, etc.
        }

        userRepository.save(user);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Usuario registrado exitosamente.");
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/send-verification")
    public ResponseEntity<?> sendVerificationCode(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Por favor ingresa un correo electrónico."));
        }
        if (userRepository.existsByEmail(email.trim())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Este correo electrónico ya está registrado por otro usuario."));
        }
        // Generar código de 6 dígitos simulado para demostración
        String code = String.valueOf((int)(Math.random() * 900000) + 100000);
        return ResponseEntity.ok(Map.of(
            "message", "Código de verificación enviado.",
            "code", code
        ));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Por favor ingresa tu correo electrónico."));
        }
        if (!userRepository.existsByEmail(email.trim())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "No existe ninguna cuenta registrada con este correo electrónico."));
        }
        return ResponseEntity.ok(Map.of(
            "message", "¡Se ha enviado el enlace de recuperación a tu correo electrónico!"
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody AuthRequest loginRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getUsername(),
                            loginRequest.getPassword()
                    )
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            User user = userRepository.findByUsername(loginRequest.getUsername()).orElseThrow();
            String jwt = tokenProvider.generateToken(user.getUsername(), user.getRole());

            Map<String, Object> response = new HashMap<>();
            response.put("token", jwt);
            response.put("username", user.getUsername());
            response.put("role", user.getRole());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Usuario o contraseña incorrectos.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
    }

    @GetMapping("/verify")
    public ResponseEntity<?> verifyToken(@RequestHeader(value = "Authorization", required = false) String tokenHeader) {
        if (tokenHeader == null || !tokenHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Token faltante o inválido"));
        }
        
        String token = tokenHeader.substring(7);
        try {
            String username = tokenProvider.getUsernameFromToken(token);
            User user = userRepository.findByUsername(username).orElseThrow();
            
            Map<String, Object> response = new HashMap<>();
            response.put("username", user.getUsername());
            response.put("role", user.getRole());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Token inválido o expirado"));
        }
    }

    // DTO para la petición de Auth
    public static class AuthRequest {
        private String username;
        private String email;
        private String password;

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }
}
