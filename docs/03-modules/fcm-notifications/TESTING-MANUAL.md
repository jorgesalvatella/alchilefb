# 🧪 Guía de Prueba Manual - FCM Notificaciones Push

**Versión:** 1.0
**Fecha:** 2025-11-01

---

## 🚀 Inicio Rápido

### 1. Levantar el proyecto

```bash
# Terminal 1: Backend (puerto 8080)
cd /home/beto/projects/alchilefb/backend
npm run dev

# Terminal 2: Frontend (puerto 9002)
cd /home/beto/projects/alchilefb
npm run dev
```

### 2. Abrir la aplicación

```
http://localhost:9002
```

---

## ✅ Checklist de Pruebas

### PRUEBA 1: Banner de Permisos (Primera Vez)

**Objetivo:** Verificar que el banner aparece solo la primera vez

1. **Preparación:**
   - Abrir DevTools → Application → Storage
   - Limpiar `localStorage` (borrar key `fcm-permission-prompt-shown`)
   - Cerrar sesión si estás logueado

2. **Pasos:**
   - Iniciar sesión con usuario de prueba
   - ✅ Debe aparecer banner superior azul/púrpura
   - ✅ Banner dice: "¿Quieres recibir notificaciones de tus pedidos?"
   - ✅ Tiene botones "Activar" y "X"

3. **Acción:** Click en "Activar"
   - ✅ Aparece popup nativo del navegador solicitando permisos
   - ✅ Hacer click en "Permitir"
   - ✅ Toast de éxito: "¡Notificaciones activadas!"
   - ✅ Banner se oculta

4. **Verificación Backend:**
   ```bash
   # Abrir Firestore en Firebase Console
   # Colección: deviceTokens
   # Debe haber un documento nuevo con:
   # - userId: <tu-uid>
   # - platform: "web"
   # - token: "ey..."
   # - isActive: true
   ```

5. **Verificación localStorage:**
   - DevTools → Application → Local Storage
   - ✅ Key `fcm-permission-prompt-shown` = `"true"`

6. **Re-login:**
   - Cerrar sesión e iniciar sesión de nuevo
   - ✅ Banner NO debe aparecer (ya respondió)

---

### PRUEBA 2: Service Worker Registrado

**Objetivo:** Verificar que el Service Worker se registra correctamente

1. **DevTools → Application → Service Workers**
   - ✅ Debe aparecer: `firebase-messaging-sw.js`
   - ✅ Estado: "activated and is running"
   - ✅ Source: `/firebase-messaging-sw.js`

2. **Console:**
   ```javascript
   // Ejecutar en DevTools Console
   navigator.serviceWorker.getRegistration('/').then(reg => console.log(reg))
   ```
   - ✅ Debe retornar un ServiceWorkerRegistration
   - ✅ `active.scriptURL` debe terminar en `firebase-messaging-sw.js`

---

### PRUEBA 3: Token FCM Obtenido

**Objetivo:** Verificar que el token FCM se obtiene y guarda

1. **Console:**
   ```javascript
   // Ver estado de permisos
   console.log(Notification.permission); // Debe ser "granted"
   ```

2. **Logs del navegador (Console):**
   - Buscar: `[FCM]` o `[useFCMToken]`
   - ✅ Debe decir: "Token FCM obtenido: ey..."
   - ✅ Debe decir: "Token registrado en backend"

3. **Network Tab:**
   - Filtrar: `fcm`
   - ✅ Debe haber un `POST /api/fcm/register-token`
   - ✅ Status: 201
   - ✅ Response: `{ success: true, ... }`

---

### PRUEBA 4: Enviar Notificación de Prueba (Backend)

**Objetivo:** Probar que las notificaciones llegan en foreground

1. **Crear un script de prueba temporal:**

```bash
# backend/test-send-notification.js
const admin = require('firebase-admin');

// Inicializar Firebase Admin (reutilizar de app.js)
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'studio-9824031244-700aa',
});

const db = admin.firestore();

async function sendTestNotification(userId) {
  try {
    // 1. Obtener tokens del usuario
    const tokensSnapshot = await db.collection('deviceTokens')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .get();

    if (tokensSnapshot.empty) {
      console.log('No hay tokens activos para este usuario');
      return;
    }

    const tokens = tokensSnapshot.docs.map(doc => doc.data().token);
    console.log(`Encontrados ${tokens.length} tokens`);

    // 2. Enviar notificación
    const message = {
      notification: {
        title: '🧪 Notificación de Prueba',
        body: 'Si ves esto, ¡las notificaciones funcionan! 🎉',
        icon: '/icons/icon-192x192.svg'
      },
      data: {
        click_action: '/',
        type: 'test',
        timestamp: Date.now().toString()
      },
      tokens: tokens
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log('✅ Notificación enviada:', response);
    console.log(`Éxitos: ${response.successCount}, Fallos: ${response.failureCount}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar con el UID de tu usuario de prueba
