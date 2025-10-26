# Módulo de Verificación por WhatsApp

## 📋 Información del Módulo

**Agente responsable**: Sentinel (Coordinador) + Pyra (Firebase) + Nexus (Backend) + Aether (Frontend)
**Fecha de creación**: 2025-10-25
**Versión**: 1.0
**Estado**: ✅ Backend Completado | ⏳ Frontend Pendiente

**Estado Detallado:** Ver `STATUS.md` para checklist completo

---

## 🎯 Objetivo

Implementar un sistema completo de verificación de usuarios y recuperación de contraseñas mediante WhatsApp Business API (Meta), mejorando la seguridad y experiencia de usuario de la aplicación Al Chile FB.

---

## 🔍 Decisiones Tomadas

Basado en el análisis del sistema actual y las necesidades del proyecto, se tomaron las siguientes decisiones:

| # | Aspecto | Decisión | Razón |
|---|---------|----------|-------|
| 1 | **Servicio de mensajería** | WhatsApp Business API (Meta) | Mayor control, integración oficial, mejor escalabilidad a largo plazo |
| 2 | **Flujos a implementar** | Verificación + Recuperación (ambos) | Máxima seguridad y mejor UX |
| 3 | **Recuperación de contraseña** | Email exclusivamente (método actual) | Se mantiene el flujo actual de Firebase `sendPasswordResetEmail()` |
| 4 | **Ubicación de lógica** | Backend Express (backend/app.js) | Credenciales seguras, rate limiting, testeable |
| 5 | **Formato de mensaje** | Código OTP 6 dígitos + Nombre app | Simple, estándar de industria |
| 6 | **Migración usuarios existentes** | Migración suave (verificar en próximo login) | Menos disruptivo, gradual |
| 7 | **Alcance de implementación** | End-to-end completo | Backend + Frontend + Tests + Docs |

---

## 📐 Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FLUJO DE VERIFICACIÓN                          │
└─────────────────────────────────────────────────────────────────────────┘

1. REGISTRO NUEVO USUARIO
   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
   │  Cliente │───▶│  Backend │───▶│   Meta   │───▶│ WhatsApp │
   │ (Next.js)│    │ (Express)│    │   API    │    │  Usuario │
   └──────────┘    └──────────┘    └──────────┘    └──────────┘
        │               │               │                │
        │ POST /registro│               │                │
        │──────────────▶│               │                │
        │               │ Crea usuario  │                │
        │               │ Firebase Auth │                │
        │               │──────────────▶│                │
        │               │               │                │
        │               │ POST /send-   │                │
        │               │ verification  │                │
        │               │──────────────▶│                │
        │               │               │ Envía código   │
        │               │               │ OTP vía WA     │
        │               │               │───────────────▶│
        │               │               │                │
        │◀─────────────────────────────────────────────────────────┐
        │ Redirige a /verificar-telefono                           │
        │                                                           │
        │ Ingresa código OTP                                       │
        │──────────────▶│                                          │
        │               │ POST /verify-code                        │
        │               │──────────────▶│                          │
        │               │                │                          │
        │               │ Actualiza      │                          │
        │               │ phoneVerified  │                          │
        │               │ = true         │                          │
        │               │───────────────▶Firestore                 │
        │               │                                           │
        │◀──────────────│ Success                                  │
        │ Redirige a /menu                                         │
        └──────────────────────────────────────────────────────────┘


2. RECUPERACIÓN DE CONTRASEÑA (MANTIENE MÉTODO ACTUAL)
   ┌──────────┐    ┌──────────┐    ┌──────────┐
   │  Cliente │───▶│ Firebase │───▶│   Email  │
   │          │    │   Auth   │    │  Usuario │
   └──────────┘    └──────────┘    └──────────┘
        │               │                │
        │ sendPassword  │                │
        │ ResetEmail()  │                │
        │──────────────▶│                │
        │               │ Envía link     │
        │               │───────────────▶│
        │               │                │
        │               │                │
        │◀──────────────────────────────┘│
        │ Click en link del email        │
        │──────────────▶│                │
        │ Página Firebase│                │
        │ para reset pwd │                │
        └────────────────┘


