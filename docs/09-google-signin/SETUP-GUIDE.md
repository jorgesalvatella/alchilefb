# 🔐 Guía de Configuración: Google Sign-In

**Proyecto**: Al Chile FB
**Fecha**: 2025-01-11
**Estado**: ✅ Código Implementado - Requiere Configuración en Firebase Console

---

## 📋 Resumen

Esta guía te llevará paso a paso para activar **Google Sign-In** en tu aplicación **Al Chile FB** desplegada en producción.

### ✅ Lo que ya está listo:
- ✅ Código de autenticación con Google implementado
- ✅ Botones de Google activos en `/ingresar` y `/registro`
- ✅ Flujo de creación de perfil automático
- ✅ Redirección a `/completar-perfil` para capturar teléfono
- ✅ Integración con verificación de teléfono existente

### 🔧 Lo que necesitas configurar:
- [ ] Habilitar Google como proveedor en Firebase Console
- [ ] Agregar dominios autorizados (producción)
- [ ] Probar en desarrollo y producción

---

## 🚀 PASO 1: Habilitar Google Sign-In en Firebase Console

### 1.1 Acceder a Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **studio-9824031244-700aa**
3. En el menú lateral izquierdo, haz clic en **Build** > **Authentication**

### 1.2 Habilitar Google como Proveedor

1. En la pestaña **Sign-in method**, haz clic en **Add new provider** (o "Agregar nuevo proveedor")
2. Selecciona **Google** de la lista de proveedores
3. **Activa el toggle** "Enable" (Habilitar)
4. Completa los campos requeridos:

   ```
   Nombre del proyecto para uso público: Al Chile FB
   Correo de soporte del proyecto: [tu-email@dominio.com]
   ```

5. Haz clic en **Save** (Guardar)

### 1.3 Verificar Configuración

Después de guardar, deberías ver **Google** en la lista de proveedores con estado **"Enabled"** (verde).

---

## 🌐 PASO 2: Configurar Dominios Autorizados

Firebase solo permite autenticación desde dominios autorizados por seguridad.

### 2.1 Agregar tu Dominio de Producción

1. Dentro de **Authentication** > **Settings** (Configuración)
2. Ve a la pestaña **Authorized domains** (Dominios autorizados)
3. Haz clic en **Add domain** (Agregar dominio)
4. Agrega tu dominio de producción:

   ```
   alchilemeatballs.com
   ```

5. Haz clic en **Add** (Agregar)

### 2.2 Dominios Pre-autorizados

Por defecto, Firebase ya incluye estos dominios (no necesitas agregarlos):
- ✅ `localhost` (desarrollo local)
- ✅ `*.firebaseapp.com` (Firebase Hosting)
- ✅ `*.web.app` (Firebase Hosting)

---

## 🧪 PASO 3: Probar Google Sign-In

### 3.1 Prueba en Desarrollo (Local)

1. Inicia tu servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Abre tu navegador en `http://localhost:9002`

3. Ve a `/ingresar` o `/registro`

4. Haz clic en el botón **"Google"**

5. **Flujo esperado**:
   - Se abre popup de Google para seleccionar cuenta
   - Después de seleccionar, se cierra el popup
   - Recibes toast de confirmación
   - Si es primera vez: redirección a `/completar-perfil`
   - Si ya tienes perfil: redirección a `/`

### 3.2 Prueba en Producción

1. Ve a tu sitio en producción: https://alchilemeatballs.com

2. Repite los pasos de la sección 3.1

3. **Nota importante**: Si obtienes error de "dominio no autorizado":
   - Verifica que agregaste `alchilemeatballs.com` en PASO 2.1
   - Firebase puede tardar **hasta 5 minutos** en propagar cambios

---

## 🔄 PASO 4: Flujo Completo de Usuario

### Escenario 1: Nuevo Usuario con Google

1. **Usuario hace clic en botón "Google"** en `/registro` o `/ingresar`
2. **Popup de Google** se abre para seleccionar cuenta
3. **Se crea perfil automáticamente** en Firestore con:
   - Email de Google
   - Nombre completo de Google (dividido en firstName/lastName)
   - Foto de perfil de Google
   - Role: `customer`
   - `phoneNumber: ""` (vacío, pendiente)
4. **Redirección a `/completar-perfil`**
   - Usuario debe ingresar su número de teléfono (10 dígitos)
   - Se actualiza en Firestore y Firebase Auth
5. **Redirección a `/verificar-telefono`** (si está implementado)
   - Usuario verifica teléfono vía WhatsApp
6. **Acceso completo a la app** ✅

### Escenario 2: Usuario Existente con Google

