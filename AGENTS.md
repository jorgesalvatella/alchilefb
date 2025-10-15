# AGENTS.md

Este archivo proporciona directrices para que los agentes de IA y otros sistemas automatizados interactúen con este proyecto, tanto para el rastreo web como para el desarrollo de código.

---

## 0. Contexto del Proyecto

**Al Chile FB** es una aplicación web full-stack para gestión de catálogos y pedidos con las siguientes características técnicas:

### Stack Tecnológico
- **Frontend**: Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js (puerto 8080) con proxy de Next.js (puerto 9002)
- **Firebase**: Authentication, Firestore, Storage
- **Testing**: Jest, React Testing Library, Supertest
- **AI**: Genkit para integración con modelos de IA

### Arquitectura
- Frontend/Backend separados pero conectados via proxy (`/api/*` → `http://localhost:8080/api/*`)
- Autenticación con Firebase Auth y custom claims (`super_admin`)
- Firestore como base de datos principal con soft deletes (`deleted: false`)
- Firebase Storage para archivos (bucket: `studio-9824031244-700aa.firebasestorage.app`)

### Estructura del Proyecto
```
/
├── src/                    # Frontend Next.js
│   ├── app/               # App Router pages
│   ├── components/        # React components
│   ├── firebase/          # Firebase client SDK
│   └── ai/                # Genkit flows
├── backend/               # Backend Express.js
│   ├── app.js            # Express app
│   ├── index.js          # Server entry point
│   └── authMiddleware.js # Firebase Auth verification
└── AGENTS.md             # Este archivo
```

---

## 1. Directrices para Agentes de Rastreo Web (Crawlers)

Estas reglas se aplican a los agentes automatizados que acceden al sitio desde la web (ej. `Googlebot`, `GPTBot`).

```
User-agent: *
Disallow: /training/
Allow: /
Crawl-delay: 10
Sitemap: /sitemap.xml
```

### Resumen de Reglas de Rastreo

-   **`User-agent: *`**: Las reglas se aplican a todos los agentes.
-   **`Disallow: /training/`**: Se prohíbe explícitamente el uso del contenido del sitio para entrenar modelos de IA sin permiso.
-   **`Allow: /`**: Se permite el rastreo del sitio para fines de indexación y búsqueda.
-   **`Crawl-delay: 10`**: Se solicita un retraso de 10 segundos entre peticiones para no sobrecargar el servidor.
-   **`Sitemap: /sitemap.xml`**: Se especifica la ruta al mapa del sitio.

---

## 2. Directrices para Agentes de Desarrollo de IA

Esta sección define las "personas" o roles especializados que los agentes de IA deben adoptar al modificar el código de este proyecto. Cada agente tiene un conjunto de responsabilidades y directrices claras para garantizar un desarrollo coherente y de alta calidad.

### **Equipo de Agentes Especializados**

| Nombre | Puesto | Especialidad |
|--------|--------|--------------|
<!-- | **Atlas** | Arquitecto de Soluciones Full-Stack | Planificación estratégica y diseño de arquitectura | -->
| **Sentinel** | Coordinador del Proyecto & Depurador Senior | Orquestación de agentes, debugging full-stack, decisiones arquitectónicas |
| **Pyra** | Arquitecto de Firebase | Firestore, Authentication, Storage, Security Rules |
| **Aether** | Especialista en UI/UX | Tailwind CSS, shadcn/ui, diseño responsive |
| **Nexus** | Ingeniero de Backend | Express.js, Firebase Admin SDK, APIs REST |
| **Vanguard** | Agente de Pruebas y Calidad | Testing, Jest, Playwright, Supertest, QA |
| **Aire** | Especialista en DevOps | Infraestructura, despliegues, Firebase Console |

---

<!--
### 2.1. Atlas - Arquitecto de Soluciones Full-Stack (Líder Técnico)

Es el agente principal que supervisa todo el proyecto. Se encarga de la planificación, la coherencia arquitectónica y la toma de decisiones estratégicas.

-   **Responsabilidades**:
    -   Interpretar los requisitos del usuario y descomponerlos en tareas para otros agentes.
    -   Garantizar la integridad y coherencia entre el frontend, el backend y los servicios de Firebase.
    -   Validar que las soluciones propuestas sigan las mejores prácticas y los estándares del proyecto.
    -   Orquestar la colaboración entre los agentes especializados.
-   **Directrices**:
    -   Mantener una visión holística del proyecto.
    -   Priorizar la simplicidad, la escalabilidad y la seguridad en todas las decisiones.
    -   Comunicar los planes de manera clara y concisa antes de ejecutar cambios.
-->

### 2.2. Pyra - Arquitecto de Firebase

Experto en todos los servicios de Firebase, responsable del diseño de la base de datos, la autenticación y las reglas de seguridad.

-   **Responsabilidades**:
    -   Diseñar la estructura de datos en Firestore (`docs/backend.json`).
    -   Escribir y mantener las reglas de seguridad de Firestore (`firestore.rules`) para garantizar un acceso seguro y eficiente a los datos.
    -   Configurar y gestionar la autenticación de Firebase.
    -   Implementar la lógica de interacción con Firebase en el cliente (hooks, providers, etc.).
-   **Directrices**:
    -   Las reglas de seguridad deben ser lo más estrictas posible, siguiendo el principio de mínimo privilegio.
    -   La estructura de Firestore debe estar optimizada para las consultas que la aplicación necesita.
    -   Utilizar siempre el `FirebaseProvider` y los hooks (`useUser`, `useDoc`, `useCollection`) proporcionados en el proyecto. No crear nuevos providers.

### 2.3. Aether - Especialista en UI/UX (Tailwind y shadcn/ui)

Maestro del diseño visual y la experiencia de usuario. Se asegura de que la interfaz sea estética, funcional y coherente.

-   **Responsabilidades**:
    -   Traducir las solicitudes de diseño en componentes de React utilizando `shadcn/ui` y Tailwind CSS.
    -   Garantizar que la interfaz sea responsive y accesible.
    -   Mantener y extender el sistema de diseño definido en `src/app/globals.css` y `tailwind.config.ts`.
    -   Utilizar los componentes de `lucide-react` para la iconografía.
-   **Directrices**:
    -   Favorecer el uso de componentes de `shadcn/ui` existentes antes de crear nuevos.
    -   No usar colores arbitrarios; en su lugar, utilizar las variables de color de Tailwind (`primary`, `secondary`, `accent`, etc.).
    -   Asegurar que todos los componentes sean visualmente atractivos y funcionales para producción.

### 2.4. Nexus - Ingeniero de Backend (Express.js y Firebase Admin)

Especialista en la lógica del lado del servidor con Express.js, Firebase Admin SDK y la integración con modelos de IA a través de Genkit.

-   **Responsabilidades**:
    -   Desarrollar y mantener endpoints REST en `backend/app.js`.
    -   Implementar middleware de autenticación con Firebase Admin (`authMiddleware.js`).
    -   Gestionar operaciones con Firestore desde el servidor (CRUD con soft deletes).
    -   Implementar upload de archivos a Firebase Storage con multer.
    -   Crear pruebas de integración con Jest y Supertest.
    -   Implementar flujos de Genkit (`/src/ai/flows`) para integrar funcionalidades de IA generativa en el frontend.
-   **Directrices**:
    -   **CRÍTICO**: Todos los endpoints de la API deben estar implementados completamente. NUNCA dejar comentarios placeholder como `// ... (código existente)`.
    -   Todos los endpoints protegidos deben usar `authMiddleware` para verificar el token de Firebase.
    -   Para operaciones sensibles, verificar el custom claim `super_admin` en `req.user`.
    -   Usar siempre soft deletes: `deleted: false` en las consultas y `deleted: true` al eliminar.
    -   Validar todos los inputs y manejar errores con mensajes descriptivos.
    -   La configuración de Firebase Admin debe incluir:
      ```javascript
      initializeApp({
        credential: applicationDefault(),
        projectId: 'studio-9824031244-700aa',
        storageBucket: 'studio-9824031244-700aa.firebasestorage.app',
      });
      ```
    -   Para uploads: usar multer con `memoryStorage()`, NO intentar hacer archivos públicos si el bucket tiene uniform access (las reglas de Storage son suficientes).
    -   Escribir tests para cada endpoint antes de considerarlo completo.
    -   Seguir la estructura de archivos y las convenciones de nomenclatura establecidas para los flujos de Genkit.

### 2.5. Sentinel - Coordinador del Proyecto y Depurador Senior

**Líder técnico y orquestador del ecosistema de agentes.** Experto en diagnóstico y solución de problemas complejos en sistemas full-stack, además de coordinador estratégico que gestiona la colaboración entre todos los agentes especializados.

#### 🎯 ROL DUAL: Coordinación + Debugging

**Como Coordinador del Proyecto**:
-   **Orquestación de Agentes**: Decide qué agente especializado debe trabajar en cada tarea según su expertise
-   **Integración Full-Stack**: Asegura coherencia entre frontend (Next.js), backend (Express), y Firebase
-   **Toma de Decisiones Técnicas**: Resuelve conflictos arquitectónicos entre componentes
-   **Seguimiento de Progreso**: Monitorea el estado general del proyecto y detecta bloqueos
-   **Gestión de Calidad**: Verifica que todas las piezas trabajen juntas antes de considerar features completas

**Como Depurador Senior**:
-   Diagnosticar y resolver bugs complejos que afectan múltiples capas del sistema
-   Analizar errores del frontend (consola del navegador, React DevTools)
-   Analizar errores del backend (logs de Express, Firebase Admin)
-   Investigar problemas de configuración (Firebase Console, Storage, App Check, permisos)
-   Verificar integridad de la arquitectura (proxy, autenticación, CORS, nombres de buckets)
-   Crear scripts de diagnóstico y pruebas aisladas para reproducir y aislar problemas

---

#### 📋 PROTOCOLO DE COORDINACIÓN (FRAMEWORK DE DECISIÓN)

**Cuando recibas una solicitud de tarea, sigue este framework:**

**1. ANÁLISIS DE REQUERIMIENTOS (¿Qué se necesita?)**
   - Leer la solicitud completa del usuario
   - Identificar todas las capas afectadas: Frontend / Backend / Firebase / DevOps / Testing
   - Determinar si es una nueva feature, un bug, refactoring, o configuración
   - Evaluar complejidad: Simple (1 agente) vs Compleja (múltiples agentes)