3. LOGIN DE USUARIO NO VERIFICADO (MIGRACIÓN SUAVE)
   ┌──────────┐    ┌──────────┐    ┌──────────┐
   │  Cliente │───▶│ withAuth │───▶│ Backend  │
   │          │    │   HOC    │    │          │
   └──────────┘    └──────────┘    └──────────┘
        │               │                │
        │ Login exitoso │                │
        │──────────────▶│                │
        │               │ Verifica       │
        │               │ phoneVerified  │
        │               │───────────────▶│
        │               │                │
        │               │ phoneVerified  │
        │               │ = false        │
        │               │◀───────────────│
        │               │                │
        │◀──────────────│                │
        │ Redirige a    │                │
        │ /verificar-   │                │
        │ telefono      │                │
        └───────────────┘
```

---

## 🗂️ Estructura de Archivos del Módulo

```
alchilefb/
│
├── docs/
│   └── 03-modules/
│       └── whatsapp-verification/
│           ├── README.md                    (este archivo)
│           ├── 01-meta-api-setup.md         (guía de configuración Meta)
│           ├── 02-backend-implementation.md (implementación backend)
│           ├── 03-frontend-implementation.md (implementación frontend)
│           └── 04-testing-guide.md          (guía de testing)
│
├── backend/
│   ├── whatsapp/
│   │   ├── meta-client.js                   (cliente Meta API)
│   │   ├── otp-service.js                   (generación y validación OTP)
│   │   └── rate-limiter.js                  (control de envíos)
│   ├── routes/
│   │   └── auth.js                          (rutas de autenticación)
│   └── app.js                               (registro de rutas)
│
├── src/
│   ├── app/
│   │   └── verificar-telefono/
│   │       ├── page.tsx                     (pantalla de ingreso código OTP)
│   │       └── page.test.tsx                (tests)
│   ├── components/
│   │   └── auth/
│   │       ├── OTPInput.tsx                 (componente input código)
│   │       ├── OTPInput.test.tsx
│   │       └── ResendCodeButton.tsx         (botón reenviar código)
│   └── lib/
│       └── api/
│           └── auth.ts                      (funciones API auth)
│
├── backend/__tests__/
│   └── whatsapp/
│       ├── meta-client.test.js
│       ├── otp-service.test.js
│       └── auth-routes.test.js
│
└── e2e/
    └── whatsapp-verification.spec.ts        (tests E2E Playwright)
```

---

## 📊 Modelo de Datos (Firestore)

### Colección: `users` (MODIFICACIÓN)

Se agregará el campo `phoneVerified` a la estructura existente:

```typescript
interface User {
  // ... campos existentes ...
  id: string;
  email: string;
  phoneNumber: string;              // Ya existe: formato +52XXXXXXXXXX

  // NUEVOS CAMPOS
  phoneVerified: boolean;            // ← NUEVO: true si verificó código OTP
  phoneVerifiedAt?: Timestamp;       // ← NUEVO: fecha de verificación

  // ... resto de campos existentes ...
}
```

### Colección: `verificationCodes` (NUEVA)

Almacena códigos OTP temporales con expiración:

```typescript
interface VerificationCode {
  id: string;                        // Auto-generado por Firestore
  userId: string;                    // UID del usuario
  phoneNumber: string;               // +52XXXXXXXXXX
  code: string;                      // Código OTP (6 dígitos)
  purpose: 'registration' | 'login'; // Propósito del código

  // Seguridad
  attempts: number;                  // Intentos de verificación (máx 3)
  verified: boolean;                 // true si fue usado exitosamente

  // Timestamps
  createdAt: Timestamp;              // Fecha de creación
  expiresAt: Timestamp;              // Expira en 10 minutos
  verifiedAt?: Timestamp;            // Fecha de verificación exitosa