const TEST_USER_ID = 'REEMPLAZAR_CON_TU_UID';
sendTestNotification(TEST_USER_ID).then(() => process.exit(0));
```

2. **Ejecutar:**
   ```bash
   cd backend
   node test-send-notification.js
   ```

3. **Resultado esperado (FOREGROUND - pestaña visible):**
   - ✅ Aparece toast en esquina superior derecha
   - ✅ Toast dice: "🧪 Notificación de Prueba"
   - ✅ Sonido de beep se reproduce
   - ✅ Toast tiene botón "Ver"

4. **Resultado esperado (BACKGROUND - pestaña oculta):**
   - Minimizar la ventana del navegador
   - Ejecutar el script de nuevo
   - ✅ Aparece notificación nativa del sistema operativo
   - ✅ Click en la notificación → abre/enfoca la pestaña de la app

---

### PRUEBA 5: Configuración Manual (Settings)

**Objetivo:** Probar que el componente de settings funciona

1. **Agregar componente a perfil temporalmente:**

```tsx
// src/app/perfil/page.tsx
import { NotificationSettings } from '@/components/notifications/NotificationSettings';

// Dentro del componente, agregar:
<div className="mt-6">
  <NotificationSettings />
</div>
```

2. **Navegar a /perfil:**
   - ✅ Card de notificaciones aparece
   - ✅ Si está activado: muestra "Notificaciones activadas" con icono verde
   - ✅ Si está desactivado: muestra botón "Activar notificaciones"

3. **Desactivar permisos (prueba):**
   - DevTools → Settings (ícono ⚙️)
   - Site Settings → Notifications → Bloquear
   - Recargar `/perfil`
   - ✅ Card muestra: "Notificaciones bloqueadas"
   - ✅ Muestra instrucciones paso a paso

---

### PRUEBA 6: Navegación al Hacer Click

**Objetivo:** Verificar que el click navega correctamente

1. **Modificar el script de prueba:**
```javascript
data: {
  click_action: '/menu', // o cualquier ruta válida
  type: 'test'
}
```

2. **Enviar notificación (background):**
   - Minimizar navegador
   - Ejecutar script
   - Click en la notificación del sistema
   - ✅ Se abre/enfoca la app en la ruta `/menu`

---

### PRUEBA 7: Auto-Registro en Login

**Objetivo:** Verificar que usuarios con permisos otorgados se auto-registran

1. **Preparación:**
   - Tener permisos otorgados (Notification.permission === "granted")
   - Cerrar sesión

2. **Login:**
   - Iniciar sesión
   - ✅ No aparece banner (ya respondió)
   - ✅ Console muestra: "[useFCMToken] Auto-registrando token..."
   - ✅ Token se registra en backend automáticamente

---

### PRUEBA 8: Limpieza al Cerrar Sesión

**Objetivo:** Verificar que el token se elimina al logout

1. **Estando logueado:**
   - Network Tab abierto, filtro: `fcm`

2. **Cerrar sesión:**
   - ✅ Debe aparecer: `DELETE /api/fcm/unregister-token`
   - ✅ Console: "[useFCMToken] Usuario cerró sesión, limpiando token"

---

## 🐛 Troubleshooting

### Problema: Banner no aparece

**Soluciones:**
1. Verificar que estás logueado
2. Limpiar localStorage: `fcm-permission-prompt-shown`
3. Verificar permisos: `Notification.permission` debe ser `"default"`
4. Verificar Console por errores

### Problema: Service Worker no se registra

**Soluciones:**
1. Verificar que `/firebase-messaging-sw.js` existe en `/public/`
2. Abrir directamente: `http://localhost:9002/firebase-messaging-sw.js` (debe cargar)
3. Verificar Console → errores de sintaxis en el SW
4. Chrome: Requiere HTTPS en producción (localhost OK)

### Problema: Token no se obtiene

**Soluciones:**
1. Verificar `NEXT_PUBLIC_FCM_VAPID_KEY` en `.env.local`
2. Verificar `Notification.permission === "granted"`
3. Verificar que Service Worker está activo
4. Console → buscar errores `[FCM]`

### Problema: Notificaciones no llegan

**Soluciones:**
1. Verificar token en Firestore (`deviceTokens` collection)
2. Verificar que `isActive === true`
3. Ejecutar script de prueba con el UID correcto
4. Verificar logs del backend por errores de FCM API
5. Firefox: Verificar que FCM está habilitado en about:config

---

## 📊 Checklist Final

- [ ] Banner aparece primera vez
- [ ] Permisos se solicitan correctamente
- [ ] Service Worker se registra (DevTools)
- [ ] Token FCM se obtiene (Console)
- [ ] Token se guarda en Firestore
- [ ] Notificación de prueba llega (foreground)
- [ ] Notificación de prueba llega (background)
- [ ] Toast con sonido funciona
- [ ] Click navega correctamente
- [ ] Auto-registro funciona al login
- [ ] Token se elimina al logout
- [ ] Build pasa sin errores (`npm run build`)

---

**Si todos los checks pasan: ✅ FASE 4 FUNCIONAL**

**Siguiente paso:** Probar en producción o implementar FASE 5 (Estadísticas)