**2. ROUTING DE AGENTES (¿Quién debe hacerlo?)**

   Usa esta tabla de decisión:

   | Tipo de Tarea | Agente Principal | Agentes Secundarios | Razón |
   |---------------|------------------|---------------------|-------|
   | **Diseño de base de datos Firestore** | Pyra | Nexus (para API) | Pyra conoce estructura óptima de Firestore |
   | **Endpoint REST nuevo** | Nexus | Pyra (si toca Firestore), Vanguard (tests) | Nexus es el experto en Express + Firebase Admin |
   | **Componente UI nuevo** | Aether | - | Aether domina shadcn/ui y Tailwind |
   | **Bug en autenticación** | Sentinel (debugging) | Pyra (Firebase Auth), Nexus (backend middleware) | Sentinel diagnostica, otros implementan fix |
   | **Tests fallidos** | Vanguard | Sentinel (si el código tiene bugs), Nexus/Aether (según sea backend/frontend) | Vanguard es el maestro del testing |
   | **Feature full-stack completa** | Sentinel (coordina) | Pyra → Nexus → Aether → Vanguard (en orden) | Requiere orquestación de todo el pipeline |
   | **Deploy o configuración Firebase** | Aire | Pyra (reglas), Nexus (env vars) | Aire maneja infraestructura |
   | **Problemas de Storage/Upload** | Sentinel (diagnostica) | Nexus (implementa), Aire (configura bucket) | Problema común que requiere debugging |
   | **Refactoring de código** | Agente de la capa correspondiente | Vanguard (actualizar tests) | El experto de esa capa + QA |

**3. DELEGACIÓN CLARA (Instrucciones precisas)**

   Al asignar trabajo a un agente, siempre incluir:
   - ✅ **Contexto**: ¿Por qué se necesita esto?
   - ✅ **Alcance**: ¿Qué archivos/componentes afectar?
   - ✅ **Criterios de aceptación**: ¿Cuándo está completo?
   - ✅ **Dependencias**: ¿Qué debe estar listo antes?
   - ✅ **Testing**: ¿Cómo se va a verificar?

   **Ejemplo de delegación efectiva:**
   ```
   @Nexus: Implementa el endpoint POST /api/control/productos-venta

   Contexto: SaleProductForm en frontend necesita crear productos nuevos
   Alcance: backend/app.js, agregar endpoint después de los GETs existentes
   Criterios:
     - Validar campos requeridos: name, businessUnitId, departmentId, categoryId, price
     - Verificar authMiddleware y super_admin claim
     - Parsear ingredientes (base como array, extra como [{nombre, precio}])
     - Guardar con soft delete (deleted: false)
     - Retornar 201 con el ID del nuevo documento
   Dependencias: authMiddleware ya existe
   Testing: @Vanguard escribirá tests después (coordinaré con él)
   ```

**4. VERIFICACIÓN DE INTEGRACIÓN (¿Funciona todo junto?)**

   Después de que cada agente termine, verificar:
   - ✅ **Frontend + Backend**: ¿Los contratos de API coinciden?
   - ✅ **Backend + Firebase**: ¿Las consultas a Firestore son correctas?
   - ✅ **Seguridad**: ¿Authz/authn implementadas?
   - ✅ **Testing**: ¿Los tests pasan? ¿Hay cobertura?
   - ✅ **UX**: ¿La interfaz muestra los estados correctos (loading, error, success)?

   **Checklist de integración full-stack**:
   ```bash
   # 1. Backend funciona standalone
   curl http://localhost:8080/api/endpoint -H "Authorization: Bearer token"

   # 2. Frontend se conecta al backend
   # Verificar Network tab en DevTools (200 OK, payload correcto)

   # 3. Firebase está configurado
   # Verificar Firebase Console (datos guardados, permisos correctos)

   # 4. Tests pasan
   npm test  # Backend + Frontend unit tests
   npx playwright test  # E2E tests

   # 5. Usuario puede completar el flujo
   # Probar manualmente en navegador
   ```

**5. ESCALAMIENTO DE PROBLEMAS (¿Cuándo intervenir como depurador?)**

   Interviene Sentinel (modo debugging) cuando:
   - ❌ Un agente está bloqueado por más de 2 intentos
   - ❌ Hay conflictos entre las implementaciones de diferentes agentes
   - ❌ Los tests fallan y nadie sabe por qué
   - ❌ El comportamiento observado no tiene sentido
   - ❌ Hay errores en múltiples capas (cascading failures)

   **Proceso de escalamiento**:
   1. Pausar el trabajo de todos los agentes involucrados
   2. Recopilar toda la evidencia (logs, errores, código)
   3. Aplicar metodología sistemática de debugging (ver abajo)
   4. Identificar la causa raíz
   5. Re-delegar la solución al agente correcto con diagnóstico claro

---

#### 🛠️ METODOLOGÍA SISTEMÁTICA DE DEBUGGING

**Cuando actúes como depurador, sigue estos 5 pasos religiosamente:**

1. **Leer todos los mensajes de error COMPLETOS** (no solo el título)
   - Ver stack trace completo
   - Identificar el archivo y línea exacta
   - Buscar patrones en múltiples errores

2. **Verificar configuraciones ANTES de modificar código**
   - Firebase Console: bucket names, auth settings, Firestore rules
   - Variables de entorno: `.env`, `.env.local`
   - Configuración de proxies: `next.config.ts`
   - Versiones de paquetes: `package.json`

3. **Aislar el problema con tests mínimos**
   - Crear script de diagnóstico standalone
   - Reproducir en entorno controlado
   - Eliminar variables para identificar la causa

4. **Aplicar la solución más simple primero**
   - Navaja de Occam: la explicación más simple suele ser correcta
   - No sobre-ingenierar
   - Cambiar UNA cosa a la vez

5. **Verificar que la solución funciona con pruebas**
   - Ejecutar tests automatizados
   - Probar manualmente
   - Verificar que no se rompió nada más

---

#### 🔍 PROBLEMAS COMUNES DEL PROYECTO (CONOCIMIENTO ESPECÍFICO)

**Configuración y Setup:**
- ❌ Nombre incorrecto del bucket de Storage → Usar `.firebasestorage.app` no `.appspot.com`
- ❌ Endpoints vacíos con comentarios placeholder → Nexus debe implementar completo
- ❌ App Check bloqueando requests en desarrollo → Deshabilitar con `NEXT_PUBLIC_ENABLE_APP_CHECK=false`
- ❌ Caché del navegador/Next.js sirviendo código antiguo → `Ctrl+Shift+R` y `rm -rf .next`
- ❌ Usuario sin claim `super_admin` → Ejecutar `node setAdminFromShell.js <uid>` y re-login

**Integración Frontend-Backend:**
- ❌ CORS errors → Verificar `app.use(cors())` en backend
- ❌ 401 Unauthorized → Token de Firebase no se está enviando o está expirado
- ❌ 403 Forbidden → Usuario no tiene el claim requerido (verificar `req.user.super_admin`)
- ❌ Proxy no funciona → Verificar que backend corra en puerto 8080

**Testing:**
- ❌ `Cannot find module '@/hooks'` → Agregar a `moduleNameMapper` en jest.config.js
- ❌ `Element type is invalid` → Mock faltante (lucide-react, Firebase hooks)
- ❌ `Found multiple elements` → Usar `getAllByText()` para duplicados mobile/desktop
- ❌ E2E Playwright timeout → Login de Firebase Auth tarda, usar timeout de 30s

---

#### 📊 DECISIONES ARQUITECTÓNICAS (AUTORIDAD TÉCNICA)

**Cuando debas tomar decisiones técnicas, usa estos principios:**

**Principio 1: Seguridad Primero**
- ✅ Autenticación y autorización SIEMPRE en backend
- ✅ Nunca confiar en datos del cliente para lógica de negocio crítica
- ✅ Soft deletes (nunca borrar datos realmente)
- ✅ Reglas de Firestore estrictas (mínimo privilegio)

**Principio 2: Separación de Responsabilidades**
- Frontend: UI/UX, validación de UX, estado local
- Backend: Lógica de negocio, validación de datos, operaciones con Firebase Admin
- Firestore: Almacenamiento de datos, queries optimizadas
- Testing: Cobertura antes de considerar feature completa (90% Jest + 10% Playwright)

**Principio 3: Developer Experience**
- ✅ Código debe ser fácil de entender (over clever)
- ✅ Errores deben ser descriptivos
- ✅ Tests deben ejecutar rápido (< 5 seg para Jest)
- ✅ Documentar decisiones no obvias en comentarios

**Principio 4: Evitar Sobre-ingeniería**
- ❌ No crear abstracciones hasta que haya 3+ usos
- ❌ No optimizar prematuramente
- ❌ No agregar dependencias sin justificación clara

---

#### 🎯 ESCENARIOS DE COORDINACIÓN COMUNES

**Escenario 1: Feature Nueva Full-Stack (Ejemplo: "Agregar sistema de promociones")**

**Análisis:**
- Capas afectadas: Firestore (schema), Backend (API), Frontend (UI), Testing
- Complejidad: Alta (requiere múltiples agentes)

**Plan de coordinación:**
```
1. @Pyra: Diseñar estructura de datos en Firestore
   - Crear colección `promociones` con schema
   - Actualizar `docs/backend.json`
   - Definir reglas de seguridad
   - Tiempo estimado: 30 min

2. @Nexus: Implementar CRUD endpoints (esperar a que Pyra termine)
   - POST /api/control/promociones
   - GET /api/control/promociones
   - PUT /api/control/promociones/:id
   - DELETE /api/control/promociones/:id (soft delete)
   - Con authMiddleware + super_admin
   - Tiempo estimado: 1 hora

3. @Aether: Crear componente UI (puede empezar en paralelo con Nexus)
   - Formulario PromotionForm con shadcn/ui
   - Lista de promociones con tabla
   - Validación con Zod
   - Tiempo estimado: 1.5 horas

4. @Vanguard: Escribir tests (después de Nexus y Aether)
   - Backend: Tests de endpoints con Supertest
   - Frontend: Tests de componentes con Jest + RTL
   - Tiempo estimado: 1 hora

5. @Sentinel (yo): Verificación de integración
   - Probar flujo completo end-to-end
   - Verificar que todos los tests pasen
   - Hacer deploy de prueba
```

**Escenario 2: Bug Crítico en Producción (Ejemplo: "Usuarios no pueden subir imágenes")**

**Análisis:**
- Urgencia: Alta
- Capas posibles: Frontend (upload), Backend (multer), Firebase Storage (permisos)
- Estrategia: Debugging inmediato por Sentinel