  // Metadata
  ipAddress?: string;                // IP del solicitante
  userAgent?: string;                // User agent del navegador
}
```

**Índices necesarios en Firestore:**
- `userId` + `verified` + `expiresAt`
- `phoneNumber` + `createdAt`

### Colección: `whatsappLogs` (NUEVA)

Log de envíos para debugging y rate limiting:

```typescript
interface WhatsAppLog {
  id: string;
  userId?: string;
  phoneNumber: string;
  messageId: string;                 // ID retornado por Meta API
  status: 'sent' | 'delivered' | 'read' | 'failed';
  purpose: 'verification' | 'notification';

  // Metadata
  createdAt: Timestamp;
  error?: string;                    // Si falló, razón del error
  cost?: number;                     // Costo del mensaje (para tracking)
}
```

---

## 🔐 Variables de Entorno Requeridas

### Backend (.env)

```bash
# Meta WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
WHATSAPP_APP_SECRET=xxxxxxxxxxxxxxxxxx

# Configuración OTP
OTP_EXPIRATION_MINUTES=10
OTP_MAX_ATTEMPTS=3
OTP_RESEND_COOLDOWN_SECONDS=60

# Rate Limiting
MAX_OTP_PER_PHONE_PER_DAY=5
MAX_OTP_PER_IP_PER_HOUR=10
```

### Frontend (.env.local)

```bash
# No se requieren nuevas variables
# Se usarán las existentes de Firebase
```

---

## 🔄 Flujos de Usuario

### 1. Registro de Nuevo Usuario

```
1. Usuario completa formulario /registro
   - Email, contraseña, nombre, teléfono

2. Frontend valida formulario
   - Zod schema existente
   - Teléfono: 10 dígitos

3. Frontend llama POST /api/registro

4. Backend crea usuario en Firebase Auth

5. Backend guarda en Firestore con phoneVerified: false

6. Backend llama POST /api/auth/send-verification-code
   - userId, phoneNumber, purpose: 'registration'

7. Backend genera código OTP de 6 dígitos

8. Backend guarda código en Firestore (verificationCodes)
   - Expira en 10 minutos

9. Backend envía mensaje WhatsApp vía Meta API

10. Frontend redirige a /verificar-telefono
    - Muestra input para código
    - Timer de 10 minutos
    - Botón "Reenviar código" (habilitado después de 60 seg)

11. Usuario ingresa código recibido en WhatsApp

12. Frontend llama POST /api/auth/verify-code
    - userId, code

13. Backend valida código
    - Existe en Firestore
    - No expiró (< 10 min)
    - No fue usado (verified: false)
    - Coincide el código
    - Intentos < 3

14. Si válido:
    - Backend actualiza user.phoneVerified = true
    - Backend marca código como verified: true
    - Frontend redirige a /menu

15. Si inválido:
    - Backend incrementa attempts
    - Frontend muestra error
    - Si attempts >= 3: código invalidado, debe solicitar nuevo
```

### 2. Login de Usuario NO Verificado (Migración)

```
1. Usuario hace login con email/password

2. Firebase Auth autentica exitosamente

3. withAuth.tsx carga userData desde Firestore

4. withAuth.tsx verifica phoneVerified

5. Si phoneVerified === false || phoneVerified === undefined:
   - Redirigir a /verificar-telefono
   - Pasar parámetro ?source=login

6. /verificar-telefono detecta source=login
   - Muestra: "Verifica tu teléfono para continuar"
   - Botón: "Enviar código de verificación"

7. Usuario hace clic en "Enviar código"

8. Frontend llama POST /api/auth/send-verification-code
   - userId (del user actual), purpose: 'login'

9. ... mismo flujo de verificación que registro (pasos 7-15)
```

### 3. Recuperación de Contraseña (SIN CAMBIOS)

```
1. Usuario en /recuperar-clave ingresa email

