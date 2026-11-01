import os

file_path = r'C:\Users\kevin\Downloads\Ruta_Bus\backend\src\main\java\com\rutabus\config\DataInitializer.java'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to replace everything from "for (Stop s : verifiedStops) {" to the end of the file.
start_str = "for (Stop s : verifiedStops) {"

new_logic = """        List<Stop> existingStops = stopRepository.findAll();
        for (Stop s : verifiedStops) {
            boolean exists = existingStops.stream().anyMatch(ex -> ex.getName() != null && ex.getName().equals(s.getName()));
            if (!exists) {
                stopRepository.save(s);
            }
        }
        
        // Limpiar duplicados que se hayan creado por error de IDs
        existingStops = stopRepository.findAll();
        java.util.Set<String> seenNames = new java.util.HashSet<>();
        for (Stop s : existingStops) {
            if (s.getName() != null && seenNames.contains(s.getName())) {
                stopRepository.delete(s);
            } else if (s.getName() != null) {
                seenNames.add(s.getName());
            }
        }
        
        // Eliminar explícitamente las paradas defectuosas
        List<Long> faultyIds = Arrays.asList(11L, 35L, 175L, 193L, 209L, 211L, 213L, 223L, 224L, 226L, 229L, 178L, 215L, 264L, 174L, 212L, 210L, 233L, 228L, 236L, 177L, 214L, 234L, 225L, 184L, 220L, 268L, 185L, 186L, 221L, 271L, 272L, 217L, 65L, 130L);
        for (Long faultyId : faultyIds) {
            if (stopRepository.existsById(faultyId)) {
                stopRepository.deleteById(faultyId);
            }
        }
        
        System.out.println("✅ [DataInitializer] Limpia completa y sincronización exitosa: Base de datos estabilizada (duplicados removidos).");
    }
}
"""

if start_str in content:
    idx = content.index(start_str)
    new_content = content[:idx] + new_logic
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Patched successfully!")
else:
    print("Could not find anchor string.")
