# 🔥 Solución Definitiva: Firebase Phone Authentication

## 🚨 Error Actual: `auth/invalid-app-credential`

Según la documentación oficial de Firebase, este error indica que **la aplicación no está configurada correctamente en Firebase Console**.

---

## ✅ Checklist de Configuración Obligatoria

### **1. Habilitar Phone Authentication**

**URL**: https://console.firebase.google.com/project/studio-9824031244-700aa/authentication/providers

**Pasos**:
1. ✅ Ir a **Authentication** → **Sign-in method**
2. ✅ Buscar **Phone** en la lista de proveedores
3. ✅ Hacer clic en **Phone**
4. ✅ Activar el toggle (debe estar en azul/verde)
5. ✅ Hacer clic en **Save**

**Resultado esperado**: Phone debe mostrar "Enabled" con un indicador verde.

---

### **2. Agregar Dominios Autorizados**

**URL**: https://console.firebase.google.com/project/studio-9824031244-700aa/authentication/settings

**Ubicación**: Scroll hasta **Authorized domains** (Dominios autorizados)

**Dominios que DEBES agregar**:

```
localhost
alchilemeatballs.com
www.alchilemeatballs.com
studio-9824031244-700aa.firebaseapp.com
studio-9824031244-700aa.web.app
```

**⚠️ IMPORTANTE**: Según la documentación oficial de Firebase:
> "Add your hosting domain to OAuth redirect domains list"

Sin estos dominios, Phone Authentication NO funcionará.

---

### **3. Configuración de reCAPTCHA (Automática)**

Según la documentación oficial:

> "Firebase automatically manages reCAPTCHA through the RecaptchaVerifier object"

**Esto significa**:
- ✅ NO necesitas configurar manualmente reCAPTCHA en Google reCAPTCHA Admin
- ✅ Firebase lo gestiona internamente
- ✅ Tu código ya está correcto (usa `RecaptchaVerifier`)

**Sin embargo**, si sigues teniendo problemas, puedes verificar:

**URL**: https://console.cloud.google.com/security/recaptcha?project=studio-9824031244-700aa

**Opciones**:
1. **Opción A (Recomendada)**: Usar reCAPTCHA Enterprise
   - Habilitar reCAPTCHA Enterprise API
   - Crear Site Key de tipo "Score-based"
   - NO requiere Site Key en el código

2. **Opción B**: Usar reCAPTCHA v2 (actual)
   - Ya tienes: `NEXT_PUBLIC_RECAPTCHA_V2_SITE_KEY=6LdtuQksAAAAAPwjIXqb90LhJjEf13dcJN99B8ry`
   - Verificar que los dominios estén registrados en https://www.google.com/recaptcha/admin

---

### **4. Verificar API Key y App ID**

**URL**: https://console.firebase.google.com/project/studio-9824031244-700aa/settings/general

**Pasos**:
1. ✅ Scroll hasta **Your apps**
2. ✅ Buscar la app web (icono `</>`):
   - **Name**: Debe coincidir con tu app
   - **App ID**: `1:1073493631859:web:d747356460c06013eb5b06`
3. ✅ Verificar que la **API Key** coincida:
   - En Firebase Console: `AIzaSyCetC4ZTnHKQa2Pm_YWfhoMCbYqdaGTqQc`
   - En tu `src/firebase/config.ts`: Debe ser la misma

**Si no coinciden**: Actualiza `src/firebase/config.ts` con la API Key correcta.

---

### **5. Verificar que la app web esté registrada**

**URL**: https://console.firebase.google.com/project/studio-9824031244-700aa/settings/general

**Verificar**:
- ✅ Debe existir una app web registrada (icono `</>`)
- ✅ Debe tener un **App ID** asignado
- ✅ Debe tener una **API Key** asignada

**Si NO existe la app web**:
1. Click en **Add app** → **Web** (`</>`)
2. Registrar tu app con un nickname (ej: "Al Chile FB Web")
3. Copiar la configuración generada
4. Actualizar `src/firebase/config.ts` con la nueva configuración

---

## 🧪 Testing con Números de Prueba (Opcional)

Para evitar enviar SMS reales durante desarrollo:

**URL**: https://console.firebase.google.com/project/studio-9824031244-700aa/authentication/settings

**Ubicación**: Scroll hasta **Phone numbers for testing**

**Agregar**:
```
Phone number: +52 999 999 9999
Verification code: 123456
```

**Ventajas**:
- ✅ No consume cuota de SMS
- ✅ No requiere reCAPTCHA
- ✅ Siempre funciona con el código fijo

---

## 📊 Orden de Verificación Recomendado

Sigue este orden para resolver el error:

### **Paso 1: Phone Authentication Habilitado** ⭐ MÁS IMPORTANTE
```
URL: https://console.firebase.google.com/project/studio-9824031244-700aa/authentication/providers
Action: Habilitar "Phone"
```

### **Paso 2: Dominios Autorizados** ⭐ MUY IMPORTANTE
```
URL: https://console.firebase.google.com/project/studio-9824031244-700aa/authentication/settings
Action: Agregar localhost y alchilemeatballs.com
```

### **Paso 3: Verificar API Key**
```
URL: https://console.firebase.google.com/project/studio-9824031244-700aa/settings/general
Action: Confirmar que API Key en código coincide
```

### **Paso 4: Reiniciar Servidor**
```bash
# Detener servidor
Ctrl+C

# Reiniciar
npm run dev
```

### **Paso 5: Probar de nuevo**
```
1. Ir a /verificar-telefono
2. Click "Enviar Código por SMS"
3. Verificar que NO aparezca auth/invalid-app-credential
```

---

## 🔍 Verificación Post-Configuración

Después de configurar Firebase Console, verifica en DevTools:

**✅ Esperado**:
```
✅ reCAPTCHA initialized successfully
✅ reCAPTCHA resolved: [token largo]
✅ SMS enviado correctamente
```

**❌ Si sigues viendo errores**:
```
❌ auth/invalid-app-credential → Phone Auth no habilitado o API Key incorrecta
❌ auth/unauthorized-domain → Dominio no está en la lista autorizada
❌ auth/quota-exceeded → Límite de SMS excedido (10k/mes)
❌ auth/invalid-phone-number → Formato de teléfono incorrecto
```

---

## 📱 Implementación Correcta (Confirmado)

Tu código en `src/app/verificar-telefono/page.tsx` está **100% correcto** según la documentación oficial:

✅ Usa `RecaptchaVerifier` correctamente
✅ Usa `size: 'invisible'` (recomendado)
✅ Llama `signInWithPhoneNumber()` correctamente
✅ Verifica con `confirmationResult.confirm()` correctamente
✅ Maneja errores apropiadamente
✅ Formato E.164 para números de teléfono

**No necesitas cambiar NADA en el código**. El problema es SOLO de configuración en Firebase Console.

---

## 🎯 Próximos Pasos

1. ✅ **Ir a Firebase Console** y seguir los pasos del 1 al 3
2. ✅ **Reiniciar servidor** de desarrollo
3. ✅ **Probar** la funcionalidad de Phone Auth
4. ✅ Si persiste el error, revisar **logs de Firebase Console**:
   - https://console.firebase.google.com/project/studio-9824031244-700aa/authentication/users
   - Ver si hay errores específicos en la sección de logs

---

## 📞 Soporte Adicional

Si después de seguir todos estos pasos el error persiste:

1. Verifica los **logs de Firebase Authentication**:
   - URL: https://console.firebase.google.com/project/studio-9824031244-700aa/authentication/users
   - Buscar errores específicos

2. Verifica la **cuota de SMS**:
   - URL: https://console.firebase.google.com/project/studio-9824031244-700aa/usage
   - Confirmar que no has excedido los 10,000 SMS/mes

3. Considera **crear una nueva app web** en Firebase Console si la actual tiene problemas de configuración

---

## 🔗 Referencias Oficiales

- [Firebase Phone Auth Web - Documentación Oficial](https://firebase.google.com/docs/auth/web/phone-auth?hl=es-419)
- [Troubleshooting Phone Auth](https://firebase.google.com/docs/auth/web/phone-auth#troubleshooting)
- [Firebase Console - Authentication](https://console.firebase.google.com/project/studio-9824031244-700aa/authentication)
