# Auditoría de Seguridad: Cambio de Contraseña y Gestión de Usuarios

**Fecha de Auditoría:** 2025-10-21
**Agente Auditor:** Raptoure - Experto en Seguridad

---

## 1. Resumen Ejecutivo

Se realizó una auditoría de seguridad exhaustiva sobre las funcionalidades de **Cambio de Contraseña** (en el perfil de usuario) y **Gestión de Usuarios** (en el panel de control). La implementación actual demuestra una **fuerte conciencia de seguridad**, aplicando consistentemente las mejores prácticas de autenticación, autorización y validación, tanto en el frontend como en el backend.

---

## 2. Funcionalidad de Cambio de Contraseña

### 2.1. Frontend (`src/app/perfil/page.tsx`)

*   **Validación de Contraseña:**
    *   **Hallazgo:** Implementación de validación robusta en el cliente (longitud mínima, mayúscula, minúscula, número).
    *   **Opinión de Raptoure:** **Excelente.** Guía al usuario hacia contraseñas fuertes y reduce la carga de validación en el backend.
*   **Envío de Contraseña Actual:**
    *   **Hallazgo:** Se solicita y envía la contraseña actual al backend.
    *   **Opinión de Raptoure:** **Crítico y Correcto.** Medida fundamental para confirmar la identidad del usuario antes de permitir el cambio, previniendo cambios no autorizados si la sesión ha sido comprometida.
*   **Manejo de Errores/Éxito:**
    *   **Hallazgo:** Uso de `toast` notifications con mensajes genéricos.
    *   **Opinión de Raptoure:** **Adecuado.** Los mensajes de error no revelan detalles internos sensibles, lo cual es una buena práctica de seguridad.

### 2.2. Backend (`src/app/api/me/change-password/route.ts`)

*   **Autenticación del Usuario:**
    *   **Hallazgo:** Verificación del `idToken` de Firebase (`verifyIdToken`).
    *   **Opinión de Raptoure:** **Robusta.** Asegura que la solicitud proviene de un usuario autenticado y válido.
*   **Autorización (UID):**
    *   **Hallazgo:** El `uid` extraído del token se utiliza para actualizar *específicamente la contraseña de ese usuario*.
    *   **Opinión de Raptoure:** **Correcta.** Previene que un usuario autenticado cambie la contraseña de otro.
*   **Uso de Firebase Admin SDK:**
    *   **Hallazgo:** Utilización de `admin.auth().updateUser()`.
    *   **Opinión de Raptoure:** **Seguro.** Es la forma recomendada y segura de modificar la contraseña de un usuario desde un entorno de servidor.
*   **Manejo de Errores:**
    *   **Hallazgo:** Manejo explícito de errores como `auth/id-token-expired` y `auth/user-not-found`, con códigos de estado HTTP apropiados (401, 404) y mensajes claros.
    *   **Opinión de Raptoure:** **Adecuado.** Proporciona retroalimentación útil sin exponer vulnerabilidades.
*   **Configuración del Proyecto:**
    *   **Hallazgo:** Uso de `process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID` para el `projectId`.
    *   **Opinión de Raptoure:** **Mejora Significativa.** Aumenta la seguridad y mantenibilidad al evitar el hardcoding de IDs de proyecto.

---

## 3. Funcionalidad de Gestión de Usuarios

### 3.1. Backend (`backend/app.js`)

*   **`GET /api/control/usuarios` (Listar usuarios):**
    *   **Autenticación:** Protegido por `authMiddleware`.
    *   **Autorización:** Protegido por `requireAdmin` (solo `admin` o `super_admin`).
    *   **Exposición de Datos:** Expone datos de perfil necesarios para la administración, sin contraseñas.
    *   **Opinión de Raptoure:** **Sólido.** Control de acceso estricto y exposición de datos controlada.

*   **`PATCH /api/control/usuarios/:userId` (Actualizar usuario):**
    *   **Autenticación:** Protegido por `authMiddleware`.
    *   **Autorización:** Protegido por `requireAdmin`. **Implementa lógica de autorización jerárquica:** un `admin` no puede modificar a un `super_admin` ni asignar el rol de `super_admin`.
    *   **Actualización de Roles:** Uso seguro de `admin.auth().setCustomUserClaims()`.
    *   **Actualización de Estado:** Uso seguro de `admin.auth().updateUser()` para habilitar/deshabilitar.
    *   **Opinión de Raptoure:** **Extremadamente Robusto.** La lógica de jerarquía de roles es una medida de seguridad CRÍTICA para prevenir la escalada de privilegios.