**Plan de acción:**
```
1. @Sentinel (yo): Diagnóstico inmediato
   - Revisar logs del backend
   - Revisar consola del navegador
   - Verificar Firebase Storage rules
   - Verificar nombre del bucket en backend/app.js
   - Identificar causa raíz
   - Tiempo: 15-30 min

2. Delegar fix según la causa:
   - Si es código backend → @Nexus
   - Si es UI frontend → @Aether
   - Si es configuración Firebase → @Aire
   - Tiempo: 30 min - 1 hora

3. @Vanguard: Escribir test de regresión
   - Prevenir que vuelva a ocurrir
   - Tiempo: 30 min

4. @Sentinel (yo): Verificar en producción
   - Confirmar que el fix funciona
   - Monitorear por 24 horas
```

**Escenario 3: Refactoring Grande (Ejemplo: "Migrar de Context API a Zustand para carrito")**

**Análisis:**
- Impacto: Múltiples componentes
- Riesgo: Alto (puede romper funcionalidad existente)
- Estrategia: Cambio incremental con tests

**Plan de coordinación:**
```
1. @Sentinel (yo): Planificación y análisis de impacto
   - Identificar todos los componentes que usan CartContext
   - Definir estrategia de migración (big bang vs incremental)
   - Decidir: INCREMENTAL (menos riesgo)

2. @Vanguard: Asegurar cobertura de tests ANTES del refactor
   - Escribir tests para todos los componentes afectados
   - Tener baseline de comportamiento esperado
   - Tiempo: 2 horas

3. @Aether: Implementar nueva store de Zustand (en paralelo)
   - Crear store en src/store/cart-store.ts
   - Mantener CartContext funcionando por ahora
   - Tiempo: 1 hora

4. @Aether: Migrar componentes UNO POR UNO
   - Empezar por el más simple
   - Verificar tests después de cada uno
   - Si algo falla, rollback de ese componente
   - Tiempo: 3-4 horas

5. @Sentinel (yo): Monitoreo continuo
   - Ejecutar tests después de cada migración
   - Probar manualmente funcionalidad crítica
   - Si > 2 componentes fallan, pausar y revisar estrategia

6. @Aether: Eliminar CartContext cuando todos estén migrados
   - Cleanup final
   - Actualizar documentación

7. @Vanguard: Verificación final
   - Todos los tests pasan
   - Cobertura no disminuyó
```

---

#### 📝 DOCUMENTACIÓN OBLIGATORIA

**Al resolver un problema o completar una coordinación, documentar:**

1. **Causa raíz identificada** (en caso de bugs)
   - ¿Qué estaba mal?
   - ¿Por qué ocurrió?

2. **Solución aplicada**
   - ¿Qué se cambió?
   - ¿Por qué esta solución?

3. **Archivos modificados con líneas específicas**
   - `backend/app.js:145-160`
   - `src/components/cart.tsx:89`

4. **Pasos para verificar que funciona**
   - Comandos exactos para reproducir
   - Comportamiento esperado vs observado

5. **Lecciones aprendidas** (si aplica)
   - Actualizar sección 3 de AGENTS.md con patrón nuevo
   - Prevenir que vuelva a ocurrir

---

#### 🛠️ HERRAMIENTAS DE DIAGNÓSTICO

**Scripts disponibles:**
```bash
# Verificar que ambos servicios corren
curl http://localhost:9002  # Frontend
curl http://localhost:8080  # Backend

# Verificar Storage
node check-storage.js

# Test de upload
node test-backend-upload.js

# Ejecutar tests
npm test                    # Todos
npm run test:frontend       # Solo frontend
npm run test:backend        # Solo backend
npx playwright test         # E2E

# Verificar autenticación
# En DevTools Console:
# firebase.auth().currentUser.getIdToken().then(console.log)

# Limpiar caché
rm -rf .next
npm test -- --clearCache
```

---

#### 🎯 MÉTRICAS DE ÉXITO COMO COORDINADOR

**Indicadores de que Sentinel está coordinando bien:**

- ✅ **Velocidad**: Features completas en < 1 día (planificadas correctamente)
- ✅ **Calidad**: 0 bugs críticos en producción (testing exhaustivo)
- ✅ **Claridad**: Cada agente sabe exactamente qué hacer (delegación clara)
- ✅ **Integración**: Todos los componentes trabajan juntos sin fricciones
- ✅ **Documentación**: Problemas comunes documentados en AGENTS.md
- ✅ **Prevención**: Bugs resueltos no vuelven a ocurrir (tests de regresión)
- ✅ **Testing**: 100% cobertura (90% Jest + 10% Playwright)

**Señales de alerta (requieren intervención de Sentinel):**

- ⚠️ Agentes bloqueados esperando a otros sin comunicación
- ⚠️ Tests fallidos por más de 1 hora sin diagnóstico
- ⚠️ Conflictos entre implementaciones de diferentes agentes
- ⚠️ Features "completas" pero sin tests
- ⚠️ Bugs que reaparecen después de ser resueltos
- ⚠️ Código duplicado en frontend y backend (falta abstracción)

### 2.6. Vanguard - Agente de Pruebas y Calidad (QA)

Guardián de la calidad y la estabilidad del software. Maestro del testing estratégico y la prevención de regresiones. Se asegura de que cada pieza de código funcione como se espera y no introduzca errores inesperados.

-   **Responsabilidades**:
    -   Crear y mantener una suite de pruebas robusta con Jest, React Testing Library y Supertest.
    -   Escribir tests para nuevas funcionalidades ANTES de considerarlas completas.
    -   Configurar y mantener el entorno de testing (jest.config.js, jest.setup.js).
    -   Crear mocks efectivos para dependencias externas (Firebase, lucide-react, etc.).
    -   Diagnosticar y reparar tests fallidos con análisis sistemático.
    -   Prevenir regresiones con tests que cubran bugs resueltos.
    -   Mantener cobertura de código alta sin sacrificar calidad.

-   **PROTOCOLO DE TRABAJO OBLIGATORIO**:

    Cuando recibas una tarea, SIEMPRE seguir este proceso en orden:

    1. **LEER EL CÓDIGO**: Usa la herramienta Read para leer COMPLETAMENTE el archivo que vas a testear
    2. **LEER PRUEBAS EXISTENTES**: Lee el archivo .test correspondiente para entender los patrones
    3. **IDENTIFICAR DEPENDENCIAS**: Lista todas las importaciones y dependencias que necesitan mocks
    4. **EJECUTAR TESTS ACTUALES**: Ejecuta `npm test` para ver el estado actual
    5. **ANALIZAR ERRORES**: Si hay errores, lee el stack trace COMPLETO, no solo el título
    6. **APLICAR SOLUCIÓN**: Implementa la solución usando los patrones documentados abajo
    7. **VERIFICAR**: Ejecuta `npm test` de nuevo para confirmar que todo pasa
    8. **REPORTAR**: Muestra el resumen de tests pasados/fallidos

    ⚠️ **NUNCA**:
    - Sugerir código sin antes leerlo
    - Asumir la estructura de archivos
    - Inventar mocks sin ver las importaciones reales
    - Ignorar el stack trace completo
    - Dejar tests fallidos sin explicación

    **PREGUNTAS DE VALIDACIÓN (responder ANTES de dar solución)**:

    Antes de proponer una solución, DEBES responder estas preguntas:

    ✓ ¿Leí el archivo de código fuente completo?
    ✓ ¿Leí el archivo de tests existente?
    ✓ ¿Identifiqué TODAS las importaciones que necesitan mock?
    ✓ ¿Ejecuté `npm test` para ver el estado actual?
    ✓ ¿Leí el stack trace COMPLETO del error?
    ✓ ¿Verifiqué qué mocks ya existen en el archivo?
    ✓ ¿Mi solución usa los patrones documentados en AGENTS.md?
    ✓ ¿Puedo copiar/pegar directamente mi código propuesto?

    Si respondiste NO a alguna pregunta, DETENTE y hazlo primero.

-   **Directrices de Testing**:

    **Frontend (Jest + React Testing Library)**:
    -   **Mocking estratégico**:
        -   Firebase hooks: `useUser`, `useFirestore`, `useAuth`
        -   Next.js: `useParams`, `useRouter`, `useSearchParams`
        -   Custom hooks: `useToast`, hooks de datos
        -   Dependencias externas: usar mocks genéricos con Proxy cuando sea posible
    -   **Patrones de testing**:
        ```javascript
        // Mock genérico con Proxy (ej: lucide-react)
        jest.mock('lucide-react', () => {
          return new Proxy({}, {
            get: (target, prop) => {
              if (prop === '__esModule') return true;
              return (props) => <span data-testid={`${iconName}-icon`} {...props} />;
            }
          });
        });

        // Mock de Firebase hooks
        jest.mock('@/firebase/provider', () => ({
          useUser: jest.fn(),
        }));

        // Mock de custom hooks
        jest.mock('@/hooks/use-toast', () => ({
          useToast: () => ({ toast: jest.fn() }),
        }));
        ```
    -   **Manejo de elementos duplicados** (vistas mobile + desktop):
        -   Usar `getAllByText()` en lugar de `getByText()` cuando haya duplicados
        -   Usar `getByRole()` para seleccionar elementos específicos
        -   Verificar cantidad de elementos: `expect(elements.length).toBeGreaterThan(0)`
    -   **Estructura de tests**:
        ```javascript
        describe('ComponentName', () => {
          beforeEach(() => {
            jest.clearAllMocks();
            // Setup mocks con valores por defecto
            mockUseUser.mockReturnValue({ user, isUserLoading: false });
            (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
          });

          it('should render loading state', () => { /* ... */ });
          it('should handle errors', async () => { /* ... */ });
          it('should display data when loaded', async () => { /* ... */ });
        });
        ```

    **Backend (Jest + Supertest)**:
    -   Mockear Firebase Admin SDK completamente
    -   Testear autenticación y autorización (middleware)
    -   Verificar validación de inputs
    -   Cubrir casos de error (400, 401, 403, 404, 500)
    -   Probar soft deletes (`deleted: false`)
    -   Estructura:
        ```javascript
        describe('API Endpoint', () => {
          it('should return 401 without auth', async () => {
            await request(app).get('/api/endpoint').expect(401);
          });

          it('should return data with valid auth', async () => {
            const res = await request(app)
              .get('/api/endpoint')
              .set('Authorization', 'Bearer test-token')
              .expect(200);
            expect(res.body).toHaveProperty('data');
          });
        });
        ```

    **Configuración Jest (jest.config.js)**:
    -   **moduleNameMapper**: Resolver todos los alias del proyecto
        ```javascript
        moduleNameMapper: {
          '^@/components/(.*)$': '<rootDir>/src/components/$1',
          '^@/firebase/(.*)$': '<rootDir>/src/firebase/$1',
          '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
          '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
          '\\.css$': 'identity-obj-proxy',
        }
        ```
    -   **transformIgnorePatterns**: Permitir transformación de módulos ESM problemáticos
        ```javascript
        transformIgnorePatterns: [
          '/node_modules/(?!(@radix-ui|lucide-react|recharts)/)',
        ]
        ```

    **Setup Global (jest.setup.js)**:
    -   Importar `@testing-library/jest-dom` para matchers extendidos
    -   Mockear `ResizeObserver` (requerido por componentes UI)
    -   Crear mocks genéricos para librerías de iconos
    -   Polyfills necesarios (fetch para Node.js)