2. Firebase Auth: sendPasswordResetEmail(email)

3. Firebase envía email con link

4. Usuario hace clic en link

5. Firebase Hosting: página de reset

6. Usuario ingresa nueva contraseña

7. Firebase Auth actualiza contraseña

NOTA: Este flujo NO cambia, se mantiene el método actual por email
```

---

## ⚡ Componentes a Implementar

### Backend

1. **`backend/whatsapp/meta-client.js`**
   - Funcionalidad: Cliente para Meta WhatsApp Business API
   - Métodos:
     - `sendMessage(phoneNumber, message)`: Enviar mensaje
     - `sendTemplate(phoneNumber, templateName, params)`: Enviar template
     - `getMessageStatus(messageId)`: Obtener estado de mensaje
   - Dependencias: `axios`
   - Tests: Mock de Meta API con Jest

2. **`backend/whatsapp/otp-service.js`**
   - Funcionalidad: Generación y validación de códigos OTP
   - Métodos:
     - `generateOTP()`: Genera código de 6 dígitos
     - `createVerificationCode(userId, phoneNumber, purpose)`: Guarda en Firestore
     - `verifyCode(userId, code)`: Valida código
     - `invalidateCode(codeId)`: Invalida código usado
   - Dependencias: Firebase Admin SDK
   - Tests: Mocks de Firestore

3. **`backend/whatsapp/rate-limiter.js`**
   - Funcionalidad: Control de envíos para prevenir abuso
   - Métodos:
     - `canSendOTP(phoneNumber, ipAddress)`: Verifica límites
     - `recordOTPSent(phoneNumber, ipAddress)`: Registra envío
   - Dependencias: Firebase Admin SDK
   - Tests: Mocks de Firestore

4. **`backend/routes/auth.js`**
   - Funcionalidad: Endpoints de autenticación
   - Rutas:
     - `POST /api/auth/send-verification-code`: Enviar código OTP
     - `POST /api/auth/verify-code`: Verificar código OTP
     - `POST /api/auth/resend-verification-code`: Reenviar código
   - Middleware: `authMiddleware` (para verificar token Firebase)
   - Tests: Supertest

### Frontend

1. **`src/app/verificar-telefono/page.tsx`**
   - Funcionalidad: Pantalla de ingreso de código OTP
   - UI:
     - Input de 6 dígitos
     - Timer de cuenta regresiva (10 min)
     - Botón "Verificar código"
     - Botón "Reenviar código" (cooldown 60 seg)
     - Mensaje de ayuda
   - Estados:
     - `code: string`
     - `isVerifying: boolean`
     - `error: string | null`
     - `timeRemaining: number` (segundos)
     - `canResend: boolean`
   - Tests: React Testing Library

2. **`src/components/auth/OTPInput.tsx`**
   - Funcionalidad: Input especializado para códigos OTP
   - Características:
     - 6 casillas individuales
     - Auto-focus siguiente casilla
     - Paste handling (pegar código completo)
     - Solo números
     - Accesibilidad (ARIA labels)
   - Props:
     - `value: string`
     - `onChange: (value: string) => void`
     - `disabled: boolean`
   - Tests: React Testing Library

3. **`src/components/auth/ResendCodeButton.tsx`**
   - Funcionalidad: Botón con cooldown para reenviar código
   - UI:
     - Deshabilitado durante cooldown (60 seg)
     - Muestra contador regresivo
     - Se habilita al terminar cooldown
   - Props:
     - `onResend: () => Promise<void>`
     - `cooldownSeconds: number` (default: 60)
   - Tests: React Testing Library + fake timers

4. **`src/lib/api/auth.ts`**
   - Funcionalidad: Funciones de API para autenticación
   - Métodos:
     - `sendVerificationCode(userId: string, purpose: string)`
     - `verifyCode(userId: string, code: string)`
     - `resendVerificationCode(userId: string)`
   - Manejo de errores
   - Tests: Jest con fetch mocks

---

## 🧪 Estrategia de Testing

### Backend (Jest + Supertest) - 90%

**Archivos:**
- `backend/__tests__/whatsapp/meta-client.test.js`
- `backend/__tests__/whatsapp/otp-service.test.js`
- `backend/__tests__/whatsapp/rate-limiter.test.js`
- `backend/__tests__/routes/auth.test.js`

**Casos de prueba:**

1. **Meta Client:**
   - ✅ Envía mensaje correctamente
   - ✅ Maneja errores de Meta API (400, 401, 500)
   - ✅ Retorna messageId correcto
   - ✅ Incluye headers de autenticación

2. **OTP Service:**
   - ✅ Genera código de 6 dígitos numéricos
   - ✅ Guarda código en Firestore con expiración
   - ✅ Valida código correcto
   - ✅ Rechaza código expirado
   - ✅ Rechaza código ya usado
   - ✅ Incrementa attempts en código incorrecto
   - ✅ Invalida código después de 3 intentos
   - ✅ Valida purpose correcto (registration/login)

3. **Rate Limiter:**
   - ✅ Permite envío dentro de límites
   - ✅ Bloquea después de 5 envíos al mismo teléfono en 24h
   - ✅ Bloquea después de 10 envíos desde misma IP en 1h
   - ✅ Resetea contadores después del tiempo

4. **Auth Routes:**
   - ✅ POST /send-verification-code: 201 con userId válido
   - ✅ POST /send-verification-code: 401 sin autenticación
   - ✅ POST /send-verification-code: 429 si excede rate limit
   - ✅ POST /verify-code: 200 con código correcto
   - ✅ POST /verify-code: 400 con código incorrecto
   - ✅ POST /verify-code: 400 con código expirado
   - ✅ POST /verify-code: 400 después de 3 intentos
   - ✅ POST /resend-verification-code: 200 si cooldown terminó
   - ✅ POST /resend-verification-code: 429 durante cooldown

### Frontend (Jest + React Testing Library) - 90%

**Archivos:**
- `src/app/verificar-telefono/page.test.tsx`
- `src/components/auth/OTPInput.test.tsx`
- `src/components/auth/ResendCodeButton.test.tsx`
- `src/lib/api/auth.test.ts`

**Casos de prueba:**

1. **Página verificar-telefono:**
   - ✅ Renderiza formulario de código OTP
   - ✅ Muestra timer de cuenta regresiva
   - ✅ Llama a API al ingresar código completo
   - ✅ Muestra error si código incorrecto
   - ✅ Redirige a /menu si código correcto
   - ✅ Deshabilita botones durante verificación
   - ✅ Muestra mensaje si viene de login vs registro

2. **OTPInput:**
   - ✅ Renderiza 6 casillas
   - ✅ Auto-focus siguiente casilla al escribir
   - ✅ Permite pegar código completo
   - ✅ Solo acepta números
   - ✅ Llama onChange con código completo
   - ✅ Se deshabilita cuando disabled=true

3. **ResendCodeButton:**
   - ✅ Está deshabilitado inicialmente
   - ✅ Muestra countdown (60, 59, 58...)
   - ✅ Se habilita al llegar a 0
   - ✅ Llama onResend al hacer clic
   - ✅ Reinicia countdown después de reenviar

4. **API auth:**
   - ✅ sendVerificationCode hace POST correcto
   - ✅ verifyCode hace POST correcto
   - ✅ Maneja errores 400, 401, 429
   - ✅ Incluye token de autenticación

### E2E (Playwright) - 10%

**Archivo:**
- `e2e/whatsapp-verification.spec.ts`

**Casos de prueba:**
- ✅ Registro completo → Verificación → Login exitoso
- ✅ Login usuario no verificado → Verificación forzada
- ✅ Código incorrecto 3 veces → Reenviar código
- ✅ Cooldown de reenvío funciona

---

## 📦 Dependencias a Instalar

### Backend

```bash
cd backend
npm install axios
npm install --save-dev @types/axios
```

**Justificación:**
- `axios`: Cliente HTTP para llamar a Meta WhatsApp Business API
- `@types/axios`: Types de TypeScript (aunque el backend es JS, ayuda al IDE)

### Frontend

```bash
npm install react-countdown
```

**Justificación:**
- `react-countdown`: Componente de timer para cuenta regresiva (10 min, cooldown)

---

## 🚀 Plan de Implementación (7 Fases)

### Fase 1: Configuración de Meta WhatsApp Business API
**Tiempo estimado:** 2-3 horas
**Agente responsable:** Aire (DevOps)
**Tareas:**
- Crear cuenta de Meta Business
- Configurar WhatsApp Business API
- Obtener tokens de acceso
- Configurar número de teléfono
- Crear template de mensaje (si se usa)
- Documentar credenciales en archivo seguro

**Entregable:** Documento `01-meta-api-setup.md` con credenciales y pasos

---

### Fase 2: Implementación de Backend - Módulo WhatsApp
**Tiempo estimado:** 3-4 horas
**Agente responsable:** Nexus (Backend)
**Tareas:**
- Crear `backend/whatsapp/meta-client.js`
- Crear `backend/whatsapp/otp-service.js`
- Crear `backend/whatsapp/rate-limiter.js`
- Configurar variables de entorno
- Escribir tests unitarios (Jest)

**Entregable:** Módulo funcional con tests pasando

---

### Fase 3: Implementación de Backend - Rutas API
**Tiempo estimado:** 2-3 horas
**Agente responsable:** Nexus (Backend)
**Tareas:**
- Crear `backend/routes/auth.js`
- Endpoints: send-verification-code, verify-code, resend-verification-code
- Integrar authMiddleware
- Escribir tests de integración (Supertest)
- Actualizar `backend/app.js` para registrar rutas

**Entregable:** API endpoints funcionales con tests

---

### Fase 4: Actualización de Firestore Schema
**Tiempo estimado:** 1-2 horas
**Agente responsable:** Pyra (Firebase)
**Tareas:**
- Agregar campo `phoneVerified` a colección `users`
- Crear colección `verificationCodes`
- Crear colección `whatsappLogs`
- Configurar índices en Firestore Console
- Actualizar `docs/02-architecture/backend.json`
- Actualizar Security Rules si es necesario

**Entregable:** Esquema actualizado y documentado

---

### Fase 5: Implementación de Frontend - Componentes
**Tiempo estimado:** 3-4 horas
**Agente responsable:** Aether (UI/UX)
**Tareas:**
- Crear `src/components/auth/OTPInput.tsx`
- Crear `src/components/auth/ResendCodeButton.tsx`
- Crear `src/lib/api/auth.ts`
- Estilizar con Tailwind + shadcn/ui
- Escribir tests (React Testing Library)

**Entregable:** Componentes reutilizables con tests

---

### Fase 6: Implementación de Frontend - Página Verificación
**Tiempo estimado:** 3-4 horas
**Agente responsable:** Aether (UI/UX)
**Tareas:**
- Crear `src/app/verificar-telefono/page.tsx`
- Integrar OTPInput y ResendCodeButton
- Implementar timer de 10 minutos
- Implementar lógica de verificación
- Manejar estados (loading, error, success)
- Escribir tests

**Entregable:** Página funcional con tests

---

### Fase 7: Integración, Testing E2E y Migración
**Tiempo estimado:** 4-5 horas
**Agente responsable:** Vanguard (Testing) + Sentinel (Coordinación)
**Tareas:**
- Actualizar `withAuth.tsx` para detectar `phoneVerified: false`
- Actualizar página de registro para redirigir a verificación
- Escribir tests E2E con Playwright
- Ejecutar tests completos (Jest + Playwright)
- Migración de usuarios existentes (script o manual)
- Documentación final

**Entregable:** Sistema completo funcionando con 100% tests pasando

---

## ✅ Criterios de Aceptación

El módulo se considerará completo cuando:

- [ ] Backend puede enviar códigos OTP vía Meta WhatsApp API
- [ ] Backend valida códigos correctamente (6 dígitos, expiración, intentos)
- [ ] Rate limiting funciona (5/día por teléfono, 10/hora por IP)
- [ ] Frontend muestra pantalla de verificación con timer
- [ ] Usuario puede ingresar código de 6 dígitos
- [ ] Usuario puede reenviar código después de cooldown (60 seg)
- [ ] Código expira después de 10 minutos
- [ ] Código se invalida después de 3 intentos incorrectos
- [ ] Campo `phoneVerified` se actualiza en Firestore
- [ ] `withAuth.tsx` redirige usuarios no verificados
- [ ] Recuperación de contraseña sigue funcionando por email (sin cambios)
- [ ] Tests backend: 100% pasando (Jest + Supertest)
- [ ] Tests frontend: 100% pasando (Jest + RTL)
- [ ] Tests E2E: 100% pasando (Playwright)
- [ ] Documentación completa en `docs/03-modules/whatsapp-verification/`
- [ ] Variables de entorno documentadas
- [ ] Usuarios existentes pueden verificar su teléfono en próximo login

---

## 📚 Próximos Documentos

Los siguientes documentos se crearán durante la implementación:

1. **`01-meta-api-setup.md`** - Guía paso a paso para configurar Meta WhatsApp Business API
2. **`02-backend-implementation.md`** - Código completo del backend con explicaciones
3. **`03-frontend-implementation.md`** - Código completo del frontend con explicaciones
4. **`04-testing-guide.md`** - Guía completa de testing del módulo

---

## 🔒 Consideraciones de Seguridad

1. **Tokens de Meta API:**
   - NUNCA exponer en frontend
   - Almacenar en variables de entorno
   - Rotar periódicamente (cada 90 días)

2. **Códigos OTP:**
   - Generar aleatoriamente (crypto.randomInt)
   - Expiración de 10 minutos
   - Máximo 3 intentos de verificación
   - Invalidar después de uso exitoso

3. **Rate Limiting:**
   - Máximo 5 códigos por teléfono en 24 horas
   - Máximo 10 códigos por IP en 1 hora
   - Logging de todos los intentos

4. **Validación:**
   - Verificar ownership del teléfono (userId coincide)
   - Sanitizar inputs (phoneNumber)
   - Validar formato E.164

5. **Firestore Security Rules:**
   - Solo backend puede escribir en `verificationCodes`
   - Usuarios no pueden leer códigos de otros usuarios
   - `phoneVerified` solo puede ser actualizado por backend

---

## 📞 Soporte y Troubleshooting

### Problemas Comunes

**1. Meta API retorna 403 Forbidden**
- Causa: Token expirado o inválido
- Solución: Regenerar token en Meta Business Manager

**2. Mensaje no llega a WhatsApp**
- Causa: Número no tiene WhatsApp o está bloqueado
- Solución: Verificar que número esté activo, revisar logs de Meta

**3. Código expira muy rápido**
- Causa: Timezone del servidor incorrecto
- Solución: Verificar que servidor use UTC

**4. Rate limiting bloquea usuarios legítimos**
- Causa: Múltiples usuarios detrás de misma IP (NAT)
- Solución: Ajustar límites o implementar CAPTCHA

---

## 📝 Changelog del Módulo

### Versión 1.0 (2025-10-25)
- ✅ Documento de arquitectura creado
- ✅ Decisiones técnicas documentadas
- ✅ Estructura de archivos definida
- ✅ Modelo de datos diseñado
- ✅ Plan de implementación en 7 fases
- 📝 Pendiente: Implementación de código

---

**Siguiente paso:** Crear documento `01-meta-api-setup.md` con la guía de configuración de Meta WhatsApp Business API.
