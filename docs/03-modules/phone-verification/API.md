# API - Verificación de Teléfono

Documentación completa de los endpoints del módulo de verificación de teléfono.

---

## Endpoints Implementados

### 1. Generar Código de Verificación

**Endpoint:** `POST /api/verification/generate-code`

**Descripción:** Genera un nuevo código de verificación de 6 dígitos para el usuario autenticado. Invalida automáticamente cualquier código anterior no verificado.

**Autenticación:** Bearer token requerido

**Headers:**
```http
Authorization: Bearer <firebase-id-token>
```

**Request Body:** Ninguno

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "code": "123456",
  "expiresAt": "2025-10-26T12:10:00.000Z"
}
```

**Respuestas de Error:**

```json
// 401 - No autenticado
{
  "error": "No autorizado"
}

// 404 - Usuario no encontrado
{
  "error": "Usuario no encontrado"
}

// 500 - Error del servidor
{
  "error": "Error al generar código"
}
```

**Ejemplo de uso (JavaScript):**
```javascript
const token = await user.getIdToken();
const response = await fetch('/api/verification/generate-code', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
console.log(data.code); // "123456"
console.log(data.expiresAt); // "2025-10-26T12:10:00.000Z"
```

**Ejemplo de uso (curl):**
```bash
curl -X POST http://localhost:8080/api/verification/generate-code \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### 2. Verificar Código

**Endpoint:** `POST /api/verification/verify-code`

**Descripción:** Verifica el código de 6 dígitos ingresado por el usuario. Si es correcto, actualiza `phoneVerified = true` en el documento del usuario.

**Autenticación:** Bearer token requerido

**Headers:**
```http
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "123456"
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Teléfono verificado exitosamente"
}
```

**Respuestas de Error:**

```json
// 400 - Código inválido (formato)
{
  "error": "Código inválido"
}

// 400 - Código incorrecto (intento 1 o 2)
{
  "success": false,
  "error": "invalid_code",
  "message": "Código incorrecto",
  "attemptsRemaining": 2
}

// 400 - Código incorrecto (intento 3)
{
  "success": false,
  "error": "max_attempts_exceeded",
  "message": "Máximo de intentos alcanzado. Genera un nuevo código"
}

// 400 - Código expirado
{
  "success": false,
  "error": "code_expired",
  "message": "El código ha expirado. Genera uno nuevo"
}

// 400 - No hay código activo
{
  "success": false,
  "error": "no_active_code",
  "message": "No hay código de verificación activo"
}

// 401 - No autenticado
{
  "error": "No autorizado"
}

// 500 - Error del servidor
{
  "error": "Error al verificar código"
}
```

**Ejemplo de uso (JavaScript):**
```javascript
const token = await user.getIdToken();
const response = await fetch('/api/verification/verify-code', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ code: '123456' })
});

const data = await response.json();

if (data.success) {
  console.log('Teléfono verificado');
} else {
  console.log(`Error: ${data.error}`);
  console.log(`Intentos restantes: ${data.attemptsRemaining}`);
}
```

**Ejemplo de uso (curl):**
```bash
curl -X POST http://localhost:8080/api/verification/verify-code \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'
```

---

### 3. Crear Pedido (Modificado)

**Endpoint:** `POST /api/pedidos`

**Descripción:** Crea un nuevo pedido. **Requiere que el usuario tenga su teléfono verificado** (`phoneVerified === true`).

**Autenticación:** Bearer token requerido

**Headers:**
```http
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "items": [...],
  "total": 150.50,
  "deliveryAddress": "..."
}
```

**Respuesta Exitosa (201):**
```json
{
  "success": true,
  "pedidoId": "abc123",
  "message": "Pedido creado exitosamente"
}
```

**Respuestas de Error:**

```json
// 403 - Teléfono no verificado (NUEVO)
{
  "error": "phone_not_verified",
  "message": "Debes verificar tu teléfono antes de realizar un pedido"
}

// 401 - No autenticado
{
  "error": "No autorizado"
}

// 404 - Usuario no encontrado
{
  "error": "Usuario no encontrado"
}

// 500 - Error del servidor
{
  "error": "Error al crear pedido"
}
```

**Ejemplo de uso (JavaScript):**
```javascript
const token = await user.getIdToken();
const response = await fetch('/api/pedidos', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    items: [...],
    total: 150.50
  })
});

if (response.status === 403) {
  const data = await response.json();
  if (data.error === 'phone_not_verified') {
    // Redirigir a verificación
    router.push('/verificar-telefono?returnTo=/pago');
  }
}
```

---

## Códigos de Error

### Códigos de Estado HTTP

| Código | Significado | Cuándo ocurre |
|--------|-------------|---------------|
| `200` | OK | Operación exitosa |
| `201` | Created | Recurso creado exitosamente |
| `400` | Bad Request | Datos inválidos o error de validación |
| `401` | Unauthorized | Token de autenticación inválido o ausente |
| `403` | Forbidden | Usuario no autorizado (ej: teléfono no verificado) |
| `404` | Not Found | Recurso no encontrado |
| `500` | Internal Server Error | Error del servidor |

### Códigos de Error de Verificación

| Código de Error | Descripción | Acción Recomendada |
|-----------------|-------------|--------------------|
| `invalid_code` | Código incorrecto ingresado | Mostrar intentos restantes, permitir reintentar |
| `max_attempts_exceeded` | Se alcanzó el límite de 3 intentos | Invalidar código, solicitar generar uno nuevo |
| `code_expired` | El código ha expirado (>10 min) | Solicitar generar un nuevo código |
| `no_active_code` | No existe código activo para el usuario | Solicitar generar un código |
| `phone_not_verified` | Usuario no ha verificado su teléfono | Redirigir a `/verificar-telefono` |

---

## Flujo de Integración

### 1. Flujo Happy Path (Verificación Exitosa)

```javascript
// 1. Usuario llega a la página de verificación
// GET /verificar-telefono

// 2. Se genera código automáticamente
const codeResponse = await fetch('/api/verification/generate-code', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` }
});
const { code, expiresAt } = await codeResponse.json();
// code: "123456"
// expiresAt: "2025-10-26T12:10:00.000Z"