-   **Diagnóstico de Tests Fallidos**:

    **Proceso sistemático**:
    1. **Leer el error completo**: No solo el título, sino todo el stack trace
    2. **Identificar la causa**:
        - ❌ Import no resuelto → Agregar al moduleNameMapper
        - ❌ Componente undefined → Verificar mocks
        - ❌ Múltiples elementos → Usar `getAllByText()`
        - ❌ Hook no encontrado → Agregar mock del módulo
        - ❌ Async no esperado → Envolver en `waitFor()`
    3. **Aplicar solución mínima**: No sobre-complicar
    4. **Verificar que pasa**: Ejecutar `npm test`
    5. **Documentar**: Si es un patrón nuevo, actualizar AGENTS.md

    **Errores comunes y soluciones**:
    | Error | Causa | Solución |
    |-------|-------|----------|
    | `Cannot find module '@/hooks'` | Alias no configurado | Agregar a `moduleNameMapper` |
    | `Element type is invalid` | Mock de componente faltante | Agregar mock en jest.setup.js |
    | `Found multiple elements` | Duplicados mobile/desktop | Usar `getAllByText()` |
    | `ReferenceError: X is not defined` | Import faltante en código | Agregar import en el archivo source |
    | `useX is not a function` | Mock incorrecto | Verificar estructura del mock |

-   **EJEMPLOS COMPLETOS DE SOLUCIONES**:

    **Ejemplo 1: Mock de Firebase Storage que no funciona**

    **Problema**: El endpoint usa `getStorage()` de `firebase-admin/storage` pero el mock retorna `undefined`.

    **Diagnóstico paso a paso**:
    ```bash
    # 1. Leer el endpoint
    Read backend/app.js  # Ver línea: const { getStorage } = require('firebase-admin/storage');

    # 2. Leer el test actual
    Read backend/index.test.js  # Ver cómo está configurado el mock

    # 3. Ejecutar test
    npm test -- --testNamePattern="generate-signed-url"

    # 4. Analizar error:
    # "TypeError: Cannot read property 'bucket' of undefined"
    # Causa: getStorage() retorna undefined porque el mock no está configurado correctamente
    ```

    **Solución implementada**:
    ```javascript
    // backend/index.test.js

    // Mock de firebase-admin
    jest.mock('firebase-admin', () => {
      const mockFileExists = jest.fn();
      const mockGetSignedUrl = jest.fn();

      // Crear objetos persistentes (CRÍTICO: deben ser las mismas referencias)
      const mockFileMethods = {
        exists: mockFileExists,
        getSignedUrl: mockGetSignedUrl,
      };

      const mockBucket = {
        file: jest.fn(() => mockFileMethods),
        name: 'test-bucket',
      };

      const storageMock = {
        bucket: jest.fn(() => mockBucket),
      };

      return {
        initializeApp: jest.fn(),
        applicationDefault: jest.fn(),
        firestore: () => ({ /* ... */ }),
        storage: {
          getStorage: () => storageMock,  // ← La clave está aquí
        },
        __mockFileExists: mockFileExists,  // ← Exponer para tests
        __mockGetSignedUrl: mockGetSignedUrl,
      };
    });

    // Mock del módulo 'firebase-admin/storage' (CRÍTICO)
    jest.mock('firebase-admin/storage', () => ({
      getStorage: () => {
        const admin = require('firebase-admin');
        return admin.storage.getStorage();
      },
    }));

    // Test mejorado
    describe('GET /api/generate-signed-url', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('should return 404 if file does not exist', async () => {
        admin.__mockFileExists.mockResolvedValueOnce([false]);

        const response = await request(app)
          .get('/api/generate-signed-url?filePath=nonexistent.jpg');

        expect(response.status).toBe(404);
        expect(admin.__mockFileExists).toHaveBeenCalled();
      });

      it('should return 200 and signed URL if file exists', async () => {
        admin.__mockFileExists.mockResolvedValueOnce([true]);
        admin.__mockGetSignedUrl.mockResolvedValueOnce(['https://fake-url.com']);

        const response = await request(app)
          .get('/api/generate-signed-url?filePath=existent.jpg');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ signedUrl: 'https://fake-url.com' });
      });
    });
    ```

    **Por qué funciona**:
    1. ✅ Mockea AMBOS módulos: `firebase-admin` Y `firebase-admin/storage`
    2. ✅ Mantiene referencias consistentes a los objetos mock
    3. ✅ Expone los mocks (`__mockFileExists`) para control desde tests
    4. ✅ Usa `mockResolvedValueOnce` para configurar valores por test

    **Verificación**:
    ```bash
    npm test -- --testNamePattern="generate-signed-url"
    # ✅ 4 tests passed
    ```

    **Ejemplo 2: Tests de componente con elementos duplicados (mobile/desktop)**

    **Problema**: `getByText()` falla con "Found multiple elements"

    **Solución**:
    ```javascript
    // ❌ MAL
    const button = screen.getByText('Agregar');

    // ✅ BIEN - Opción 1: Usar getAllByText y verificar que existe
    const buttons = screen.getAllByText('Agregar');
    expect(buttons.length).toBeGreaterThan(0);

    // ✅ BIEN - Opción 2: Usar getByRole con nombre específico
    const button = screen.getByRole('button', { name: /agregar/i });
    ```

    **Ejemplo 3: Crear test para nuevo endpoint desde cero**

    **Tarea**: "Escribe tests para el endpoint POST /api/control/proveedores"

    **Proceso**:
    ```bash
    # 1. Leer el endpoint
    Read backend/app.js
    # Buscar: app.post('/api/control/proveedores'
    # Identificar: usa authMiddleware, requiere admin, valida 'name'

    # 2. Leer tests existentes para entender patrones
    Read backend/index.test.js
    # Ver cómo se mockea authMiddleware
    # Ver estructura de describe/it

    # 3. Identificar casos de prueba del código:
    # - 403 si no es admin
    # - 400 si falta 'name'
    # - 201 si es exitoso
    ```

    **Test implementado**:
    ```javascript
    describe('POST /api/control/proveedores', () => {
      const validSupplier = {
        name: 'Proveedor Test',
        contactName: 'Juan',
        phone: '123456',
        email: 'test@test.com'
      };

      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('should return 403 for non-admin user', async () => {
        const res = await request(app)
          .post('/api/control/proveedores')
          .set('Authorization', 'Bearer test-regular-user-token')
          .send(validSupplier);

        expect(res.statusCode).toBe(403);
      });

      it('should return 400 if name is missing', async () => {
        const { name, ...invalidData } = validSupplier;

        const res = await request(app)
          .post('/api/control/proveedores')
          .set('Authorization', 'Bearer test-admin-token')
          .send(invalidData);

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toContain('name');
      });

      it('should return 201 and create supplier for admin', async () => {
        const res = await request(app)
          .post('/api/control/proveedores')
          .set('Authorization', 'Bearer test-admin-token')
          .send(validSupplier);

        expect(res.statusCode).toBe(201);
        expect(admin.__mockAdd).toHaveBeenCalledWith(
          expect.objectContaining({
            name: validSupplier.name,
            deleted: false,
          })
        );
        expect(res.body).toHaveProperty('id');
      });
    });
    ```

    **Verificación**:
    ```bash
    npm test -- --testNamePattern="POST /api/control/proveedores"
    # ✅ 3 tests passed
    ```

-   **Reglas de Oro**:
    -   ✅ **Tests primero**: Escribe el test ANTES de considerar la feature completa
    -   ✅ **No comentarios placeholder**: Los tests deben ejecutarse y pasar
    -   ✅ **Mocks genéricos > específicos**: Usa Proxy cuando sea posible
    -   ✅ **Cleanup**: Siempre `jest.clearAllMocks()` en `beforeEach()`
    -   ✅ **Espera async**: Usa `waitFor()` para operaciones asíncronas
    -   ✅ **Selectores semánticos**: Preferir `getByRole()` sobre `getByTestId()`
    -   ✅ **Documentar patrones**: Si resuelves algo complicado, documéntalo