1. **Usuario hace clic en botón "Google"**
2. **Popup de Google** se abre
3. **Sistema detecta que el perfil ya existe**
4. **Toast de bienvenida**: "Bienvenido de vuelta"
5. **Redirección a `/`** (página principal)
6. **Acceso completo** ✅

### Escenario 3: Cuenta Existente con Email/Password

Si un usuario ya se registró con email/password usando el mismo correo que su cuenta de Google:

- **Firebase no permite duplicados** de email
- El usuario recibirá error: "Ya existe una cuenta con este correo usando otro método de inicio de sesión"
- **Solución**: El usuario debe iniciar sesión con su método original (email/password)

---

## 🐛 Solución de Problemas

### Error: "auth/unauthorized-domain"

**Causa**: El dominio desde el que intentas autenticar no está autorizado en Firebase.

**Solución**:
1. Ve a Firebase Console > Authentication > Settings > Authorized domains
2. Agrega tu dominio (ej: `alchilemeatballs.com`)
3. Espera 5 minutos para que Firebase propague los cambios
4. Intenta nuevamente

---

### Error: "auth/popup-blocked"

**Causa**: El navegador bloqueó el popup de Google.

**Solución**:
- Indica al usuario que permita popups para tu sitio
- El código ya maneja este error y muestra un toast informativo

---

### Error: "auth/popup-closed-by-user"

**Causa**: El usuario cerró el popup antes de completar la autenticación.

**Solución**:
- Este es un comportamiento esperado
- El código ya maneja este caso y **no muestra error** (es silencioso)

---

### El perfil se creó pero falta información

**Causa**: Firebase Authentication no siempre provee `displayName` o `photoURL`.

**Solución**:
- El código ya maneja esto:
  - Si `displayName` está vacío, se usan strings vacíos para `firstName` y `lastName`
  - Si `photoURL` está vacío, se omite del perfil (campo opcional)

---

## 📊 Verificación Post-Configuración

### ✅ Checklist de Verificación

Después de completar la configuración, verifica:

- [ ] Google aparece como "Enabled" en Authentication > Sign-in method
- [ ] Tu dominio de producción está en la lista de Authorized domains
- [ ] Puedes hacer login con Google desde `localhost`
- [ ] Puedes hacer login con Google desde producción (`alchilemeatballs.com`)
- [ ] El flujo de `/completar-perfil` funciona correctamente
- [ ] El perfil se crea en Firestore con los datos correctos
- [ ] La foto de perfil de Google se muestra (si existe)

---

## 🔒 Seguridad

### Validaciones Implementadas

- ✅ **Verificación de email único**: Firebase no permite duplicados
- ✅ **Roles por defecto seguros**: Todos los usuarios de Google obtienen role `customer`
- ✅ **Teléfono obligatorio**: Los usuarios deben completar su teléfono antes de hacer pedidos
- ✅ **Popup con `prompt: select_account`**: Siempre pide seleccionar cuenta (no usa sesión cacheada)

### Dominios Autorizados

Solo estos dominios pueden iniciar autenticación:
- `localhost` (desarrollo)
- `alchilemeatballs.com` (producción)
- `*.firebaseapp.com` (Firebase Hosting)

Cualquier otro dominio será rechazado por Firebase.

---

## 📁 Archivos Modificados

### Código Nuevo/Modificado

```
src/firebase/non-blocking-login.tsx
  ↳ Nueva función: initiateGoogleSignIn()

src/app/ingresar/page.tsx
  ↳ Botón de Google activado
  ↳ Handler: handleGoogleSignIn()

src/app/registro/page.tsx
  ↳ Botón de Google activado
  ↳ Handler: handleGoogleSignUp()

src/app/completar-perfil/page.tsx
  ↳ Ya existía, sin cambios (maneja teléfono)

src/firebase/withAuth.tsx
  ↳ Ya existía, sin cambios (redirige a /completar-perfil)
```

---

## 🎉 ¡Configuración Completa!

Una vez completados todos los pasos:

1. **Usuarios pueden registrarse con Google** en un solo clic
2. **Usuarios pueden iniciar sesión con Google** sin recordar contraseñas
3. **El flujo de verificación de teléfono** se mantiene intacto
4. **La seguridad** se preserva con roles y validaciones

---

## 📞 Soporte

Si encuentras problemas durante la configuración:

1. Revisa la sección **"Solución de Problemas"** arriba
2. Verifica la consola del navegador para errores específicos
3. Verifica los logs de Firebase Console > Authentication > Users

---

**Preparado por**: Claude Code
**Fecha**: 2025-01-11
**Versión**: 1.0
**Estado**: ✅ Ready for Production
