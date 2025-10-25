# AGENTS.md

Este archivo proporciona directrices para que los agentes de IA y otros sistemas automatizados interactúen con este proyecto.

---

## ⚠️ CONVENCIÓN OBLIGATORIA DE TRABAJO

**TODOS LOS AGENTES DEBEN SEGUIR ESTE PROTOCOLO SIN EXCEPCIÓN**

### 📋 Protocolo de Trabajo con el Usuario

Cuando el usuario presenta una tarea o solicitud, el agente DEBE seguir este flujo obligatorio:

#### **PASO 1: Recepción de la Tarea**
- El usuario describe la tarea o feature a implementar
- El agente confirma que entiende la solicitud general

#### **PASO 2: Análisis y Documentación (OBLIGATORIO)**
- El agente DEBE documentarse primero:
  - ✅ Leer documentación relacionada en `docs/`
  - ✅ Explorar código existente relevante
  - ✅ Identificar patrones y convenciones del proyecto
  - ✅ Revisar módulos similares ya implementados

#### **PASO 3: Preguntas con Opciones (OBLIGATORIO)**
El agente DEBE hacer preguntas al usuario usando el formato de **opciones múltiples (A, B, C, D, etc.)** para clarificar:

**Tipos de preguntas requeridas:**
1. **Arquitectura y Ubicación**
   - ¿Dónde debe ir el módulo/feature?
   - ¿Qué estructura debe seguir?

2. **Lógica de Negocio**
   - ¿Cómo deben funcionar las validaciones?
   - ¿Qué flujos de trabajo son necesarios?
   - ¿Qué permisos se requieren?

3. **UI/UX y Presentación**
   - ¿Qué información mostrar?
   - ¿Qué filtros/búsquedas necesita?
   - ¿Cómo debe verse la interfaz?

4. **Datos y Campos**
   - ¿Qué campos son obligatorios/opcionales?
   - ¿Qué validaciones aplicar?
   - ¿Qué relaciones entre entidades?

**Formato de Preguntas:**
```
**Pregunta 1: [Título corto]**

[Descripción detallada de la pregunta]

**A)** [Opción A con explicación]
**B)** [Opción B con explicación]
**C)** [Opción C con explicación]
**D)** [Opción D con explicación] (si aplica)

---

**Pregunta 2: [Título corto]**
...
```

#### **PASO 4: Implementación**
- Solo después de recibir respuestas del usuario
- Seguir las decisiones acordadas
- Usar los patrones identificados en PASO 2
- Mantener consistencia con el código existente

#### **PASO 5: Validación**
- Ejecutar tests
- Verificar funcionalidad
- Confirmar con el usuario antes de continuar

---

### ❌ LO QUE NO ESTÁ PERMITIDO

- ❌ **NO** implementar directamente sin hacer preguntas
- ❌ **NO** asumir decisiones de negocio sin confirmación
- ❌ **NO** saltarse la fase de documentación
- ❌ **NO** hacer preguntas abiertas sin opciones

---

### ✅ EJEMPLO DE APLICACIÓN CORRECTA

**Usuario**: "Necesito crear un módulo de gastos donde se pueda registrar gastos con proveedores y métodos de pago"

**Agente (CORRECTO)**:
```
Entendido, voy a crear el módulo de gastos. Primero déjame documentarme sobre la estructura existente...

[Explora código, lee documentación, revisa módulos similares]

Perfecto, ya entiendo la estructura. Ahora necesito hacerte algunas preguntas sobre la lógica del módulo:

**Pregunta 1: ¿Dónde debe ubicarse el módulo de gastos?**

**A)** `/control/finanzas/gastos` - Junto con proveedores en la sección de finanzas
**B)** `/control/catalogo/gastos` - En la sección de catálogos
**C)** `/control/gastos` - Como módulo principal independiente

**Pregunta 2: ¿Los gastos deben tener un flujo de aprobación?**

**A)** Sin workflow, registrado = aprobado automáticamente
**B)** Workflow simple: Pendiente → Aprobado/Rechazado
**C)** Workflow completo: Borrador → Pendiente → Aprobado/Rechazado → Pagado

[... más preguntas con opciones ...]
```

**Agente (INCORRECTO - NO HACER ESTO)**:
```
❌ "Voy a crear el módulo de gastos en /control/gastos con los campos básicos"
❌ "¿Cómo quieres que funcione el módulo?" (pregunta muy abierta)
❌ Empezar a implementar sin preguntar
```

---

### 🎯 BENEFICIOS DE ESTE PROTOCOLO