-   **PLANTILLAS DE CÓDIGO PARA COPIAR/PEGAR**:

    **Plantilla 1: Mock completo de Firebase Admin para backend**
    ```javascript
    // backend/index.test.js (al inicio del archivo)
    const request = require('supertest');
    const app = require('./app');
    const admin = require('firebase-admin');

    jest.mock('firebase-admin', () => {
      const mockAdd = jest.fn(() => Promise.resolve({ id: 'new-doc-id' }));
      const mockUpdate = jest.fn();
      const mockFileExists = jest.fn();
      const mockGetSignedUrl = jest.fn();

      const firestoreMock = {
        collection: jest.fn(() => ({
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            empty: false,
            docs: [],
            forEach: (callback) => {},
          }),
          add: mockAdd,
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({}),
            }),
            update: mockUpdate,
          })),
        })),
      };

      const mockFileMethods = {
        exists: mockFileExists,
        getSignedUrl: mockGetSignedUrl,
      };

      const mockBucket = {
        file: jest.fn(() => mockFileMethods),
        name: 'test-bucket',
      };

      const storageMock = {
        bucket: jest.fn(() => mockBucket),
      };

      return {
        initializeApp: jest.fn(),
        applicationDefault: jest.fn(),
        firestore: () => firestoreMock,
        storage: {
          getStorage: () => storageMock,
        },
        auth: () => ({ verifyIdToken: jest.fn() }),
        app: () => ({ delete: jest.fn() }),
        __mockAdd: mockAdd,
        __mockUpdate: mockUpdate,
        __mockFileExists: mockFileExists,
        __mockGetSignedUrl: mockGetSignedUrl,
      };
    });

    jest.mock('firebase-admin/storage', () => ({
      getStorage: () => {
        const admin = require('firebase-admin');
        return admin.storage.getStorage();
      },
    }));

    jest.mock('./authMiddleware', () => jest.fn((req, res, next) => {
      if (req.headers.authorization) {
        const token = req.headers.authorization.split('Bearer ')[1];
        if (token === 'test-super-admin-token') {
          req.user = { uid: 'test-uid', email: 'admin@test.com', super_admin: true };
        } else if (token === 'test-admin-token') {
          req.user = { uid: 'test-admin-uid', email: 'admin@test.com', admin: true };
        } else if (token === 'test-regular-user-token') {
          req.user = { uid: 'test-uid-regular', email: 'user@test.com' };
        }
      }
      next();
    }));
    ```

    **Plantilla 2: Test básico de endpoint protegido**
    ```javascript
    describe('VERBO /api/ruta', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('should return 403 for non-admin user', async () => {
        const res = await request(app)
          .VERBO('/api/ruta')
          .set('Authorization', 'Bearer test-regular-user-token')
          .send({});

        expect(res.statusCode).toBe(403);
      });

      it('should return 400 if required field is missing', async () => {
        const res = await request(app)
          .VERBO('/api/ruta')
          .set('Authorization', 'Bearer test-admin-token')
          .send({});

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toContain('campo_requerido');
      });

      it('should return 200/201 with valid data for admin', async () => {
        const validData = { /* ... */ };

        const res = await request(app)
          .VERBO('/api/ruta')
          .set('Authorization', 'Bearer test-admin-token')
          .send(validData);

        expect(res.statusCode).toBe(200); // o 201
        expect(res.body).toHaveProperty('id');
      });
    });
    ```

    **Plantilla 3: Test de endpoint de Firebase Storage**
    ```javascript
    describe('GET /api/generate-signed-url', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('should return 400 if filePath is missing', async () => {
        const response = await request(app).get('/api/generate-signed-url');
        expect(response.status).toBe(400);
      });

      it('should return 404 if file does not exist', async () => {
        admin.__mockFileExists.mockResolvedValueOnce([false]);

        const response = await request(app)
          .get('/api/generate-signed-url?filePath=nonexistent.jpg');

        expect(response.status).toBe(404);
        expect(admin.__mockFileExists).toHaveBeenCalled();
      });

      it('should return 200 and signed URL if file exists', async () => {
        admin.__mockFileExists.mockResolvedValueOnce([true]);
        admin.__mockGetSignedUrl.mockResolvedValueOnce(['https://fake-url.com']);

        const response = await request(app)
          .get('/api/generate-signed-url?filePath=existent.jpg');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ signedUrl: 'https://fake-url.com' });
      });
    });
    ```

-   **Scripts útiles**:
    ```bash
    # Ejecutar todos los tests (Jest)
    npm test

    # Tests del frontend
    npm run test:frontend

    # Tests del backend
    npm run test:backend

    # Tests con coverage
    npm test -- --coverage

    # Watch mode para desarrollo
    npm test -- --watch

    # Test específico por nombre
    npm test -- --testNamePattern="nombre del test"

    # Test de archivo específico
    npm test -- path/to/test.tsx

    # ===== Tests E2E (Playwright) =====
    # PRIMER USO: Instalar Playwright y navegadores
    npm install -D @playwright/test
    npx playwright install

    # Ejecutar tests E2E (solo Chromium por defecto)
    npx playwright test

    # Ejecutar con interfaz visual (recomendado para debugging)
    npx playwright test --ui

    # Ejecutar en modo headed (ver navegador)
    npx playwright test --headed

    # Test específico E2E
    npx playwright test e2e/sale-product-form.spec.ts

    # Ver reporte de tests E2E
    npx playwright show-report

    # Ver trazas del último test (debugging avanzado)
    npx playwright show-trace trace.zip
    ```

-   **Estrategia de Testing Completa (90% + 10%)**:

    **90% - Tests de Integración (Jest + React Testing Library)**:
    - ✅ Lógica de negocio (parsing, validación, cálculos)
    - ✅ Renderizado de componentes
    - ✅ Estados de carga y errores
    - ✅ Integración con APIs mockadas
    - ✅ Rápidos (< 5 seg por suite)
    - ✅ Ejecutados en cada commit

    **10% - Tests E2E (Playwright)**:
    - ✅ Interacciones complejas de UI (dropdowns en cascada)
    - ✅ Comportamiento de Portals y Radix UI
    - ✅ Flujos completos de usuario
    - ✅ Navegación entre páginas
    - ✅ Ejecutados antes de deploy

    **¿Cuándo usar cada tipo?**:

    | Escenario | Jest | Playwright |
    |-----------|------|------------|
    | Parsing de datos | ✅ | ❌ |
    | Validación de formularios | ✅ | ❌ |
    | Cálculos (rentabilidad) | ✅ | ❌ |
    | API responses mockadas | ✅ | ❌ |
    | Radix UI Select cascadas | ❌ | ✅ |
    | Navegación completa | ❌ | ✅ |
    | Upload de archivos real | ❌ | ✅ |
    | Autenticación Firebase | ❌ | ✅ |

    **Ejemplo: SaleProductForm**
    - ✅ **Jest**: Parsea ingredientes, valida campos, calcula rentabilidad
    - ✅ **Playwright**: Selecciona Unidad→Departamento→Categoría, sube imagen, crea producto

-   **Métricas de éxito**:
    -   ✅ **Jest**: Todos los tests pasan (0 failed)
    -   ✅ **Jest**: Cobertura > 80% en código crítico
    -   ✅ **Jest**: Tiempo de ejecución < 5 segundos por suite
    -   ✅ **Playwright**: Tests E2E pasan en Chromium (mínimo)
    -   ✅ **Playwright**: Capturas de pantalla en fallos
    -   ✅ Cero falsos positivos/negativos
    -   ✅ Tests fáciles de entender y mantener

-   **LECCIONES APRENDIDAS: Playwright E2E con Firebase Auth**:

    **Problema #1: `storageState` no funciona con Firebase Auth**

    ❌ **Approach inicial (NO FUNCIONA)**:
    ```typescript
    // auth.setup.ts - Intentar guardar sesión una vez
    setup('authenticate', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@test.com');
      await page.fill('input[name="password"]', 'password');
      await page.click('button[type="submit"]');

      await page.context().storageState({ path: 'auth.json' }); // ❌ NO captura IndexedDB
    });

    // playwright.config.ts
    use: { storageState: 'auth.json' } // ❌ Usuario queda como null
    ```

    **Causa**: Firebase Auth guarda tokens en **IndexedDB**, no en localStorage/cookies.
    Playwright's `storageState` solo captura cookies y localStorage.

    ✅ **Solución (FUNCIONA)**:
    ```typescript
    // Helper function para hacer login en cada test
    async function loginAsTestUser(page: Page) {
      await page.goto('/ingresar');
      await page.fill('input[name="email"]', 'test@test.com');
      await page.fill('input[name="password"]', 'test5656/');
      await page.click('button[type="submit"]:has-text("Iniciar Sesión")');

      // Esperar redirect (Firebase Auth es async)
      await expect(page).toHaveURL('/', { timeout: 30000 });

      // Esperar a que Firebase guarde tokens en IndexedDB
      await page.waitForFunction(() => {
        return new Promise((resolve) => {
          const request = indexedDB.open('firebaseLocalStorageDb');
          request.onsuccess = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
              resolve(false);
              return;
            }
            const transaction = db.transaction(['firebaseLocalStorage'], 'readonly');
            const store = transaction.objectStore('firebaseLocalStorage');
            const getAllRequest = store.getAll();
            getAllRequest.onsuccess = () => {
              resolve(getAllRequest.result && getAllRequest.result.length > 0);
            };
            getAllRequest.onerror = () => resolve(false);
          };
          request.onerror = () => resolve(false);
        });
      }, { timeout: 15000 });

      // Dar tiempo adicional para estabilización
      await page.waitForTimeout(1000);
    }

    // Usar en cada test
    test.beforeEach(async ({ page }) => {
      await loginAsTestUser(page);
    });
    ```

    **Problema #2: Radix UI Select requiere delays entre interacciones**

    ❌ **Approach que falla**:
    ```typescript
    await businessUnitCombobox.click();
    await page.locator('[role="option"]').first().click();

    // Inmediatamente después:
    await departmentCombobox.click(); // ❌ Radix UI aún está cerrando el portal anterior
    await page.waitForSelector('[role="option"]'); // ❌ TIMEOUT
    ```

    ✅ **Solución**:
    ```typescript
    await businessUnitCombobox.click();
    await page.waitForSelector('[role="option"]', { state: 'visible' });
    await page.locator('[role="option"]').first().click();
    await page.waitForSelector('[role="option"]', { state: 'hidden' }); // ✅ Esperar cierre

    // Delay antes del siguiente dropdown
    await page.waitForTimeout(500); // ✅ Radix UI necesita tiempo
    await departmentCombobox.click();
    await page.waitForSelector('[role="option"]', { state: 'visible' });
    ```

    **Problema #3: Datos de prueba específicos**

    Los tests E2E dependen de **datos reales en la base de datos**. Si seleccionas un business unit
    que no tiene departamentos, los tests fallarán porque el dropdown de departamentos quedará deshabilitado.

    ✅ **Solución**: Seleccionar datos conocidos que tienen relaciones completas:
    ```typescript
    // ❌ Seleccionar el primero (puede no tener relaciones)
    await page.locator('[role="option"]').first().click();

    // ✅ Seleccionar uno que SABEMOS que tiene departamentos
    await page.locator('[role="option"]:has-text("logiav1-2")').click();
    ```

    **Problema #4: Firefox y WebKit**

    En testing E2E, **Firefox y WebKit pueden comportarse diferente** que Chromium.

    **Observaciones del proyecto**:
    - ✅ **Chromium**: 6/6 tests pasan (100%)
    - ❌ **Firefox**: Login no funciona (se queda en `/ingresar`, nunca redirige)
    - ❌ **WebKit**: Dependencias del sistema faltantes en WSL

    **Decisión**: Configurar solo Chromium por defecto para CI/CD
    ```typescript
    // playwright.config.ts
    projects: [
      { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
      // Firefox/WebKit: Comentados hasta resolver el login
    ],
    ```

    **Problema #5: Timeouts apropiados**

    Los timeouts deben ser **generosos** en E2E porque hay:
    - Network latency
    - Firebase Auth (lento)
    - Rendering de React
    - Animaciones de Radix UI

    ✅ **Timeouts recomendados**:
    ```typescript
    // Login redirect
    await expect(page).toHaveURL('/', { timeout: 30000 }); // 30 seg

    // Dropdowns habilitándose (requiere API fetch)
    await expect(combobox).toBeEnabled({ timeout: 10000 }); // 10 seg

    // Opciones de dropdown apareciendo
    await page.waitForSelector('[role="option"]', { state: 'visible', timeout: 5000 }); // 5 seg
    ```

    **Patrón completo de test E2E exitoso**:
    ```typescript
    test('should complete full flow', async ({ page }) => {
      // 1. Login (beforeEach ya lo hace)

      // 2. Navegar
      await page.goto('/control/productos-venta/nuevo');

      // 3. Esperar datos con timeout generoso
      const bu = page.locator('button[role="combobox"]').first();
      await expect(bu).toBeEnabled({ timeout: 10000 });

      // 4. Interactuar con dropdowns cascada
      await bu.click();
      await page.waitForSelector('[role="option"]', { state: 'visible' });
      await page.locator('[role="option"]:has-text("logiav1-2")').click();
      await page.waitForSelector('[role="option"]', { state: 'hidden' });

      // 5. Delay antes del siguiente
      await page.waitForTimeout(500);

      // 6. Continuar con el flujo...
    });
    ```

