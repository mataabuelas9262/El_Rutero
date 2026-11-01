import os

file_path = r'C:\Users\kevin\Downloads\Ruta_Bus\backend\src\main\java\com\rutabus\config\DataInitializer.java'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

new_lines = []
for line in content.split('\n'):
    stripped = line.rstrip()
    if "new Stop(" in stripped:
        if not stripped.endswith(")") and not stripped.endswith("),") and not stripped.endswith(");"):
            if stripped.endswith('",'):
                line = stripped[:-2] + '"),'
            elif stripped.endswith('""'):
                line = stripped + ')'
            elif stripped.endswith('"'):
                line = stripped + ')'
            elif stripped.endswith(','):
                line = stripped[:-1] + '),'
    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))
print("Syntax fixed.")
