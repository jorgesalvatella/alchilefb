# 📚 Documentación del Proyecto Al Chile FB

> Sistema de e-commerce para restaurante con gestión de pedidos, promociones y rastreo de repartidores en tiempo real.

**Última actualización:** 2025-10-25
**Versión:** 4.0
**Cobertura de Tests:** 100% ✅

---

## 🗂️ Índice de Documentación

### 📖 [01. Getting Started](./01-getting-started/)

Guías para comenzar con el proyecto:

- [Google Maps Setup](./01-getting-started/google-maps-setup.md) - Configuración de Google Maps API
- [Google Maps Checklist](./01-getting-started/google-maps-checklist.md) - Checklist de implementación

### 🏗️ [02. Architecture](./02-architecture/)

Arquitectura y diseño del sistema:

- [Blueprint](./02-architecture/blueprint.md) - Arquitectura general del proyecto
- [Database Context](./02-architecture/database-context.md) - Esquema y contexto de base de datos
- [Auth Strategy](./02-architecture/auth-strategy.md) - Estrategia de autenticación y autorización

### 🧩 [03. Modules](./03-modules/)

Documentación de módulos funcionales:

#### 🛒 [Checkout](./03-modules/checkout/)
- [Checkout Module](./03-modules/checkout/checkout-module.md) - Módulo de pago y finalización de compra

#### 📦 [Products](./03-modules/products/)
- [Product Plan](./03-modules/products/plan-productos.md) - Plan de gestión de productos
- [Product Customization](./03-modules/products/product-customization-module.md) - Personalización de productos
- [Signed URL Module](./03-modules/products/signed-url-module.md) - URLs firmadas para imágenes

#### 🎁 [Promotions](./03-modules/promotions/)
- [Promotions Module](./03-modules/promotions/promotions-module.md) - Sistema de promociones
- [Promotions Schema](./03-modules/promotions/promotions-schema.md) - Esquema de base de datos
- [Automatic Categories](./03-modules/promotions/categorias-automaticas-promociones.md) - Categorías automáticas
- [Packages Implementation](./03-modules/promotions/implementacion-paquetes-promociones.md) - Implementación de paquetes
- [Menu Integration](./03-modules/promotions/integracion-menu-publico-paquetes.md) - Integración con menú público
- [Fix Promotions Endpoint](./03-modules/promotions/fix-promotions-get-endpoint.md) - Corrección de endpoint

#### 🚚 [Tracking](./03-modules/tracking/)
- [Tracker Module Complete](./03-modules/tracking/TRACKER-MODULE-COMPLETE.md) - ✅ Módulo completado al 100%
- [Admin Tracking View](./03-modules/tracking/admin-tracking-view.md) - Vista de administrador
- [Driver Interface](./03-modules/tracking/driver-interface-module.md) - Interfaz de repartidor
- [Tracking Implementation](./03-modules/tracking/driver-tracking-implementation-summary.md) - Resumen de implementación
- [Tracking Schema](./03-modules/tracking/driver-tracking-schema.md) - Esquema de datos
- [Live Tracking](./03-modules/tracking/live-driver-tracking-module.md) - Rastreo en tiempo real

### 🧪 [04. Testing](./04-testing/)

Guías y registros de testing:

- [Testing Guide](./04-testing/testing-guide.md) - Guía general de testing
- [Frontend Tests](./04-testing/frontend-tests.md) - **✅ 280/280 tests pasando (100%)**
- [Backend Tests](./04-testing/backend-tests.md) - **✅ 232/232 tests pasando (100%)**
- [Pending Tests](./04-testing/tests-pendientes.md) - Tests pendientes (histórico)

### 🔒 [05. Security](./05-security/)

Auditorías y guías de seguridad:

- [Security Audit Report](./05-security/security-audit-report.md) - Reporte de auditoría general
- [Protected Routes](./05-security/protected-routes.md) - Rutas protegidas
- [Promotions Security Audit](./05-security/promotions-security-audit.md) - Auditoría de promociones

### 🛠️ [06. Development](./06-development/)

Recursos para desarrollo:

- [TODO](./06-development/TODO.md) - Lista de tareas pendientes
- [TODO Tests](./06-development/TODO-TEST.md) - Tests pendientes (histórico)
- [TODO Tests 2](./06-development/TODO-TESTS.md) - Tests pendientes (histórico)
- [CHANGELOG](./06-development/CHANGELOG.md) - Registro de cambios
- [Backend Work Plan](./06-development/backend-work-plan.md) - Plan de trabajo backend

### 📝 [07. Sessions](./07-sessions/)

Notas de sesiones de desarrollo:

- [Session 2025-01-18](./07-sessions/session-2025-01-18-packages-promotions-fixes.md) - Paquetes y promociones

### 🤖 [Agents](./agents/)

Documentación detallada de agentes de IA especializados:

> **Ver también**: [`/AGENTS.md`](../AGENTS.md) en la raíz para tarjetas rápidas de cada agente

- [Sentinel](./agents/sentinel/README.md) - Coordinador del Proyecto & Depurador Senior
- [Pyra](./agents/pyra/README.md) - Arquitecto de Firebase
- [Aether](./agents/aether/README.md) - Especialista en UI/UX
- [Nexus](./agents/nexus/README.md) - Ingeniero de Backend
- [Vanguard](./agents/vanguard/README.md) - Agente de Pruebas y Calidad
- [Aire](./agents/aire/README.md) - Especialista en DevOps
- [Raptoure](./agents/raptoure/README.md) - Experto en Seguridad

---

## 🎯 Estado del Proyecto

### ✅ Tests - 100% de Cobertura

| Categoría | Estado | Tests | Cobertura |
|-----------|--------|-------|-----------|
| **Frontend** | ✅ | 280/280 | 100% |
| **Backend** | ✅ | 232/232 | 100% |
| **Test Suites** | ✅ | 43/43 frontend, 12/12 backend | 100% |
| **Total** | ✅ | **512/512** | **100%** 🎉 |

### 🚀 Módulos Implementados

- ✅ Autenticación con Firebase (Email, Google)
- ✅ Gestión de Productos con personalización
- ✅ Sistema de Promociones y Paquetes
- ✅ Carrito de Compras
- ✅ Checkout y Pagos
- ✅ Gestión de Pedidos
- ✅ Panel de Control (Admin)
- ✅ **Rastreo de Repartidores en Tiempo Real**
- ✅ Interfaz de Repartidor
- ✅ **Actualización en Tiempo Real de Pedidos** 🆕 (2025-10-25)

### 📡 Características Especiales

- ⚡ **[Actualización en Tiempo Real](./REALTIME-UPDATES.md)** - Los clientes ven cambios de estado instantáneamente 🆕
- 📍 Rastreo de Repartidores en Vivo con Google Maps
- 🎁 Sistema de Promociones y Paquetes
- 🛒 Carrito con Personalización de Productos
- 🔐 Seguridad Multicapa (Firestore Rules + Code Validation)

### 🔧 Tecnologías

**Frontend:**
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Shadcn/ui

**Backend:**
- Node.js + Express
- Firebase (Auth, Firestore, Storage)
- Google Maps API

**Testing:**
- Jest
- React Testing Library
- Supertest

---

## 📌 Enlaces Rápidos

- **[⚡ Realtime Updates](./REALTIME-UPDATES.md)** - Actualización en tiempo real implementada 🆕
- [Testing Guide](./04-testing/testing-guide.md) - Si vas a escribir tests
- [Frontend Tests](./04-testing/frontend-tests.md) - Estado actual de tests frontend (280/280) ✅
- [Backend Tests](./04-testing/backend-tests.md) - Estado actual de tests backend (232/232) ✅
- [Tracker Module](./03-modules/tracking/TRACKER-MODULE-COMPLETE.md) - Módulo de rastreo completado
- [Security Audit](./05-security/security-audit-report.md) - Auditoría de seguridad

---

## 🤝 Contribuir

Al agregar nueva funcionalidad:

1. ✅ Escribir tests primero (TDD)
2. ✅ Documentar en la carpeta correspondiente
3. ✅ Actualizar este README si es necesario
4. ✅ Ejecutar `npm test` antes de commit

---

**Mantenido por:** Equipo de Desarrollo Al Chile FB
**Última revisión:** 2025-10-25

---

## 🆕 Últimas Actualizaciones (2025-10-25)

### ⚡ Actualización en Tiempo Real de Pedidos

Los clientes ahora ven cambios de estado de sus pedidos **instantáneamente** sin necesidad de recargar la página:

- ✅ Estado del pedido actualiza en vivo (Pendiente → Preparando → En Reparto → Entregado)
- ✅ Asignación de repartidor visible al instante
- ✅ Experiencia de usuario moderna y fluida
- ✅ Implementado con Firestore `onSnapshot()`

**Documentación completa:** [`/docs/REALTIME-UPDATES.md`](./REALTIME-UPDATES.md)

### 📊 Cobertura de Tests

- **+33 tests nuevos** para hooks críticos de tracking
- **512 tests totales** pasando al 100% 🎉
- Hooks testeados: `use-location-tracking` (18 tests), `use-driver-orders` (15 tests)