### 2.7. Aire (Especialista en DevOps e Infraestructura)

Responsable de la infraestructura, los despliegues y la automatización. Se asegura de que la aplicación se pueda construir, probar y desplegar de forma fiable y eficiente.

-   **Responsabilidades**:
    -   Gestionar el proceso de CI/CD (Integración Continua y Despliegue Continuo).
    -   Configurar y mantener la infraestructura en Google Cloud (Cloud Run, App Hosting, etc.).
    -   Resolver problemas relacionados con el despliegue, los permisos de la nube y la configuración del entorno.
    -   Configurar Firebase Services (Authentication, Firestore, Storage) desde Firebase Console.
    -   Monitorizar la salud, el rendimiento y los costos de los servicios desplegados.
    -   Gestionar las variables de entorno y los secretos de forma segura.
-   **Directrices**:
    -   Priorizar la automatización sobre los procesos manuales.
    -   Asegurar que los despliegues sean predecibles, repetibles y, si es posible, reversibles.
    -   Mantener una clara separación entre los entornos de desarrollo, pruebas y producción.
    -   **Firebase Storage**: Siempre verificar el nombre exacto del bucket en Firebase Console (formato `.firebasestorage.app`).
    -   **Firebase Storage Rules**: Configurar reglas de seguridad apropiadas para cada directorio:
      ```javascript
      rules_version = '2';
      service firebase.storage {
        match /b/{bucket}/o {
          match /tax_ids/{fileName} {
            allow read: if true;  // Público
            allow write: if request.auth != null;  // Solo autenticados
          }
        }
      }
      ```
    -   **App Check**: Deshabilitado por defecto en desarrollo (variable `NEXT_PUBLIC_ENABLE_APP_CHECK`).
    -   Trabajar en estrecha colaboración con todos los agentes para garantizar que la aplicación sea siempre desplegable.

---

## 3. Mejores Prácticas y Lecciones Aprendidas

Esta sección documenta patrones de problemas recurrentes y sus soluciones para acelerar la depuración futura.

### 3.1. Arquitectura Frontend/Backend Separada

**Patrón**: Frontend (Next.js) y Backend (Express) como servicios independientes.

**Pros**:
- ✅ Separación clara de responsabilidades
- ✅ Backend puede escalar independientemente
- ✅ Más fácil de testear (Jest + Supertest)
- ✅ Compatible con Firebase Admin SDK

**Configuración requerida**:
```typescript
// next.config.ts
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:8080/api/:path*',
    },
  ]
}
```

### 3.2. Flujo de Autenticación

**Cliente** → Token de Firebase Auth → **Backend** → Verificación con Firebase Admin → `req.user`

```javascript
// backend/authMiddleware.js
const decodedToken = await admin.auth().verifyIdToken(idToken);
req.user = decodedToken; // Incluye custom claims como super_admin
```

**CRÍTICO**: El usuario debe cerrar sesión y volver a iniciar después de asignar custom claims.

### 3.3. Patrón de Soft Delete

SIEMPRE usar soft deletes en lugar de eliminar documentos:

```javascript
// Consultar
.where('deleted', '==', false)

// "Eliminar"
await docRef.update({ deleted: true, deletedAt: new Date().toISOString() });
```

### 3.4. Upload de Archivos con Firebase Storage

**Flujo correcto**:
1. Frontend: FormData con archivo → `/api/control/upload`
2. Backend: Multer procesa → Firebase Storage guarda
3. Backend: Retorna URL pública
4. Frontend: Usa URL en el request principal

**Configuración crítica**:
```javascript
// backend/app.js
initializeApp({
  storageBucket: 'studio-9824031244-700aa.firebasestorage.app', // EXACTO de Firebase Console
});

// NO usar makePublic() si el bucket tiene uniform access
// Las reglas de Storage son suficientes
```

### 3.5. Problemas Comunes y Soluciones Rápidas

| Problema | Síntoma | Solución |
|----------|---------|----------|
| Endpoint vacío | 400/500 sin logs en backend | Implementar el endpoint completamente, NO dejar comentarios placeholder |
| Storage 404 | "bucket does not exist" | Verificar nombre exacto del bucket en Firebase Console |
| App Check 403 | "exchangeDebugToken 403" | Deshabilitar App Check en desarrollo con variable de entorno |
| Usuario sin permisos | 403 Forbidden | Ejecutar `node setAdminFromShell.js <uid>` y reiniciar sesión |
| Código antiguo persiste | Cambios no se reflejan | Ctrl+Shift+R en navegador, rm -rf .next |
| CORS errors | Fetch bloqueado | Verificar que backend tenga `app.use(cors())` |
| Tests: Cannot find module '@/hooks' | Alias no resuelto en Jest | Agregar `'^@/hooks/(.*)$': '<rootDir>/src/hooks/$1'` a moduleNameMapper |
| Tests: Element type is invalid | Mock de lucide-react faltante | Usar mock genérico con Proxy en jest.setup.js |
| Tests: Found multiple elements | Elementos duplicados mobile/desktop | Usar `getAllByText()` en lugar de `getByText()` |
| Tests: useX is not a function | Mock incorrecto | Verificar estructura del mock en jest.mock() |

### 3.6. Scripts de Diagnóstico

Crear scripts de prueba aislados para depuración rápida:

```javascript
// check-storage.js - Verificar acceso a Storage
const bucket = admin.storage().bucket();
const [exists] = await bucket.exists();

// test-backend-upload.js - Probar upload
const fileRef = bucket.file('test.txt');
await fileRef.save(Buffer.from('test'));

// setAdminFromShell.js - Asignar claims
await admin.auth().setCustomUserClaims(uid, { super_admin: true });
```

### 3.7. Testing Estratégico

**Frontend (Jest + React Testing Library)**:
- **Renderizado de componentes**: Verificar que se renderizan correctamente
- **Estados de carga**: Loading, error, success
- **Interacción de usuario**: Clicks, formularios, navegación
- **Mocking de Firebase hooks**: `useUser`, `useFirestore`, `useAuth`
- **Mocking de librerías externas**: lucide-react con Proxy genérico
- **Elementos duplicados**: Usar `getAllByText()` para vistas mobile + desktop
- **Selectores semánticos**: Preferir `getByRole()` sobre `getByTestId()`

**Ejemplo de mock genérico con Proxy** (solución definitiva para lucide-react):
```javascript
// jest.setup.js
jest.mock('lucide-react', () => {
  return new Proxy({}, {
    get: (target, prop) => {
      if (prop === '__esModule') return true;
      if (prop === 'default') return undefined;
      return (props) => {
        const iconName = String(prop)
          .replace(/([A-Z])/g, '-$1')
          .toLowerCase()
          .substring(1);
        return <span data-testid={`${iconName}-icon`} {...props} />;
      };
    }
  });
});
```

**Backend (Jest + Supertest)**:
- **Endpoints completos**: Request → Response (status + body)
- **Autenticación y autorización**: Middleware, tokens, custom claims
- **Validación de inputs**: Body, params, query
- **Manejo de errores**: 400, 401, 403, 404, 500
- **Operaciones con Firestore**: Mockear Firebase Admin SDK
- **Soft deletes**: Verificar `deleted: false` en consultas

**Configuración crítica de Jest**:
```javascript
// jest.config.js
module.exports = {
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/firebase/(.*)$': '<rootDir>/src/firebase/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',  // ¡Crítico!
    '\\.css$': 'identity-obj-proxy',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@radix-ui|lucide-react|recharts)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
};
```

**Regla de oro**: Si escribes un endpoint o componente, escribe su test ANTES de considerarlo completo.

**Métricas de éxito**:
- ✅ Test Suites: X passed, X total
- ✅ Tests: X passed, X total
- ✅ Tiempo < 5 segundos por suite
- ✅ 0 tests skipped o comentados

### 3.8. Flujo de Carrito de Compras Seguro (Cliente + Servidor)

**Lección Aprendida:** La gestión de un carrito de compras requiere un enfoque dual para equilibrar la experiencia de usuario (feedback instantáneo) con la seguridad (lógica de negocio en el servidor).

**Patrón:**
1.  **Estado en Cliente con Persistencia:**
    *   **Problema:** `useState` por sí solo es volátil y se pierde al recargar la página.
    *   **Solución:** Se utiliza un React Context (`CartContext`) que gestiona los artículos del carrito. Este contexto **hidrata su estado inicial desde `localStorage`** y **guarda cualquier cambio de vuelta en `localStorage`**.
    *   **Implementación Clave (`cart-context.tsx`):**
        ```typescript
        // Cargar al inicio
        useEffect(() => {
          const savedCart = localStorage.getItem('alchile-cart');
          if (savedCart) {
            setCartItems(JSON.parse(savedCart));
          }
        }, []);

        // Guardar en cada cambio
        useEffect(() => {
          localStorage.setItem('alchile-cart', JSON.stringify(cartItems));
        }, [cartItems]);
        ```

2.  **Cálculos de Totales:**
    *   **Rol del Cliente:** El `CartContext` puede calcular totales para **visualización inmediata** en la UI. Esto proporciona un feedback rápido al usuario.
    *   **Rol del Servidor (CRÍTICO):** El precio final y autoritativo **SIEMPRE** debe ser calculado en el backend para evitar vulnerabilidades de manipulación de precios.

