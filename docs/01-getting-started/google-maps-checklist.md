# ✅ Checklist Rápido: Activar Google Maps APIs

## 📋 APIs a Activar (4 en total)

Ve a Google Cloud Console: https://console.cloud.google.com/

### ☐ 1. Maps JavaScript API
**URL directa:** https://console.cloud.google.com/apis/library/maps-backend.googleapis.com
- Click en "ENABLE" / "HABILITAR"
- Espera a que se active (tarda ~10 segundos)

### ☐ 2. Places API
**URL directa:** https://console.cloud.google.com/apis/library/places-backend.googleapis.com
- Click en "ENABLE" / "HABILITAR"
- Espera a que se active (tarda ~10 segundos)

### ☐ 3. Geocoding API
**URL directa:** https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com
- Click en "ENABLE" / "HABILITAR"
- Espera a que se active (tarda ~10 segundos)

### ☐ 4. Maps Embed API
**URL directa:** https://console.cloud.google.com/apis/library/maps-embed-backend.googleapis.com
- Click en "ENABLE" / "HABILITAR"
- Espera a que se active (tarda ~10 segundos)

---

## 🔑 Verificar/Crear API Key

**URL:** https://console.cloud.google.com/apis/credentials

### Si ya tienes una API key:
1. Click en tu API key existente
2. Ir a "API restrictions"
3. Seleccionar "Restrict key"
4. Marcar las 4 APIs de arriba
5. Click "Save"

### Si necesitas crear una nueva:
1. Click "Create Credentials" → "API Key"
2. Copiar la key generada
3. Pegar en `.env.local` en `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
4. Click en la key recién creada
5. En "Application restrictions":
   - Seleccionar "HTTP referrers (web sites)"
   - Agregar: `http://localhost:9002/*`
   - Agregar: `http://localhost:3000/*`
6. En "API restrictions":
   - Seleccionar "Restrict key"
   - Marcar las 4 APIs de arriba
7. Click "Save"

---

## 🧪 Verificar que Funciona

Después de activar todo:

```bash
# 1. Reiniciar servidor Next.js
npm run dev

# 2. Probar en navegador
# - Ir a http://localhost:9002/registro
# - Avanzar al paso 2 (Dirección de entrega)
# - Escribir una dirección
# - Deberían aparecer sugerencias de Google Places
```

---

## ⚠️ Troubleshooting

### Error: "ApiNotActivatedMapError"
→ Una de las 4 APIs no está activada. Revisa que TODAS estén habilitadas.

### Error: "This API project is not authorized"
→ La API key no tiene permisos. Revisa las "API restrictions".

### No aparecen sugerencias
→ Abre la consola del navegador (F12) y verifica errores de Google Maps.

### La variable no se lee
→ Reinicia el servidor Next.js: `Ctrl+C` y `npm run dev`

---

**Documentación completa:** `docs/google-maps-setup.md`
