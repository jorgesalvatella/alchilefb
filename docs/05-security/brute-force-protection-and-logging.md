# Implementación de Protección contra Fuerza Bruta y Auditoría de Logs

**Fecha de Implementación:** 2025-10-21
**Agente Implementador:** Gemini
**Revisado por:** Raptoure (Experto en Seguridad)

---

## 1. Resumen Ejecutivo

Se ha implementado una estrategia de protección contra ataques de fuerza bruta para intentos de inicio de sesión y verificación de tokens, tanto en el frontend como en el backend. Adicionalmente, se ha establecido un sistema de auditoría de logs detallado para registrar eventos de seguridad críticos en Firestore.

---

## 2. Protección contra Fuerza Bruta (Login y Verificación de Token)

### 2.1. Backend (Express.js - `backend/authMiddleware.js`)

*   **Mecanismo:** Se utiliza Firestore (`failedLoginAttempts` collection) para almacenar y gestionar los intentos fallidos de verificación de `idToken` por dirección IP.
*   **Límite:** 5 intentos fallidos de verificación de `idToken`.
*   **Bloqueo:** Si una dirección IP excede el límite, se bloquea por 15 minutos. Durante este período, cualquier solicitud desde esa IP a un endpoint autenticado recibirá una respuesta HTTP 429 (Too Many Requests).
*   **Recuperación de IP:** Se ha mejorado la robustez en la obtención de la dirección IP del cliente, priorizando el encabezado `x-forwarded-for` para entornos detrás de proxies.
*   **Restablecimiento:** Los contadores de intentos fallidos se restablecen a cero tras una verificación exitosa del `idToken`.

### 2.2. Frontend (Next.js - `src/app/ingresar/page.tsx`)

*   **Mecanismo:** Se utiliza una cookie segura (`failedLoginAttempts`) para almacenar y gestionar los intentos fallidos de inicio de sesión en el navegador del cliente.
*   **Límite:** 5 intentos fallidos de inicio de sesión.
*   **Bloqueo:** Si el usuario excede el límite, el formulario de inicio de sesión se deshabilita por 15 minutos.
*   **Notificación:** Se muestra un mensaje `toast` y un mensaje en la interfaz de usuario informando al usuario sobre el bloqueo y el tiempo restante.
*   **Restablecimiento:** Los contadores de intentos fallidos se restablecen a cero tras un inicio de sesión exitoso.
*   **Utilidad de Cookies:** Se creó `src/lib/cookie-utils.ts` para una gestión segura y centralizada de las cookies relacionadas con esta funcionalidad, utilizando la librería `js-cookie`.

---

## 3. Auditoría de Logs de Seguridad

### 3.1. Backend (Express.js - `backend/utils/securityLogger.js` y `backend/authMiddleware.js`)

*   **Mecanismo:** Se ha implementado una utilidad de logging (`backend/utils/securityLogger.js`) que registra eventos de seguridad directamente en una colección de Firestore (`securityLogs`).
*   **Eventos Registrados:**
    *   `AUTH_SUCCESS`: Autenticación exitosa de un usuario (nivel `info`).
    *   `AUTH_FAILED`: Intento fallido de verificación de `idToken` (nivel `error`).
    *   `IP_BLOCKED_ACCESS_ATTEMPT`: Intento de acceso desde una IP ya bloqueada (nivel `warn`).
    *   `IP_BLOCKED`: Bloqueo de una dirección IP debido a demasiados intentos fallidos (nivel `warn`).
*   **Detalle de Logs:** Cada entrada de log incluye:
    *   `timestamp`: Marca de tiempo del evento.
    *   `level`: Nivel de severidad (`info`, `warn`, `error`).
    *   `event`: Tipo de evento de seguridad.
    *   `ipAddress`: Dirección IP del cliente.
    *   `userAgent`: User-Agent del cliente.
    *   `requestPath`: Ruta de la solicitud.
    *   `userId`: ID del usuario (si está disponible).
    *   `details`: Información adicional relevante al evento (ej. código de error, número de intentos).
*   **Almacenamiento:** Los logs se almacenan de forma persistente en Firestore, facilitando su consulta y monitoreo.

---

## 4. Próximos Pasos / Monitoreo

*   **Monitoreo Activo:** Se recomienda configurar alertas y dashboards en Firebase Console o herramientas de monitoreo externas para supervisar la colección `securityLogs` y detectar patrones de actividad sospechosa.
*   **Expansión de Logs:** Considerar la integración de `securityLogger` en otros puntos críticos del backend (ej. cambios de rol, eliminaciones de usuarios, operaciones sensibles) para una auditoría de seguridad más completa.

---
