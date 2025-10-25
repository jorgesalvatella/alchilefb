# Próxima Sesión: Gestión de Usuarios - Problemas Pendientes

**Fecha de creación**: 2025-10-25
**Prioridad**: 🔴 ALTA
**Estado actual**: 70% completo con problema crítico pendiente

---

## 🎯 Objetivo de la Próxima Sesión

Resolver el problema pendiente del módulo de gestión de usuarios donde **los usuarios NO son redirigidos a `/cambiar-clave` después de iniciar sesión con una contraseña temporal**.

---

## 📋 Contexto Rápido

### Estado Actual del Módulo

**Funcionalidad Implementada** ✅:
- CRUD completo de usuarios
- Asignación de múltiples sucursales (`sucursalIds[]`)
- Campo `area` (renombrado de `departamento`)
- Generación de contraseñas temporales por el admin
- Página `/cambiar-clave` para cambio de contraseña
- Endpoint backend para generar contraseña temporal
- Endpoint backend para limpiar bandera `forcePasswordChange`

**Problema Crítico** ❌:
- Usuario puede iniciar sesión con contraseña temporal
- Bandera `forcePasswordChange: true` se establece correctamente en Firestore
- HOC `withAuth.tsx` debería redirigir a `/cambiar-clave`
- **PERO**: La redirección NO ocurre, usuario entra directo al dashboard

---

## 🔍 Análisis del Problema

### Archivos Involucrados

1. **`backend/app.js`** - Endpoint de generación de contraseña
   ```javascript
   POST /api/control/usuarios/:uid/generar-clave
   // Establece forcePasswordChange: true en Firestore
   ```

2. **`src/firebase/provider.tsx`** - FirebaseProvider
   ```typescript
   // Carga userData completo de Firestore al contexto
   ```

3. **`src/firebase/withAuth.tsx`** - HOC de autenticación
   ```typescript
   // Debería verificar userData.forcePasswordChange
   // Y redirigir a /cambiar-clave si es true
   ```

4. **`src/app/cambiar-clave/page.tsx`** - Página de cambio
   ```typescript
   // Funciona correctamente cuando se accede directamente
   ```

### Documentación Existente

**Ver**:
- `docs/06-development/session-2025-10-20-user-management-module.md`
- `docs/06-development/session-2025-10-20-user-password-reset.md` ← **CRÍTICO**

**Extracto del problema** (session-2025-10-20-user-password-reset.md):
```markdown
### Estado Actual
- La funcionalidad de generación de contraseña temporal funciona correctamente.
- El usuario puede iniciar sesión con la contraseña temporal generada.
- **Problema Pendiente:** El usuario *no* es redirigido automáticamente a
  la página `/cambiar-clave` después de iniciar sesión con una contraseña
  temporal, a pesar de que la bandera `forcePasswordChange` debería estar activa.

### Próximos Pasos
- Diagnosticar por qué la bandera `forcePasswordChange` no está activando
  la redirección en `withAuth.tsx` o por qué no se está leyendo correctamente.
```

---

## 🐛 Hipótesis del Problema

### Hipótesis 1: Timing de Carga de `userData`
- `withAuth` verifica `userData.forcePasswordChange` ANTES de que FirebaseProvider lo cargue
- Race condition entre autenticación y carga de documento Firestore

### Hipótesis 2: `userData` No Se Actualiza Después de Login
- FirebaseProvider solo carga `userData` una vez
- Después de cambio de contraseña, `userData` no se refresca automáticamente

### Hipótesis 3: Verificación en el Lugar Incorrecto
- `withAuth` verifica al montar el componente
- Pero `userData` llega después en el ciclo de vida

### Hipótesis 4: Bandera No Se Guarda Correctamente
- Backend establece `forcePasswordChange: true`
- Pero no se persiste en Firestore correctamente

---

## 🔧 Plan de Diagnóstico (Paso a Paso)

### Paso 1: Verificar que la bandera se guarda

**Acción**:
```bash
# En Firebase Console o con CLI
firestore users/{userId}
# Verificar que existe: forcePasswordChange: true
```

**Archivo a revisar**: `backend/app.js:POST /api/control/usuarios/:uid/generar-clave`

