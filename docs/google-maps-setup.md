# Configuración de Google Maps Platform

## 🚨 Error Común: ApiNotActivatedMapError

### Síntoma
```
Google Maps JavaScript API error: ApiNotActivatedMapError
https://developers.google.com/maps/documentation/javascript/error-messages#api-not-activated-map-error
```

### Causa
Las APIs necesarias de Google Maps no están habilitadas en tu proyecto de Google Cloud Platform.

---

## ✅ Solución: Activar APIs Requeridas

### Paso 1: Acceder a Google Cloud Console
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto o crea uno nuevo
3. Asegúrate de estar en el proyecto correcto (verifica el nombre en la parte superior)

### Paso 2: Habilitar las APIs Necesarias

Debes habilitar **TODAS** estas APIs:

#### 1. **Maps JavaScript API** (Requerida - la más importante)
- URL directa: https://console.cloud.google.com/apis/library/maps-backend.googleapis.com
- **Para qué:** Cargar el script de Google Maps en el componente GooglePlacesAutocomplete
- **Usado en:** `src/components/GooglePlacesAutocomplete.tsx`

#### 2. **Places API** (Requerida)
- URL directa: https://console.cloud.google.com/apis/library/places-backend.googleapis.com
- **Para qué:** Autocompletado de direcciones
- **Usado en:**
  - `src/app/registro/page.tsx`
  - `src/components/AddEditAddressDialog.tsx`
  - `src/app/perfil/page.tsx`

#### 3. **Geocoding API** (Requerida)
- URL directa: https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com
- **Para qué:** Convertir direcciones de texto a coordenadas (lat, lng)
- **Usado en:** `src/app/mis-pedidos/[id]/page.tsx`

#### 4. **Maps Embed API** (Requerida)
- URL directa: https://console.cloud.google.com/apis/library/maps-embed-backend.googleapis.com
- **Para qué:** Mostrar mapas embebidos en iframes
- **Usado en:** `src/app/mis-pedidos/[id]/page.tsx`

---

## 🔑 Configuración de la API Key

### Crear una API Key

1. Ve a [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click en "Create Credentials" → "API Key"
3. Copia la API key generada

### Restringir la API Key (Recomendado)

#### Para Desarrollo Local:
1. Click en la API key recién creada
2. En "Application restrictions":
   - Selecciona "HTTP referrers (web sites)"
   - Agrega: `http://localhost:9002/*`
   - Agrega: `http://localhost:3000/*` (si usas otro puerto)

3. En "API restrictions":
   - Selecciona "Restrict key"
   - Marca TODAS las APIs mencionadas arriba:
     - Maps JavaScript API ✅
     - Places API ✅
     - Geocoding API ✅
     - Maps Embed API ✅

4. Click "Save"

#### Para Producción:
1. Crea una API key SEPARADA para producción
2. En "Application restrictions":
   - Selecciona "HTTP referrers (web sites)"
   - Agrega tu dominio: `https://tudominio.com/*`
   - Agrega tu dominio de Firebase: `https://tu-proyecto.web.app/*`

3. Mismo paso de "API restrictions"

---

## 🔐 Configurar Variables de Entorno

### Archivo `.env.local`

Crea o actualiza tu archivo `.env.local` en la raíz del proyecto:

```bash
# Google Maps Platform
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu-api-key-aqui
```

**⚠️ IMPORTANTE:**
- La variable DEBE empezar con `NEXT_PUBLIC_` para ser accesible en el frontend
- NO compartas esta API key en repositorios públicos
- Agrega `.env.local` a tu `.gitignore`

---

## 🧪 Verificar la Configuración

### Test 1: Verificar APIs Habilitadas

Ejecuta este script en tu navegador (consola):

```javascript
// Verificar Maps JavaScript API
fetch(`https://maps.googleapis.com/maps/api/js?key=TU_API_KEY&libraries=places`)
  .then(r => console.log('Maps JS API:', r.ok ? '✅' : '❌'))
  .catch(e => console.error('Maps JS API:', '❌', e));

// Verificar Geocoding API
fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=Santiago,Chile&key=TU_API_KEY`)
  .then(r => r.json())
  .then(d => console.log('Geocoding API:', d.status === 'OK' ? '✅' : '❌', d))
  .catch(e => console.error('Geocoding API:', '❌', e));

// Verificar Places API
fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=santiago&key=TU_API_KEY`)
  .then(r => r.json())
  .then(d => console.log('Places API:', d.status === 'OK' ? '✅' : '❌', d))
  .catch(e => console.error('Places API:', '❌', e));