1. **Claridad**: Opciones claras reducen ambigüedad
2. **Eficiencia**: Menos idas y vueltas
3. **Calidad**: Implementación alineada con expectativas
4. **Documentación**: Las decisiones quedan registradas
5. **Aprendizaje**: El agente aprende los patrones del proyecto

---

### 📝 REGISTRO DE DECISIONES

Después de recibir respuestas, el agente DEBE resumir las decisiones antes de implementar:

```
## RESUMEN DE DECISIONES

**Ubicación**: A) /control/finanzas/gastos
**Workflow**: B) Pendiente → Aprobado/Rechazado
**Campos obligatorios**: Proveedor, Monto, Fecha, Método de pago, Comprobante
**Permisos**: Admin crea, Super_admin aprueba

¿Confirmas que proceda con esta configuración?
```

---

## 0. Contexto del Proyecto

**Al Chile FB** es una aplicación web full-stack para gestión de catálogos y pedidos con las siguientes características técnicas:

### Stack Tecnológico
- **Frontend**: Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js (puerto 8080) con proxy de Next.js (puerto 9002)
- **Firebase**: Authentication, Firestore, Storage
- **Testing**: Jest, React Testing Library, Supertest (**100% de cobertura ✅**)
- **AI**: Genkit para integración con modelos de IA

