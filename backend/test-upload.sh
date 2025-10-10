#!/bin/bash

# Obtén tu token de Firebase manualmente desde el navegador:
# 1. Abre DevTools (F12)
# 2. Ve a Application > Local Storage
# 3. Busca el token en firebase:authUser

echo "Para probar el upload, necesitas tu Firebase ID token."
echo "Cópialo del navegador y ejecuta:"
echo ""
echo "TOKEN='tu_token_aqui'"
echo "curl -X POST http://localhost:8080/api/control/upload \\"
echo "  -H 'Authorization: Bearer \$TOKEN' \\"
echo "  -F 'file=@test-file.txt'"
echo ""
echo "Creando archivo de prueba..."
echo "Este es un archivo de prueba" > test-file.txt
echo "✅ Archivo test-file.txt creado"
