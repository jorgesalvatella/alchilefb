## 2025-10-20 - Implementación y Depuración: Restablecimiento de Contraseña de Usuario

### Descripción de la Característica
Se implementó una funcionalidad que permite a los administradores generar una contraseña temporal para un usuario. Tras iniciar sesión con esta contraseña temporal, el usuario es forzado a cambiarla por una definitiva.

### Detalles de Implementación

#### Backend (Nexus)
- **Endpoint `POST /api/control/usuarios/:uid/generar-clave`:**
  - Genera una contraseña alfanumérica segura de 12 caracteres.
  - Actualiza la contraseña del usuario en Firebase Authentication.
  - Establece la bandera `forcePasswordChange: true` en el documento del usuario en Firestore.
  - Si el documento del usuario no existe en Firestore, lo crea con valores por defecto para mantener la consistencia de datos.
  - Devuelve la contraseña temporal al frontend.
- **Endpoint `POST /api/me/password-changed`:**
  - Limpia la bandera `forcePasswordChange: false` en el documento del usuario en Firestore.
  - Maneja el caso de que el documento del usuario no exista, considerándolo un éxito para no bloquear el flujo.
- **Pruebas:** Se añadió `backend/usuarios.test.js` para cubrir la funcionalidad del endpoint de generación de contraseña.

#### Frontend (Aether)
- **Página de Gestión de Usuarios (`/control/usuarios`):**
  - Se añadió un icono de "llave" en la tabla de usuarios para activar la generación de contraseña temporal.
  - La función `handleGeneratePassword` llama al endpoint de backend y muestra la contraseña temporal en una alerta, incluyendo una instrucción para esperar 30 segundos debido al retraso de propagación de Firebase.
- **Página de Cambio de Contraseña (`/cambiar-clave`):
  - Nueva página con un formulario para que el usuario introduzca la contraseña temporal y establezca una nueva.
  - Utiliza el SDK de Firebase Client para re-autenticar al usuario y actualizar la contraseña de forma segura.
  - Llama al endpoint de backend `/api/me/password-changed` para limpiar la bandera `forcePasswordChange`.
  - La interfaz de usuario fue estilizada para coincidir con el diseño del proyecto.

#### Integración (Sentinel)
- **`FirebaseProvider` (`src/firebase/provider.tsx`):**
  - Se modificó para cargar el documento completo del usuario de Firestore (`userData`) en el contexto global al iniciar sesión.
- **`withAuth.tsx`:**
  - Se modificó para utilizar `userData` del contexto y verificar la bandera `forcePasswordChange`.
  - Si la bandera es `true` y el usuario no está en `/cambiar-clave`, se le redirige a esa página.

### Lecciones Aprendidas y Depuración
- **Invalidación de Tokens:** Tras un cambio de contraseña, el token de autenticación actual se invalida. Es crucial forzar una actualización del token (`user.getIdToken(true)`) *después* del cambio de contraseña y *antes* de realizar cualquier llamada a la API que requiera un token válido.
- **Consistencia de Datos (Firestore):** Es vital que los usuarios de Firebase Authentication tengan un documento correspondiente en la colección `users` de Firestore. Se implementó lógica para crear este documento si falta, reparando la inconsistencia de datos.
- **Retraso de Propagación de Firebase Auth:** Los cambios de contraseña pueden tardar unos segundos en propagarse por los servidores de Firebase. Se añadió una instrucción de espera de 30 segundos en la interfaz de administrador para mitigar este problema.
- **Patrón Arquitectónico:** Se reforzó la práctica de centralizar la obtención de datos del usuario en el `FirebaseProvider` y evitar llamadas directas a Firestore desde componentes de interfaz o HOCs como `withAuth`.

### Estado Actual
- ✅ **RESUELTO (2025-11-02)**: La funcionalidad de generación de contraseña temporal funciona correctamente.
- ✅ El usuario puede iniciar sesión con la contraseña temporal generada.
- ✅ El usuario es redirigido correctamente a `/cambiar-clave`.
- ✅ **Problema del cambio de contraseña RESUELTO**: Ver `session-2025-11-02-password-reset-fix.md`

### ⚠️ Problema Identificado y Resuelto (2025-11-02)

**Problema**: Cuando un usuario intentaba cambiar su contraseña temporal en `/cambiar-clave`, la re-autenticación fallaba con error `auth/wrong-password`.

**Causa**: Firebase revoca automáticamente todos los tokens de sesión cuando un admin cambia la contraseña de un usuario. Si el usuario estaba logueado cuando se generó la password temporal, su sesión quedaba inválida y no podía re-autenticarse.

**Solución**: Implementada validación en backend para prevenir generación de password temporal si el usuario tiene una sesión activa (< 5 minutos). Ver documentación completa en `session-2025-11-02-password-reset-fix.md`.