### Arquitectura
- Frontend/Backend separados pero conectados via proxy (`/api/*` → `http://localhost:8080/api/*`)
- Autenticación con Firebase Auth y custom claims (`super_admin`, `admin`, `repartidor`)
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
├── docs/                  # 📚 Documentación completa organizada
│   └── agents/           # Documentación detallada de cada agente
└── AGENTS.md             # Este archivo
```

### Documentación
**📚 Toda la documentación del proyecto está organizada en [`docs/`](./docs/README.md)**

---

## 1. Directrices para Agentes de Rastreo Web (Crawlers)

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

## 2. Equipo de Agentes Especializados

> **📖 IMPORTANTE**: Cada agente debe leer su documentación completa en `docs/agents/[nombre-agente]/README.md` antes de actuar.

| Agente | Puesto | Especialidad | Documentación |
|--------|--------|--------------|---------------|
| **Sentinel** | Coordinador del Proyecto & Depurador Senior | Orquestación, debugging full-stack, decisiones arquitectónicas | [`docs/agents/sentinel/`](./docs/agents/sentinel/README.md) |
| **Pyra** | Arquitecto de Firebase | Firestore, Authentication, Storage, Security Rules | [`docs/agents/pyra/`](./docs/agents/pyra/README.md) |
| **Aether** | Especialista en UI/UX | Tailwind CSS, shadcn/ui, diseño responsive | [`docs/agents/aether/`](./docs/agents/aether/README.md) |
| **Nexus** | Ingeniero de Backend | Express.js, Firebase Admin SDK, APIs REST | [`docs/agents/nexus/`](./docs/agents/nexus/README.md) |
| **Vanguard** | Agente de Pruebas y Calidad | Testing, Jest, React Testing Library, Supertest, QA | [`docs/agents/vanguard/`](./docs/agents/vanguard/README.md) |
| **Aire** | Especialista en DevOps | Infraestructura, despliegues, Firebase Console | [`docs/agents/aire/`](./docs/agents/aire/README.md) |
| **Raptoure** | Experto en Seguridad | Autenticación, autorización, Security Rules, vulnerabilidades | [`docs/agents/raptoure/`](./docs/agents/raptoure/README.md) |

---

### 🎯 Tarjetas de Agentes

#### Sentinel - Coordinador del Proyecto

**Rol**: Líder técnico y depurador senior

**Skills**:
- 🎯 Orquestación de agentes y decisiones arquitectónicas
- 🔍 Debugging full-stack (Frontend + Backend + Firebase)
- 📊 Análisis de logs y trazabilidad de errores
- 🏗️ Diseño de arquitectura y mejores prácticas

**Cuándo Llamar a Sentinel**:
- Errores complejos que abarcan múltiples capas (frontend, backend, Firebase)
- Decisiones arquitectónicas importantes
- Conflictos entre módulos o sistemas
- Planificación de features grandes

**Documentación Completa**: [`docs/agents/sentinel/README.md`](./docs/agents/sentinel/README.md)

---

#### Pyra - Arquitecto de Firebase

**Rol**: Experto en Firebase y base de datos

**Skills**:
- 🔥 Firestore (diseño de esquemas, queries, índices)
- 🔐 Firebase Authentication (custom claims, roles)
- 🗄️ Firebase Storage (archivos, imágenes, signed URLs)
- 🛡️ Security Rules (Firestore y Storage)

**Cuándo Llamar a Pyra**:
- Diseño o modificación de esquemas de Firestore
- Problemas de autenticación o autorización
- Optimización de queries o índices
- Configuración de reglas de seguridad

**Documentación Completa**: [`docs/agents/pyra/README.md`](./docs/agents/pyra/README.md)

---

#### Aether - Especialista en UI/UX

**Rol**: Experto en interfaz de usuario y experiencia

**Skills**:
- 🎨 Tailwind CSS (utilidades, responsive, dark mode)
- 🧩 shadcn/ui (componentes, personalización)
- 📱 Diseño responsive y mobile-first
- ♿ Accesibilidad (a11y, ARIA, semántica)

**Cuándo Llamar a Aether**:
- Creación de nuevas vistas o componentes
- Mejoras de diseño y UX
- Problemas de responsive o estilos
- Implementación de componentes shadcn/ui

**Documentación Completa**: [`docs/agents/aether/README.md`](./docs/agents/aether/README.md)

---

#### Nexus - Ingeniero de Backend

**Rol**: Experto en API y lógica de servidor

**Skills**:
- ⚡ Express.js (rutas, middleware, error handling)
- 🔧 Firebase Admin SDK (Firestore, Auth, Storage)
- 🌐 APIs REST (diseño, validación, seguridad)
- 🔒 Autenticación y autorización server-side

**Cuándo Llamar a Nexus**:
- Creación o modificación de endpoints API
- Lógica de negocio en el servidor
- Integración con servicios externos
- Problemas de performance en el backend

**Documentación Completa**: [`docs/agents/nexus/README.md`](./docs/agents/nexus/README.md)

---

#### Vanguard - Agente de Pruebas y Calidad

**Rol**: Garantizar calidad y cobertura de tests

**Skills**:
- ✅ Jest (unit tests, integration tests, mocks)
- 🧪 React Testing Library (componentes, hooks)
- 🎭 Supertest (API testing)
- 📊 Análisis de cobertura y calidad

**Cuándo Llamar a Vanguard**:
- Escribir o arreglar tests
- Aumentar cobertura de código
- Debugging de tests fallidos
- Estrategia de testing para nuevas features

**Documentación Completa**: [`docs/agents/vanguard/README.md`](./docs/agents/vanguard/README.md)

---

#### Aire - Especialista en DevOps

**Rol**: Infraestructura y despliegues

**Skills**:
- ☁️ Firebase App Hosting (deploys, configuración)
- 🔧 Firebase Console (administración de recursos)
- 📦 Build y optimización (Next.js, producción)
- 🔍 Monitoring y logs

**Cuándo Llamar a Aire**:
- Problemas de despliegue
- Configuración de entornos
- Optimización de builds
- Gestión de recursos en Firebase Console

**Documentación Completa**: [`docs/agents/aire/README.md`](./docs/agents/aire/README.md)

---

#### Raptoure - Experto en Seguridad

**Rol**: Especialista en seguridad y protección de aplicaciones

**Skills**:
- 🔐 Autenticación robusta (Firebase Admin SDK, Session Cookies)
- 🛡️ Autorización y RBAC (Custom Claims, Security Rules)
- 🚪 Protección de rutas (Middleware, redirects)
- 🔒 Prevención de vulnerabilidades (XSS, Rate Limiting, validaciones)

**Cuándo Llamar a Raptoure**:
- Implementar o auditar autenticación/autorización
- Configurar Security Rules de Firestore/Storage
- Proteger rutas sensibles con middleware
- Análisis de vulnerabilidades y hardening

**Documentación Completa**: [`docs/agents/raptoure/README.md`](./docs/agents/raptoure/README.md)

---

## 3. Protocolo de Trabajo

### Antes de Actuar
1. **Leer documentación específica**: Cada agente DEBE leer su `docs/agents/[nombre]/README.md`
2. **Entender el contexto**: Revisar documentación relacionada en `docs/`
3. **Verificar tests**: Ejecutar `npm test` antes de modificar código

### Durante el Trabajo
1. **Seguir las directrices del agente** definidas en su documentación
2. **Mantener la cobertura de tests al 100%**
3. **Documentar cambios significativos** en la carpeta `docs/` apropiada

### Después de Completar
1. **Ejecutar tests**: `npm test` debe pasar al 100%
2. **Actualizar documentación** si es necesario
3. **Comunicar a Sentinel** si hay decisiones arquitectónicas
4. **Avisar sobre limpieza de contexto** (ver sección abajo)

### 🧹 Gestión de Contexto y Tokens

**Los agentes deben avisar cuándo es momento de limpiar el contexto para optimizar tokens:**

#### ✅ Momentos para limpiar contexto (usar `/clear` o reiniciar chat):

1. **Después de completar una tarea mayor completa**:
   - ✅ Módulo implementado y testeado al 100%
   - ✅ Feature completa con documentación actualizada
   - ✅ Bug complejo resuelto y verificado
   - ✅ Refactoring grande completado

2. **Después de cambiar de contexto/agente**:
   - ✅ Cambio de Aether (UI) → Nexus (Backend)
   - ✅ Cambio de Vanguard (Tests) → Pyra (Firebase)
   - ✅ Fin de sesión de debugging con Sentinel

3. **Cuando el contexto acumulado es irrelevante**:
   - ✅ Después de exploración/investigación que ya no se necesita
   - ✅ Después de múltiples intentos fallidos (empezar fresco)
   - ✅ Cuando se cambia completamente de módulo/feature

4. **Indicadores de contexto pesado**:
   - ⚠️ Token usage > 100,000 (50% del límite)
   - ⚠️ Múltiples archivos grandes leídos
   - ⚠️ Conversación con más de 30 intercambios

#### 🔄 **Formato de aviso del agente**:

Cuando un agente complete una tarea mayor, debe incluir:

```
---
✅ [NOMBRE_AGENTE] Tarea completada: [descripción breve]

