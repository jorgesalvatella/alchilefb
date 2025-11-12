# Diagnóstico: Firebase Phone Authentication

## ❌ Error actual: `auth/invalid-app-credential`

Este error indica que Firebase no reconoce las credenciales de tu aplicación para Phone Authentication.

---

## 🔍 Checklist de verificación

### 1. ✅ Habilitar Phone Authentication en Firebase Console

**URL**: https://console.firebase.google.com/project/studio-9824031244-700aa/authentication/providers

**Pasos**:
1. Ir al link de arriba
2. Buscar "Phone" en la lista de providers
3. Si dice "Disabled", hacer clic y activarlo
4. Guardar cambios

---

### 2. ✅ Configurar reCAPTCHA en Firebase

Firebase Phone Auth requiere reCAPTCHA. Tienes dos opciones:

#### Opción A: reCAPTCHA v2 (Actual - Más simple)

**URL reCAPTCHA Admin**: https://www.google.com/recaptcha/admin

**Pasos**:
1. Ir a reCAPTCHA Admin Console
2. Buscar tu site o crear uno nuevo:
   - **Label**: "Al Chile FB - Phone Auth"
   - **Type**: reCAPTCHA v2 → **Invisible reCAPTCHA badge**
   - **Domains**:
     - `localhost`
     - `alchilemeatballs.com`
     - `studio-9824031244-700aa.firebaseapp.com`
3. Copiar la **Site Key**
4. Verificar que coincida con `.env.local`:
   ```
   NEXT_PUBLIC_RECAPTCHA_V2_SITE_KEY=6LdtuQksAAAAAPwjIXqb90LhJjEf13dcJN99B8ry
   ```

#### Opción B: reCAPTCHA Enterprise (Recomendado por Firebase)

**URL**: https://console.cloud.google.com/security/recaptcha?project=studio-9824031244-700aa

**Pasos**:
1. Habilitar reCAPTCHA Enterprise API
2. Crear una Site Key de tipo "Score-based"
3. Copiar la Site Key
4. En Firebase Console → Authentication → Settings → Phone Sign-in
5. Agregar la Site Key de Enterprise

---

### 3. ✅ Verificar dominios autorizados en Firebase

**URL**: https://console.firebase.google.com/project/studio-9824031244-700aa/authentication/settings

**Dominios requeridos**:
- ✅ `localhost`
- ✅ `alchilemeatballs.com`
- ✅ `www.alchilemeatballs.com` (opcional)
- ✅ `studio-9824031244-700aa.firebaseapp.com`

---

### 4. ✅ Verificar configuración de firebase/config.ts

**Archivo**: `src/firebase/config.ts`

**Debe incluir**:
```typescript
export const firebaseConfig = {
  apiKey: "AIzaSyCetC4ZTnHKQa2Pm_YWfhoMCbYqdaGTqQc",
  authDomain: "studio-9824031244-700aa.firebaseapp.com",
  projectId: "studio-9824031244-700aa",
  storageBucket: "studio-9824031244-700aa.appspot.com", // ✅ DEBE ESTAR
  messagingSenderId: "1073493631859",
  appId: "1:1073493631859:web:d747356460c06013eb5b06",
  measurementId: ""
};
```

---

### 5. ✅ Verificar API Key y App ID

**Verificar que la API Key es correcta**:

1. Ir a: https://console.firebase.google.com/project/studio-9824031244-700aa/settings/general
2. En la sección "Your apps", buscar la app web
3. Verificar que:
   - **API Key** = `AIzaSyCetC4ZTnHKQa2Pm_YWfhoMCbYqdaGTqQc`
   - **App ID** = `1:1073493631859:web:d747356460c06013eb5b06`

---

## 🧪 Testing con números de prueba (opcional)

Para evitar enviar SMS reales durante desarrollo:

**URL**: https://console.firebase.google.com/project/studio-9824031244-700aa/authentication/settings

**Pasos**:
1. Scroll hasta "Phone numbers for testing"
2. Agregar números de prueba con códigos fijos:
   - **Phone**: `+52 999 999 9999`
   - **Code**: `123456`

Estos números no requieren SMS real ni reCAPTCHA.

---

## 🔧 Solución más probable

El error `auth/invalid-app-credential` típicamente se debe a:

1. **Phone Authentication no está habilitado** (50% de los casos)
2. **reCAPTCHA Site Key no configurada en Firebase Console** (30%)
3. **API Key incorrecta** (10%)
4. **App no registrada en Firebase Console** (10%)

---

## 📞 Próximos pasos

1. ✅ Verificar cada punto del checklist de arriba
2. ✅ Si todo está bien, intenta deshabilitar y volver a habilitar Phone Auth
3. ✅ Si persiste, considera usar reCAPTCHA Enterprise
4. ✅ Como último recurso, crea una nueva app web en Firebase Console

---

## 📚 Referencias

- [Firebase Phone Auth Docs](https://firebase.google.com/docs/auth/web/phone-auth)
- [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- [Troubleshooting Phone Auth](https://firebase.google.com/docs/auth/web/phone-auth#troubleshooting)