### Paso 2: Verificar carga en FirebaseProvider

**Acción**: Agregar logs temporales en `src/firebase/provider.tsx`

```typescript
useEffect(() => {
  if (user) {
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('🔥 FIREBASE PROVIDER - userData loaded:', data);
        console.log('🔥 forcePasswordChange:', data.forcePasswordChange);
        setUserData(data as UserData);
      }
    });
    return unsubscribe;
  }
}, [user]);
```

### Paso 3: Verificar lógica en withAuth

**Acción**: Revisar `src/firebase/withAuth.tsx`

```typescript
// Buscar esta sección:
if (userData?.forcePasswordChange) {
  console.log('🔐 WITHAUTH - forcePasswordChange detected');
  console.log('🔐 Current path:', pathname);
  console.log('🔐 Should redirect to /cambiar-clave');

  if (pathname !== '/cambiar-clave') {
    router.push('/cambiar-clave');
  }
}
```

### Paso 4: Verificar orden de ejecución

**Acción**: Comparar tiempos de carga

```typescript
console.log('1️⃣ withAuth mounted');
console.log('2️⃣ user:', user ? 'exists' : 'null');
console.log('3️⃣ userData:', userData ? 'exists' : 'null');
console.log('4️⃣ forcePasswordChange:', userData?.forcePasswordChange);
```

---

## 💡 Posibles Soluciones

### Solución A: Forzar Recarga de `userData` Después de Login

**En `FirebaseProvider`**:
```typescript
// Agregar función para refrescar userData
const refreshUserData = useCallback(async () => {
  if (user) {
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      setUserData(docSnap.data() as UserData);
    }
  }
}, [user]);

// Llamar después de login
useEffect(() => {
  if (user) {
    refreshUserData();
  }
}, [user, refreshUserData]);
```

### Solución B: Usar Listener en Tiempo Real en `withAuth`

**En `withAuth.tsx`**:
```typescript
useEffect(() => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  const unsubscribe = onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();

      if (data.forcePasswordChange && pathname !== '/cambiar-clave') {
        router.push('/cambiar-clave');
      }
    }
  });

  return () => unsubscribe();
}, [user, pathname, router]);
```

### Solución C: Verificar en Middleware o Layout

**Crear `src/app/middleware.ts`**:
```typescript
export async function middleware(request: NextRequest) {
  const user = await getCurrentUser();

  if (user) {
    const userData = await getUserData(user.uid);

    if (userData.forcePasswordChange && !request.url.includes('/cambiar-clave')) {
      return NextResponse.redirect(new URL('/cambiar-clave', request.url));
    }
  }
}
```

### Solución D: Verificación en `page.tsx` de Inicio

**En cada página protegida**:
```typescript
useEffect(() => {
  if (userData?.forcePasswordChange) {
    router.push('/cambiar-clave');
  }
}, [userData, router]);
```

---

## 📝 Archivos a Revisar

### Backend
1. `backend/app.js` (línea ~850-900)
   - Endpoint: `POST /api/control/usuarios/:uid/generar-clave`
   - Verificar: Se establece `forcePasswordChange: true` correctamente

### Frontend - Autenticación
2. `src/firebase/provider.tsx`
   - Función que carga `userData` de Firestore
   - Verificar: `onSnapshot` o `getDoc` para obtener documento user

3. `src/firebase/withAuth.tsx`
   - HOC que protege rutas
   - Verificar: Lógica de redirección si `forcePasswordChange: true`

### Frontend - Cambio de Contraseña
4. `src/app/cambiar-clave/page.tsx`
   - Página de cambio de contraseña
   - Verificar: Llama a `/api/me/password-changed` después de cambiar

5. `backend/app.js`
   - Endpoint: `POST /api/me/password-changed`
   - Verificar: Limpia bandera `forcePasswordChange: false`

---

## 🧪 Plan de Testing

### Test Manual del Flujo Completo

1. **Admin genera contraseña temporal**
   ```
   - Ir a /control/usuarios
   - Click en icono de llave de un usuario
   - Copiar contraseña temporal mostrada
   - Esperar 30 segundos (propagación Firebase)
   ```