// 3. Usuario ingresa el código (mostrado en pantalla)
const verifyResponse = await fetch('/api/verification/verify-code', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ code: '123456' })
});
// { success: true }

// 4. Usuario puede hacer pedidos
const pedidoResponse = await fetch('/api/pedidos', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ items: [...], total: 150 })
});
// { success: true, pedidoId: "abc123" }
```

### 2. Flujo con Error (Código Incorrecto)

```javascript
// Usuario ingresa código incorrecto (1er intento)
const response = await fetch('/api/verification/verify-code', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ code: '999999' })
});

const data = await response.json();
// {
//   success: false,
//   error: "invalid_code",
//   attemptsRemaining: 2
// }

// Mostrar error y permitir reintentar
// Después de 3 intentos fallidos: error "max_attempts_exceeded"
```

### 3. Flujo con Pedido Bloqueado

```javascript
// Usuario no verificado intenta hacer pedido
const response = await fetch('/api/pedidos', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ items: [...] })
});

if (response.status === 403) {
  const data = await response.json();
  if (data.error === 'phone_not_verified') {
    // Redirigir a verificación
    window.location.href = '/verificar-telefono?returnTo=/pago';
  }
}
```

---

## Rate Limiting

El servicio implementa rate limiting para prevenir abuso:

- **Máximo 5 códigos generados por usuario en 1 hora**
- Si se excede, retorna error `429 Too Many Requests`

**Implementación en `code-service.js`:**
```javascript
const recentCodes = await db.collection('verificationCodes')
  .where('userId', '==', userId)
  .where('createdAt', '>', oneHourAgo)
  .get();

if (recentCodes.size >= 5) {
  throw new Error('rate_limit_exceeded');
}
```

---

## Testing de Endpoints

### Tests Implementados (Supertest)

**Archivo:** `backend/verification/phone-verification-routes.test.js`

**13 tests de integración:**

1. ✅ POST /generate-code - genera código exitosamente
2. ✅ POST /generate-code - requiere autenticación
3. ✅ POST /generate-code - maneja usuario no encontrado
4. ✅ POST /verify-code - verifica código correcto
5. ✅ POST /verify-code - rechaza código incorrecto
6. ✅ POST /verify-code - invalida código después de 3 intentos
7. ✅ POST /verify-code - rechaza código expirado
8. ✅ POST /verify-code - requiere autenticación
9. ✅ POST /verify-code - valida formato de código
10. ✅ POST /pedidos - bloquea usuarios sin verificar (403)
11. ✅ POST /pedidos - permite usuarios verificados
12. ✅ POST /generate-code - invalida códigos anteriores
13. ✅ POST /verify-code - actualiza phoneVerified en users

**Comando de ejecución:**
```bash
cd backend
npm test -- phone-verification-routes.test.js
```

---

## Seguridad

### Validaciones Implementadas

1. **Autenticación:**
   - Todos los endpoints requieren token Firebase válido
   - Middleware `authMiddleware` verifica token en cada request

2. **Autorización:**
   - Solo el usuario dueño del código puede verificarlo
   - Backend valida `userId` del token vs `userId` del código

3. **Validación de Datos:**
   - Código debe ser exactamente 6 dígitos numéricos
   - Se verifica formato antes de consultar BD

4. **Prevención de Abuso:**
   - Máximo 3 intentos de verificación por código
   - Códigos expiran en 10 minutos
   - Rate limiting: 5 códigos por hora

5. **Limpieza de Datos:**
   - Códigos anteriores se invalidan al generar nuevo
   - Códigos usados se marcan como `verified: true`

---

**Última actualización:** 2025-10-26
**Versión:** 1.0
**Mantenido por:** Nexus (Backend)
