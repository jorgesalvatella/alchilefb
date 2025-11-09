## [2025-01-09] - Fixes de Google Maps y PWA Updates

### 🐛 Corregido
- **Google Maps no cargaba en `/pago`** - Content Security Policy bloqueaba scripts de Google Maps
- **PWA Update Banner no aparecía** - Faltaba detectar Service Workers ya esperando
- **Variables de entorno faltantes en runtime** - Dockerfile no pasaba ENV vars al runner stage

### 🔄 Modificado
- `next.config.ts` - Agregado `https://maps.googleapis.com` a CSP `script-src`
- `Dockerfile.frontend` - Agregadas variables `NEXT_PUBLIC_*` al runner stage
- `src/components/pwa/UpdatePrompt.tsx` - Detecta `reg.waiting` al cargar
- `public/sw.js` - Incrementada versión de cache a v3
- `src/components/GooglePlacesAutocompleteWithMap.tsx` - Agregado diagnóstico temporal

### ✨ Agregado
- Detección inmediata de Service Worker esperando en UpdatePrompt
- Mensaje de diagnóstico temporal en loading state de Google Maps

### 📝 Pendiente
- **reCAPTCHA v3**: Configurar en producción
  - Crear reCAPTCHA site key en Google Cloud Console
  - Agregar `NEXT_PUBLIC_ENABLE_APP_CHECK` a Secret Manager
  - Agregar `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` a Secret Manager
  - Modificar workflow para pasar variables al build
  - Actualizar CSP para permitir dominios de reCAPTCHA

### 🎁 Beneficios
- Google Maps ahora carga correctamente en checkout
- Updates de PWA se detectan y muestran banner automáticamente
- Usuarios pueden actualizar sin reinstalar la app

---

## [2025-10-25] - Actualización en Tiempo Real de Pedidos

### ✨ Agregado
- **Actualización en tiempo real** para páginas de pedidos del cliente usando Firestore `onSnapshot()`
- Subscripción automática a cambios en `/mis-pedidos` (lista de pedidos)
- Subscripción automática a cambios en `/mis-pedidos/[id]` (detalle de pedido)
- Los clientes ahora ven cambios de estado instantáneamente sin recargar la página

### 🔄 Modificado
- `/src/app/mis-pedidos/page.tsx` - Reemplazado fetch único con onSnapshot
- `/src/app/mis-pedidos/[id]/page.tsx` - Reemplazado fetch único con onSnapshot
- `/src/app/mis-pedidos/page.test.tsx` - Actualizados mocks para Firestore
- `/src/app/mis-pedidos/[id]/page.test.tsx` - Actualizados mocks para Firestore

### 🎁 Beneficios
- Cliente ve cuando admin cambia estado del pedido (Pendiente → Preparando → En Reparto → Entregado)
- Cliente ve cuando se asigna repartidor instantáneamente
- Reduce llamadas de soporte preguntando "¿dónde está mi pedido?"
- Experiencia de usuario moderna y fluida
- Menos carga en el servidor (no hay polling)

### 📝 Documentación
- Agregado `/docs/REALTIME-UPDATES.md` - Documentación completa de implementación

### 🔒 Seguridad
- Reglas de Firestore garantizan que usuarios solo ven sus propios pedidos
- Validación adicional en código: `orderData.userId !== user.uid`
- Cleanup automático de subscripciones al desmontar componentes

### ⚠️ Breaking Changes
- Ninguno - Los endpoints REST `/api/me/orders` aún funcionan para compatibilidad

### 📊 Tests
- Tests actualizados para usar mocks de Firestore onSnapshot
- Estado: 280/280 tests pasando (100%) ✅