2. **Usuario inicia sesión**
   ```
   - Logout si hay sesión activa
   - Ir a /ingresar
   - Usar email del usuario y contraseña temporal
   - Click en "Iniciar sesión"
   ```

3. **Verificar redirección** ⚠️
   ```
   - ¿Se redirige a /cambiar-clave? ← PROBLEMA AQUÍ
   - ¿O va directo al dashboard?
   ```

4. **Cambiar contraseña**
   ```
   - Si NO redirigió, ir manualmente a /cambiar-clave
   - Ingresar contraseña temporal (Current Password)
   - Ingresar nueva contraseña (New Password)
   - Confirmar nueva contraseña (Confirm Password)
   - Click en "Cambiar Contraseña"
   ```

5. **Verificar post-cambio**
   ```
   - ¿Redirige al dashboard?
   - ¿Bandera forcePasswordChange está en false en Firestore?
   - ¿Puede usar la nueva contraseña para siguiente login?
   ```

### Verificaciones en Firebase Console

**Antes de generar contraseña**:
```
users/{userId}
{
  email: "usuario@test.com",
  forcePasswordChange: false // o no existe
}
```

**Después de generar contraseña**:
```
users/{userId}
{
  email: "usuario@test.com",
  forcePasswordChange: true  ← DEBE EXISTIR
}
```

**Después de cambiar contraseña**:
```
users/{userId}
{
  email: "usuario@test.com",
  forcePasswordChange: false ← DEBE ESTAR EN FALSE
}
```

---

## 🎯 Entregables Esperados

Al finalizar la próxima sesión:

1. ✅ **Problema diagnosticado** - Causa raíz identificada
2. ✅ **Solución implementada** - Redirección funciona correctamente
3. ✅ **Tests pasando** - Flujo completo testeado
4. ✅ **Documentación actualizada** - Se documenta la solución en `session-2025-10-20-user-password-reset.md`

---

## 📚 Referencias Rápidas

### Comandos Útiles

```bash
# Iniciar desarrollo
npm run dev

# Backend en puerto 8080
cd backend && node index.js

# Ver logs de Firebase en consola del navegador
# Buscar: "🔥 FIREBASE PROVIDER", "🔐 WITHAUTH"

# Inspeccionar Firestore en consola
# Firebase Console → Firestore Database → users → {userId}
```

### Flujo de Autenticación Actual

```mermaid
Usuario login
    ↓
FirebaseAuth verifica credenciales
    ↓
FirebaseProvider carga userData de Firestore
    ↓
withAuth verifica permisos y forcePasswordChange
    ↓
[PROBLEMA AQUÍ] → No redirige a /cambiar-clave
    ↓
Usuario accede al dashboard normalmente
```

### Flujo Esperado

```mermaid
Usuario login con contraseña temporal
    ↓
FirebaseAuth verifica credenciales ✅
    ↓
FirebaseProvider carga userData ✅
    ↓
userData.forcePasswordChange === true ✅
    ↓
withAuth detecta bandera ✅
    ↓
[DEBE REDIRIGIR] → router.push('/cambiar-clave')
    ↓
Usuario ve formulario de cambio de contraseña
    ↓
Usuario cambia contraseña
    ↓
Backend limpia forcePasswordChange: false
    ↓
Usuario accede normalmente
```

---

## 🚀 Inicio Rápido para la Próxima Sesión

### 1. Leer Documentación Previa
```bash
# Abrir estos archivos primero:
docs/06-development/session-2025-10-20-user-password-reset.md
docs/06-development/session-2025-10-20-user-management-module.md
```

### 2. Revisar Código Clave
```bash
# Archivos críticos a explorar:
src/firebase/withAuth.tsx
src/firebase/provider.tsx
backend/app.js (línea ~850-900)
src/app/cambiar-clave/page.tsx
```

### 3. Reproducir el Problema
```bash
# Seguir plan de testing manual arriba
# Documentar cada paso con screenshots si es posible
```

### 4. Implementar Solución
```bash
# Probar soluciones A, B, C o D según diagnóstico
# Mantener 100% de cobertura de tests
```

---

**Última actualización**: 2025-10-25
**Creado para**: Próxima sesión de desarrollo
**Prioridad**: 🔴 ALTA - Bloqueador para producción