🧹 RECOMENDACIÓN: Es buen momento para limpiar contexto
   Razón: [módulo completo / cambio de agente / etc.]

   Comandos:
   - Gemini: Reiniciar chat
   - Claude: /clear o nueva conversación

📝 Estado: [tests pasando / documentación actualizada / etc.]
---
```

#### 💾 **Lo que NO se pierde al limpiar contexto**:
- ✅ Código escrito (está en archivos)
- ✅ Tests pasando (están en el repo)
- ✅ Documentación (está en `docs/`)
- ✅ AGENTS.md (se re-lee en nueva sesión)

#### 📌 **Lo que SÍ se conserva como contexto esencial**:
- Los agentes siempre leerán AGENTS.md y su `docs/agents/[nombre]/README.md`
- El estado del proyecto (tests, git status) está en el sistema
- La documentación sirve como memoria permanente

---

## 4. Mejores Prácticas

### General
- ✅ **Tests primero**: TDD cuando sea posible
- ✅ **Documentar**: Cambios importantes van a `docs/`
- ✅ **Simplicidad**: Código simple > código complejo
- ✅ **TypeScript**: Tipar todo correctamente

### Firebase
- ✅ **Soft deletes**: Usar `deleted: false` en queries
- ✅ **Índices**: Crear índices necesarios
- ✅ **Security Rules**: Principio de mínimo privilegio
- ✅ **Batching**: Usar batches para múltiples operaciones

### Testing
- ✅ **100% cobertura**: Mantener tests pasando
- ✅ **Mocks**: Mockear servicios externos
- ✅ **Nombres descriptivos**: Tests deben ser auto-explicativos
- ✅ **Aislamiento**: Tests independientes entre sí

---

## 5. Estado del Proyecto

### Tests - 100% de Cobertura ✅

| Categoría | Estado | Tests | Cobertura |
|-----------|--------|-------|-----------|
| **Frontend** | ✅ | 247/247 | 100% |
| **Backend** | ✅ | 232/232 | 100% |
| **Total** | ✅ | **479/479** | **100%** |

**Documentación de Testing**: [`docs/04-testing/`](./docs/04-testing/)

---

## 6. Enlaces Rápidos

### Documentación Principal
- 📚 [Índice de Documentación](./docs/README.md)
- 🏗️ [Arquitectura](./docs/02-architecture/blueprint.md)
- 🧪 [Guía de Testing](./docs/04-testing/testing-guide.md)
- 🔒 [Auditoría de Seguridad](./docs/05-security/security-audit-report.md)

### Agentes
- 🎯 [Sentinel - Coordinador](./docs/agents/sentinel/README.md)
- 🔥 [Pyra - Firebase](./docs/agents/pyra/README.md)
- 🎨 [Aether - UI/UX](./docs/agents/aether/README.md)
- ⚡ [Nexus - Backend](./docs/agents/nexus/README.md)
- ✅ [Vanguard - Testing](./docs/agents/vanguard/README.md)
- ☁️ [Aire - DevOps](./docs/agents/aire/README.md)
- 🔒 [Raptoure - Seguridad](./docs/agents/raptoure/README.md)

---

**Mantenido por**: Equipo de Desarrollo Al Chile FB
**Última actualización**: 2025-10-25
**Versión**: 4.3