```

### Test 2: Probar en la Aplicación

1. Inicia el servidor: `npm run dev`
2. Ve a `http://localhost:9002/registro`
3. Avanza al paso 2 (Dirección de entrega)
4. Intenta escribir una dirección
5. Deberías ver sugerencias de Google Places aparecer

---

## 🐛 Troubleshooting

### Error: "This API project is not authorized to use this API"

**Solución:**
- Verifica que la API key esté correctamente configurada
- Revisa que las restricciones de la API key incluyan tu dominio/localhost

### Error: "REQUEST_DENIED"

**Solución:**
- La API key no tiene permisos para la API específica
- Ve a "API restrictions" y habilita la API correspondiente

### Error: "OVER_QUERY_LIMIT"

**Solución:**
- Has excedido el límite de consultas gratuitas
- Ve a [Google Cloud Console → Billing](https://console.cloud.google.com/billing)
- Habilita facturación (incluye $200 USD de crédito gratis por mes)

### El autocompletado no aparece

**Diagnóstico:**
1. Abre la consola del navegador (F12)
2. Verifica que no haya errores de Google Maps
3. Verifica que `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` esté definida:
   ```javascript
   console.log(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
   ```
4. Si es `undefined`, reinicia el servidor: `npm run dev`

### El mapa no se muestra en `/mis-pedidos/[id]`

**Diagnóstico:**
1. Verifica que Geocoding API esté habilitada
2. Verifica que Maps Embed API esté habilitada
3. Abre la consola y busca errores relacionados con Google Maps

---

## 💰 Costos y Límites

### Plan Gratuito de Google Maps Platform

**Crédito mensual:** $200 USD gratis cada mes

**Límites gratuitos (aproximados):**
- **Places Autocomplete:** ~17,000 sesiones/mes
- **Geocoding API:** ~40,000 requests/mes
- **Maps JavaScript API:** ~28,000 cargas/mes
- **Maps Embed API:** Ilimitado (gratis)

### ¿Cuándo necesitas pagar?

Para una app con **1,000 usuarios activos/mes**:
- Registros/mes: ~100 (uso de Places Autocomplete)
- Pedidos/mes: ~500 (uso de Maps Embed + Geocoding)
- **Costo estimado:** $0 (dentro del plan gratuito)

Para una app con **10,000 usuarios activos/mes**:
- **Costo estimado:** ~$50-100 USD/mes

---

## 📚 Referencias Oficiales

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [Places API (New) Documentation](https://developers.google.com/maps/documentation/places/web-service/overview)
- [Geocoding API Documentation](https://developers.google.com/maps/documentation/geocoding/overview)
- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript/overview)
- [Pricing Calculator](https://mapsplatform.google.com/pricing/)

---

## ✅ Checklist de Configuración

Marca cada item cuando lo completes:

- [ ] Proyecto de Google Cloud Platform creado
- [ ] Maps JavaScript API habilitada
- [ ] Places API habilitada
- [ ] Geocoding API habilitada
- [ ] Maps Embed API habilitada
- [ ] API Key creada
- [ ] API Key con restricciones configuradas (HTTP referrers)
- [ ] API Key con restricciones de APIs configuradas
- [ ] Variable `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` en `.env.local`
- [ ] `.env.local` agregado a `.gitignore`
- [ ] Servidor reiniciado después de agregar `.env.local`
- [ ] Autocomplete probado en `/registro`
- [ ] Mapa probado en `/mis-pedidos/[id]`
- [ ] Sin errores en la consola del navegador

---

**¿Problemas?** Revisa la consola del navegador (F12 → Console) para ver errores específicos de Google Maps.