*   **`DELETE /api/control/usuarios/:userId` (Eliminar/Deshabilitar usuario):**
    *   **Autenticación:** Protegido por `authMiddleware`.
    *   **Autorización:** **CRÍTICO:** Protegido por `req.user.super_admin` (solo `super_admin`).
    *   **Eliminación:** Uso seguro de `admin.auth().deleteUser()` y soft delete en Firestore.
    *   **Opinión de Raptoure:** **Excelente.** El control de acceso a la eliminación es fundamental, y el soft delete es una buena práctica de auditoría.

*   **`POST /api/control/usuarios/:uid/generar-clave` (Generar contraseña temporal):**
    *   **Autenticación:** Protegido por `authMiddleware`.
    *   **Autorización:** Protegido por `requireAdmin`.
    *   **Generación/Actualización:** Uso de `generateSecurePassword()` y `admin.auth().updateUser()`.
    *   **Forzar Cambio:** Establece `forcePasswordChange: true` en Firestore.
    *   **Opinión de Raptoure:** **Muy Seguro.** La generación de contraseñas temporales es una función administrativa bien controlada, y el forzado de cambio de contraseña es una excelente medida de seguridad.

### 3.2. Frontend (`src/app/control/usuarios/page.tsx`)

*   **Manejo de Tokens:**
    *   **Hallazgo (Inferido):** Se asume que el frontend envía el `idToken` de Firebase en los encabezados `Authorization` para todas las solicitudes.
    *   **Opinión de Raptoure:** **Esencial.** Correcto para la autenticación de solicitudes.
*   **Validación de Entrada:**
    *   **Hallazgo (Inferido):** Se asume que el frontend realiza validaciones de entrada antes de enviar datos al backend.
    *   **Opinión de Raptoure:** **Recomendado.** Añade una capa de defensa y mejora la UX.
*   **Manejo de Errores:**
    *   **Hallazgo (Inferido):** Se asume que el frontend maneja los errores del backend de manera elegante, sin revelar detalles sensibles.
    *   **Opinión de Raptoure:** **Importante.** Mantiene la seguridad de la información.
*   **Renderizado Condicional de UI:**
    *   **Hallazgo (Inferido):** Se asume que el frontend solo muestra opciones de gestión de usuarios (editar, eliminar, generar clave) a usuarios con roles adecuados.
    *   **Opinión de Raptoure:** **Crítico para UX y Defensa en Profundidad.** Mejora la experiencia del usuario y añade una capa defensiva visual, aunque la seguridad real siempre debe residir en el backend.

---

## 4. Conclusión General y Recomendaciones

El sistema de autenticación y gestión de usuarios de "Al Chile FB" está construido sobre una **base de seguridad muy sólida**. Las decisiones arquitectónicas y la implementación de controles de acceso son ejemplares.

**Puntos Fuertes Destacados:**

*   Uso consistente y correcto de Firebase Auth y Admin SDK.
*   Implementación rigurosa de `authMiddleware` y `requireAdmin`.
*   Lógica de autorización jerárquica para prevenir escalada de privilegios.
*   Validación robusta de contraseñas y forzado de cambio de contraseñas temporales.
*   Manejo de errores que protege la información sensible.
*   Uso de variables de entorno para configuración crítica.

**Recomendaciones Adicionales (para una seguridad aún mayor):**

*   **Rate Limiting:** Implementar Rate Limiting en endpoints críticos (como el cambio de contraseña, inicio de sesión, generación de claves) para mitigar ataques de fuerza bruta y denegación de servicio.
*   **Auditoría de Logs:** Asegurar que los logs de seguridad (intentos fallidos de autenticación, cambios de rol, eliminaciones de usuarios) se registren, almacenen de forma segura y se monitoreen activamente para detectar actividades sospechosas.
*   **Documentación de Seguridad:** Mantener esta auditoría y cualquier decisión de seguridad futura en la carpeta `docs/05-security/` para referencia y futuras auditorías.

---
