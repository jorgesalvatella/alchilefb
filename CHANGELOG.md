## [2025-01-11] - Google Sign-In Implementado

### ✨ Agregado
- **Google Sign-In** - Autenticación con cuentas de Gmail activada
- Botón de Google en `/ingresar` (Login)
- Botón de Google en `/registro` (Sign Up)
- Función `initiateGoogleSignIn()` en `non-blocking-login.tsx`
- Creación automática de perfil con datos de Google (email, nombre, foto)
- Flujo de completar perfil para usuarios de Google (captura de teléfono)
- Tests completos para Google Sign-In (8 test cases)
- Documentación completa en `docs/09-google-signin/SETUP-GUIDE.md`

### 🔄 Modificado
- `src/firebase/non-blocking-login.tsx` - Agregada función `initiateGoogleSignIn()`
- `src/app/ingresar/page.tsx` - Activado botón de Google con handler
- `src/app/registro/page.tsx` - Activado botón de Google con handler

### 📝 Archivos Nuevos
- `src/firebase/__tests__/non-blocking-login.test.tsx` - Tests para Google Sign-In
- `docs/09-google-signin/SETUP-GUIDE.md` - Guía de configuración en Firebase Console

### 🎁 Beneficios
- Usuarios pueden registrarse/iniciar sesión con un solo clic
- No necesitan recordar contraseñas
- Registro más rápido (menos campos que llenar)
- Foto de perfil automática desde Google
- El flujo de verificación de teléfono se mantiene intacto

### 🔧 Configuración Requerida
- [ ] Habilitar Google como proveedor en Firebase Console
- [ ] Agregar `alchilemeatballs.com` a dominios autorizados
- [ ] Ver guía completa en `docs/09-google-signin/SETUP-GUIDE.md`

### ✅ Tests
- 8/8 tests pasando para `initiateGoogleSignIn()`
- Cubiertos casos: nuevo usuario, usuario existente, errores de popup, errores de cuenta

---

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