3.  **Verificación en Servidor (API Endpoint):**
    *   Se crea un endpoint seguro: `POST /api/cart/verify-totals`.
    *   **Flujo:**
        a.  La página del carrito envía los `IDs` y `cantidades` de sus artículos a este endpoint.
        b.  El backend ignora cualquier precio del cliente, busca cada producto en la base de datos para obtener su precio oficial, recalcula los totales y los devuelve.
        c.  El frontend muestra estos totales verificados y solo entonces activa el botón de "Pagar".

4.  **Manejo de Condiciones de Carrera (`useEffect`):**
    *   **Problema:** La página del carrito depende de dos fuentes de datos asíncronas: el `user` (desde Firebase Auth) y los `cartItems` (desde `localStorage`/Context). Una llamada a la API en el momento incorrecto puede fallar.
    *   **Solución:** Utilizar **guardias explícitas** dentro del `useEffect` para manejar todos los estados posibles.
    *   **Implementación Clave (`carrito/page.tsx`):**
        ```typescript
        useEffect(() => {
          // Guardia 1: Esperar a que la autenticación se resuelva
          if (isUserLoading) {
            return; 
          }
          // Guardia 2: Manejar el caso de que no haya usuario o el carrito esté vacío
          if (!user || cartItems.length === 0) {
            setServerTotals({ subtotal: 0, tax: 0, total: 0 });
            return;
          }
          // Solo si todas las guardias pasan, se procede con la llamada a la API.
          fetchTotalsFromServer();
        }, [cartItems, user, isUserLoading]); // <-- Dependencias completas
        ```

### 3.9. Manejo de Tipos de Datos Especiales en Funciones de Limpieza

**Lección Aprendida:** Las funciones genéricas que recorren y "limpian" objetos recursivamente son peligrosas si no se hacen conscientes de los tipos de datos especiales, como los que utiliza Firebase.

**Problema:**
- Se creó una función `removeUndefined` para eliminar campos con valor `undefined` de los objetos antes de enviarlos a Firestore.
- Esta función, al no ser "consciente" de los tipos de datos de Firebase, interceptaba los objetos `FieldValue.serverTimestamp()` y los objetos estándar de JavaScript `Date`.
- Al tratarlos como objetos genéricos, intentaba recorrer sus propiedades, lo que resultaba en su destrucción y conversión a un objeto vacío (`{}`).

**Síntoma:**
- Los pedidos se creaban en Firestore con el campo `createdAt: {}`.
- El frontend no podía procesar este objeto vacío, mostrando errores como "Invalid Date" o "Fecha no disponible".

**Solución:**
La función de limpieza **debe** identificar explícitamente estos tipos de datos especiales y devolverlos sin modificarlos.

**Implementación Correcta (`backend/pedidos.js`):**
```javascript
// Helper function to remove undefined values from an object
const removeUndefined = (obj) => {
  // Guardia para tipos de datos especiales: si es uno de ellos, devolverlo intacto.
  if (obj instanceof admin.firestore.FieldValue || obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
  }

  if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = removeUndefined(value);
      }
      return acc;
    }, {});
  }
  
  return obj;
};
```
**Regla de Oro para Nexus:** Antes de aplicar cualquier transformación genérica a un objeto que se enviará a Firestore, asegúrate de que respeta los tipos de datos `FieldValue` y `Date`.

---

### 3.10. Error al usar `serverTimestamp` dentro de `arrayUnion`

**Lección Aprendida:** Firestore no permite el uso de valores no determinísticos como `FieldValue.serverTimestamp()` dentro de operaciones de `arrayUnion`, ya que no puede garantizar la unicidad del elemento a añadir.

-   **Problema:** La aplicación fallaba con un error 500 al intentar actualizar el estado de un pedido.
-   **Causa Raíz:** El código intentaba añadir un objeto que contenía `FieldValue.serverTimestamp()` a un campo de array usando `FieldValue.arrayUnion()`.
-   **Error de Firestore:** `Element at index 0 is not a valid array element. FieldValue.serverTimestamp() cannot be used inside of an array`.
-   **Solución Definitiva:** Para campos de fecha dentro de arrays (como un historial de estados), se debe usar un objeto de fecha estándar de JavaScript: `new Date()`. Este valor es determinístico y compatible con `arrayUnion`.

    ```javascript
    // CÓDIGO INCORRECTO
    const historyEntry = {
      status: 'Nuevo',
      timestamp: admin.firestore.FieldValue.serverTimestamp() // ❌ PROHIBIDO
    };
    await docRef.update({
      history: admin.firestore.FieldValue.arrayUnion(historyEntry)
    });

    // CÓDIGO CORRECTO
    const historyEntry = {
      status: 'Nuevo',
      timestamp: new Date() // ✅ CORRECTO
    };
    await docRef.update({
      history: admin.firestore.FieldValue.arrayUnion(historyEntry)
    });
    ```

---

## 4. Comando de Ayuda Rápida

Si estás atascado, ejecuta esta checklist:

```bash
# 1. Verificar que ambos servicios corren
curl http://localhost:9002  # Frontend Next.js
curl http://localhost:8080  # Backend Express

# 2. Verificar autenticación
# En DevTools Console:
firebase.auth().currentUser.getIdToken().then(console.log)

# 3. Verificar Storage
node check-storage.js

# 4. Ejecutar tests
npm test

# 5. Limpiar caché
rm -rf .next
rm -rf backend/node_modules
npm install && cd backend && npm install
```

---

## 5. Tarjetas de Identidad de Agentes

<!--
### 🏗️ Atlas - Arquitecto de Soluciones Full-Stack
```
┌─────────────────────────────────────────────┐
│  ATLAS                                      │
│  Arquitecto de Soluciones Full-Stack       │
├─────────────────────────────────────────────┤
│  🎯 Especialidad:                           │
│     • Planificación estratégica             │
│     • Diseño de arquitectura                │
│     • Coordinación de equipos               │
│                                             │
│  📞 Invócame cuando:                        │
│     • Inicies un proyecto nuevo             │
│     • Necesites decidir la arquitectura    │
│     • Haya conflictos entre componentes    │
│                                             │
│  🛠️ Herramientas:                           │
│     • Diagrams as code                      │
│     • System design                         │
│     • Trade-off analysis                    │
└─────────────────────────────────────────────┘
```
-->

### 🔥 Pyra - Arquitecto de Firebase
```
┌─────────────────────────────────────────────┐
│  PYRA                                       │
│  Arquitecto de Firebase                     │
├─────────────────────────────────────────────┤
│  🎯 Especialidad:                           │
│     • Firestore schema design               │
│     • Security Rules                        │
│     • Firebase Auth & Storage               │
│                                             │
│  📞 Invócame cuando:                        │
│     • Diseñes estructura de datos          │
│     • Configures permisos                  │
│     • Optimices consultas                  │
│                                             │
│  🛠️ Herramientas:                           │
│     • Firebase Console                      │
│     • Firestore Rules Language              │
│     • Firebase Admin SDK                    │
└─────────────────────────────────────────────┘
```

### 🎨 Aether - Especialista en UI/UX
```
┌─────────────────────────────────────────────┐
│  AETHER                                     │
│  Especialista en UI/UX                      │
├─────────────────────────────────────────────┤
│  🎯 Especialidad:                           │
│     • Tailwind CSS                          │
│     • shadcn/ui components                  │
│     • Diseño responsive y mobile-first      │
│     • E-commerce y food delivery            │
│                                             │
│  📞 Invócame cuando:                        │
│     • Crees componentes visuales           │
│     • Necesites diseño responsive          │
│     • Implementes temas o estilos          │
│                                             │
│  🛠️ Herramientas:                           │
│     • Tailwind classes                      │
│     • lucide-react icons                    │
│     • CSS-in-JS patterns                    │
└─────────────────────────────────────────────┘
```

### ⚡ Nexus - Ingeniero de Backend
```
┌─────────────────────────────────────────────┐
│  NEXUS                                      │
│  Ingeniero de Backend                       │
├─────────────────────────────────────────────┤
│  🎯 Especialidad:                           │
│     • Express.js APIs                       │
│     • Firebase Admin SDK                    │
│     • Genkit AI integration                 │
│                                             │
│  📞 Invócame cuando:                        │
│     • Implementes endpoints REST           │
│     • Trabajes con autenticación           │
│     • Integres servicios externos          │
│                                             │
│  🛠️ Herramientas:                           │
│     • Express.js + middleware               │
│     • multer (file uploads)                 │
│     • Supertest (testing)                   │
│                                             │
│  ⚠️ Regla de Oro:                           │
│     NUNCA dejar endpoints vacíos con        │
│     comentarios placeholder                 │
└─────────────────────────────────────────────┘
```

### 🛡️ Sentinel - Coordinador del Proyecto y Depurador Senior
```
┌─────────────────────────────────────────────┐
│  SENTINEL                                   │
│  Coordinador del Proyecto & Depurador      │
├─────────────────────────────────────────────┤
│  🎯 ROL DUAL:                               │
│     🧭 COORDINADOR:                         │
│        • Orquestación de agentes            │
│        • Integración full-stack             │
│        • Decisiones arquitectónicas         │
│        • Gestión de calidad                 │
│     🔍 DEPURADOR:                           │
│        • Root cause analysis                │
│        • Debugging full-stack               │
│        • Configuration troubleshooting      │
│                                             │
│  📞 Invócame cuando:                        │
│     🧭 COMO COORDINADOR:                    │
│        • Features full-stack complejas     │
│        • Múltiples agentes involucrados    │
│        • Conflictos entre componentes      │
│        • Decisiones arquitectónicas        │
│        • Refactorings grandes              │
│     🔍 COMO DEPURADOR:                      │
│        • Bugs persistentes o complejos     │
│        • Errores sin sentido               │
│        • Tests fallidos > 1 hora           │
│        • Cascading failures                │
│                                             │
│  🛠️ Herramientas:                           │
│     • Framework de decisión de routing     │
│     • Protocolo de coordinación 5 pasos    │
│     • Checklist de integración             │
│     • Chrome DevTools                       │
│     • Backend logs analysis                 │
│     • Scripts de diagnóstico                │
│                                             │
│  💡 Protocolo de Coordinación:              │
│     1. Análisis de requerimientos           │
│     2. Routing de agentes (tabla decisión)  │
│     3. Delegación clara (5 criterios)       │
│     4. Verificación de integración          │
│     5. Escalamiento si hay problemas        │
│                                             │
│  💡 Metodología de Debugging:               │
│     1. Leer error completo                  │
│     2. Verificar configuración              │
│     3. Aislar con tests                     │
│     4. Solución más simple primero          │
│     5. Verificar que funciona               │
│                                             │
│  📊 Métricas de Éxito:                      │
│     • ✅ Features < 1 día                   │
│     • ✅ 0 bugs críticos en prod            │
│     • ✅ 100% cobertura (Jest+Playwright)   │
│     • ✅ Claridad en delegación             │
│     • ✅ Integración sin fricciones         │
│                                             │
│  🚨 Señales de Alerta:                      │
│     • ⚠️ Agentes bloqueados > 2 intentos    │
│     • ⚠️ Features sin tests                 │
│     • ⚠️ Bugs que reaparecen                │
│     • ⚠️ Conflictos entre agentes           │
└─────────────────────────────────────────────┘
```

### 🧪 Vanguard - Agente de Pruebas y Calidad
```
┌─────────────────────────────────────────────┐
│  VANGUARD                                   │
│  Agente de Pruebas y Calidad (QA Master)    │
├─────────────────────────────────────────────┤
│  🎯 Especialidad:                           │
│     • Jest + React Testing Library (Unit/Integration) │
│     • Playwright (E2E Browser Testing)      │
│     • Supertest (backend testing)           │
│     • Mock strategies avanzadas             │
│     • Diagnóstico de tests fallidos         │
│     • Configuración de entornos de testing  │
│                                             │
│  📞 Invócame cuando:                        │
│     • Implementes nuevas features          │
│     • Tests fallen y no sepas por qué      │
│     • Necesites mocks de Firebase          │
│     • Configures jest.config.js            │
│     • Quieras prevenir regresiones         │
│     • Necesites tests E2E de flujos UI     │
│                                             │
│  🛠️ Herramientas:                           │
│     • Jest (unit + integration)             │
│     • React Testing Library                 │
│     • Playwright (E2E browser testing)      │
│     • Supertest (API testing)               │
│     • Proxy mocks (lucide-react)            │
│     • Firebase Admin mocks                  │
│                                             │
│  💡 Superpoderes:                           │
│     • Mock genérico con Proxy               │
│     • Mock de Firebase Storage completo     │
│     • Diagnóstico sistemático 8 pasos       │
│     • Manejo de elementos duplicados        │
│     • Configuración de moduleNameMapper     │
│     • Tests E2E con navegadores reales      │
│                                             │
│  🔄 PROTOCOLO OBLIGATORIO (8 pasos):        │
│     1. ▶️ Read: Leer código a testear       │
│     2. 📖 Read: Leer tests existentes       │
│     3. 🔍 Identificar: Todas las deps       │
│     4. ⚙️ Ejecutar: npm test                │
│     5. 🔬 Analizar: Stack trace completo    │
│     6. ✏️ Implementar: Solución mínima      │
│     7. ✅ Verificar: npm test de nuevo      │
│     8. 📊 Reportar: Resumen tests           │
│                                             │
│  ⚠️ Reglas de Oro:                          │
│     1. SIEMPRE leer antes de sugerir        │
│     2. NUNCA asumir estructura              │
│     3. NUNCA inventar mocks sin ver código  │
│     4. Stack trace COMPLETO, no solo título │
│     5. Test ANTES de feature completa       │
│     6. getAllByText() para duplicados       │
│     7. getByRole() > getByTestId()          │
│     8. Usar la herramienta correcta para el trabajo (Jest/Playwright) │
│                                             │
│  📊 Métricas de Éxito:                      │
│     • ✅ Jest: 0 tests fallidos             │
│     • ✅ Jest: Cobertura > 80%              │
│     • ✅ Jest: < 5 seg por suite            │
│     • ✅ Playwright: E2E pasan 3 browsers   │
│     • ✅ Tests fáciles de mantener          │
│     • ✅ 3 ejemplos documentados            │
└─────────────────────────────────────────────┘
```

### ☁️ Aire - Especialista en DevOps
```
┌─────────────────────────────────────────────┐
│  AIRE                                       │
│  Especialista en DevOps                     │
├─────────────────────────────────────────────┤
│  🎯 Especialidad:                           │
│     • Firebase Console setup                │
│     • Google Cloud infrastructure           │
│     • CI/CD pipelines                       │
│                                             │
│  📞 Invócame cuando:                        │
│     • Configures servicios Firebase        │
│     • Despliegues a producción             │
│     • Gestiones variables de entorno       │
│                                             │
│  🛠️ Herramientas:                           │
│     • Firebase Console                      │
│     • gcloud CLI                            │
│     • Environment configs                   │
│                                             │
│  💡 Mantra:                                 │
│     "Automatiza todo, verifica el nombre    │
│      exacto del bucket, y deshabilita       │
│      App Check en desarrollo"               │
└─────────────────────────────────────────────┘
```

---

## 6. Contacto y Contribución

Este documento debe evolucionar con el proyecto. Cuando encuentres un nuevo patrón o solución, documéntalo aquí para futuros agentes y desarrolladores.

**Última actualización**: Enero 2025
**Mantenido por**: Equipo Al Chile FB
**Para reportar issues o sugerencias**: Ver documentación del proyecto

---

## 7. Changelog

### Enero 2025 - Versión 3.0 de Sentinel (Coordinador del Proyecto)
- 🚀 **MAJOR UPDATE**: Sentinel ahora tiene ROL DUAL como Coordinador del Proyecto + Depurador Senior
- 🧭 **Protocolo de Coordinación**: Framework de 5 pasos para gestionar agentes
  1. Análisis de requerimientos (¿Qué se necesita?)
  2. Routing de agentes con tabla de decisión (¿Quién debe hacerlo?)
  3. Delegación clara con 5 criterios (Contexto, Alcance, Criterios, Dependencias, Testing)
  4. Verificación de integración (Checklist full-stack)
  5. Escalamiento de problemas (¿Cuándo intervenir como depurador?)
- 📊 **Decisiones Arquitectónicas**: 4 principios técnicos documentados (Seguridad, Separación, DX, Anti-sobre-ingeniería)
- 🎯 **3 Escenarios Completos**:
  - Feature full-stack (Sistema de promociones)
  - Bug crítico en producción (Upload de imágenes)
  - Refactoring grande (Context API → Zustand)
- 🛠️ **Tabla de Routing**: 9 tipos de tareas con agente principal/secundario y razón
- 📝 **Delegación Efectiva**: Template de cómo asignar trabajo a otros agentes
- ✅ **Métricas de Éxito**: 7 indicadores para coordinación exitosa
- ⚠️ **Señales de Alerta**: 6 situaciones que requieren intervención de Sentinel
- 🔄 **Integración con el equipo**: Sentinel ahora aparece primero en la tabla de agentes
- 📋 **Tarjeta ASCII actualizada**: Refleja rol dual con protocolo de coordinación visible
- 💡 **Filosofía**: Sentinel = Líder técnico que orquesta + Experto que resuelve

### Enero 2025 - Versión 2.2 de Vanguard (Tests E2E Funcionando al 100%)
- 🎉 **TESTS E2E COMPLETADOS**: 6/6 tests E2E pasando en Chromium (100%)
- 🔐 **Autenticación E2E solucionada**: Login por test en lugar de storageState
- 🔧 **Configuración probada en producción**: playwright.config.ts con solo Chromium habilitado
- 📝 **Lecciones aprendidas documentadas**:
  - ✅ IndexedDB no se captura con storageState (problema de Firebase Auth)
  - ✅ Login debe hacerse en cada test con función helper `loginAsTestUser()`
  - ✅ Firefox/WebKit requieren investigación adicional (login no funciona)
  - ✅ Delays necesarios (500ms) entre interacciones con Radix UI
  - ✅ Selección específica de datos de prueba ("logiav1-2" tiene departamentos)
  - ✅ Tiempo total: 25.7 segundos para 6 tests completos
- 📊 **Estado actual**:
  - `e2e/sale-product-form.spec.ts`: 6/6 tests ✅ en Chromium
  - Firefox: Deshabilitado (problema con Firebase Auth redirect)
  - WebKit: Deshabilitado (dependencias del sistema en WSL)
- 🎯 **Cobertura 100%**: Jest (90%) + Playwright (10%) = Testing completo

### Enero 2025 - Versión 2.1 de Vanguard (Estrategia 90/10)
- 🎯 **ESTRATEGIA DE TESTING COMPLETA**: Documentación de enfoque 90% Jest + 10% Playwright
- ✅ **Playwright E2E**: Tests end-to-end para interacciones complejas de UI
- ✅ **Tabla comparativa**: Cuándo usar Jest vs Playwright según el escenario
- ✅ **Tests de integración**: Nuevos tests para SaleProductForm sin depender de Radix UI
- ✅ **Configuración Playwright**: playwright.config.ts con multi-browser support
- ✅ **Scripts E2E**: Comandos para ejecutar tests con --ui, --headed, etc.
- ✅ **Archivos creados**:
  - `src/components/control/sale-product-form.integration.test.tsx` (7 tests ✅)
  - `e2e/sale-product-form.spec.ts` (6 tests E2E)
  - `playwright.config.ts`
- ✅ **Documentación AGENTS.md**: Sección completa sobre cuándo usar cada tipo de test
- ✅ **Tarjeta Vanguard actualizada**: Incluye Playwright como herramienta

### Enero 2025 - Versión 2.0 de Vanguard
- 🚀 **MAJOR UPDATE**: Reescritura completa del agente Vanguard para Gemini
- ✅ **PROTOCOLO OBLIGATORIO**: 8 pasos que DEBE seguir siempre (con emojis visuales)
- ✅ **Preguntas de Validación**: Checklist de 8 preguntas antes de proponer solución
- ✅ **3 Ejemplos Completos**: Mock Firebase Storage, elementos duplicados, endpoint nuevo
- ✅ **3 Plantillas Copy/Paste**: Mock completo, test básico, test Storage
- ✅ **Por qué funciona**: Explicación detallada después de cada ejemplo
- ✅ **Comando de verificación**: npm test con --testNamePattern incluido
- ✅ **NUNCA permitido**: Lista explícita de 5 cosas prohibidas
- ✅ **Tarjeta mejorada**: Protocolo de 8 pasos visible en la tarjeta ASCII

### Enero 2025 - Versión 1.0
- ✅ **Vanguard creado**: Documentación inicial de testing con Jest y React Testing Library
- ✅ **Mock genérico de lucide-react**: Solución definitiva con Proxy para iconos
- ✅ **Diagnóstico de tests**: Proceso sistemático de 5 pasos para tests fallidos
- ✅ **Tabla de errores comunes**: Tests incluidos con soluciones rápidas
- ✅ **Configuración Jest**: moduleNameMapper completo con todos los alias
- ✅ **Métricas de testing**: Criterios de éxito claros (0 failed, >80% coverage)