# Tests Pendientes - Al Chile FB

**Fecha de análisis**: Enero 18, 2025
**Estado actual**: 194 archivos de test existentes de ~142 archivos fuente

---

## 📊 Resumen Ejecutivo

| Categoría | Total Archivos | Con Tests | Sin Tests | % Cobertura |
|-----------|----------------|-----------|-----------|-------------|
| **Backend** | 5 módulos principales | 3 | 2 | 60% |
| **Componentes Repartidor** | 6 | 0 | 6 | 0% |
| **Componentes Control** | 14 | 0 | 14 | 0% |
| **Hooks** | 4 | 0 | 4 | 0% |
| **Páginas Repartidor** | 2 | 0 | 2 | 0% |
| **TOTAL NUEVO MÓDULO** | 26 archivos | 0 | 26 | **0%** |

---

## 🔴 CRÍTICO - Módulo de Repartidor (0% cobertura)

### Backend (1/5 módulos testeados)

#### ✅ Con Tests (3):
1. `backend/cart.js` → `cart.test.js` ✅
2. `backend/pedidos.js` → `pedidos.test.js` ✅
3. `backend/repartidores.js` → `repartidores.test.js` ✅ (15 tests passing)

#### ❌ Sin Tests (2):
4. **`backend/app.js`** - Archivo principal con 3000+ líneas
   - Contiene ~30 endpoints REST
   - CRÍTICO: No hay tests de integración
   - **Prioridad**: ALTA
   - **Estimado**: 40-50 tests necesarios
   - **Tiempo**: 8-10 horas

5. **`backend/authMiddleware.js`** - Middleware de autenticación
   - Valida tokens Firebase
   - Verifica custom claims (admin, super_admin, repartidor)
   - **Prioridad**: ALTA (seguridad)
   - **Estimado**: 10-15 tests
   - **Tiempo**: 2-3 horas

---

### Frontend - Componentes Repartidor (0/6 testeados)

**Ubicación**: `src/components/repartidor/`

1. ❌ **`CustomerInfo.tsx`**
   - Muestra info del cliente (nombre, teléfono, dirección)
   - Botón para llamar por teléfono
   - **Estimado**: 5 tests
   - **Tiempo**: 1 hora

2. ❌ **`DriverStats.tsx`**
   - Estadísticas: Pendientes, En Camino, Completados Hoy
   - Cálculos de filtrado de pedidos
   - **Estimado**: 6 tests
   - **Tiempo**: 1 hora

3. ❌ **`OrderItems.tsx`**
   - Lista de productos del pedido
   - Total y método de pago
   - **Estimado**: 5 tests
   - **Tiempo**: 1 hora

4. ❌ **`DeliveryActions.tsx`** ⚠️ COMPLEJO
   - Botones según estado (Salir a Entregar / Marcar Entregado)
   - Integración con tracking GPS
   - Indicador de tracking activo
   - Manejo de errores
   - **Estimado**: 12 tests
   - **Tiempo**: 2-3 horas

5. ❌ **`OrderCard.tsx`**
   - Card de pedido en lista
   - Badge de estado
   - Link a detalle
   - **Estimado**: 6 tests
   - **Tiempo**: 1 hora

6. ❌ **`OrderDetailMap.tsx`** ⚠️ COMPLEJO
   - Mapa de Google Maps
   - 2 marcadores (cliente y repartidor)
   - Geocoding de direcciones
   - Botones de navegación
   - **Estimado**: 10 tests
   - **Tiempo**: 2-3 horas

**Subtotal Componentes**: 44 tests, ~9-11 horas

---

### Frontend - Hooks (0/4 testeados)

**Ubicación**: `src/hooks/`

1. ❌ **`use-driver-orders.ts`** ⚠️ CRÍTICO
   - Suscripción Firestore en tiempo real
   - Fetch de pedidos asignados
   - Manejo de errores
   - **Estimado**: 8 tests
   - **Tiempo**: 2 horas

2. ❌ **`use-location-tracking.ts`** ⚠️ CRÍTICO
   - Tracking GPS automático cada 10s
   - navigator.geolocation.watchPosition()
   - Validación de precisión
   - Envío al backend
   - Cleanup
   - **Estimado**: 12 tests
   - **Tiempo**: 3 horas

3. ❌ **`use-order-tracking.ts`**
   - Suscripción a pedido + ubicación repartidor
   - Firestore onSnapshot
   - **Estimado**: 8 tests
   - **Tiempo**: 2 horas

4. ❌ **`use-toast.ts`**
   - Hook simple de notificaciones
   - **Estimado**: 3 tests
   - **Tiempo**: 30 min

**Subtotal Hooks**: 31 tests, ~7.5 horas

---

### Frontend - Páginas (0/2 testeadas)

**Ubicación**: `src/app/repartidor/`

1. ❌ **`dashboard/page.tsx`**
   - Dashboard del repartidor
   - Filtros (Todos, Pendientes, En Camino)
   - Lista de pedidos
   - Skeleton loading
   - **Estimado**: 10 tests
   - **Tiempo**: 2 horas

2. ❌ **`pedidos/[id]/page.tsx`** ⚠️ COMPLEJO
   - Detalle del pedido
   - Mapa con tracking
   - Información completa
   - Botones de acción
   - **Estimado**: 12 tests
   - **Tiempo**: 2-3 horas

**Subtotal Páginas**: 22 tests, ~4-5 horas

---

### Frontend - Componentes Control (0/14 testeados)

**Ubicación**: `src/components/control/`

**NUEVOS (Tracking Admin)**:

1. ❌ **`DriverTrackingDialog.tsx`** ⚠️ MUY COMPLEJO
   - Diálogo de tracking en vivo para admin
   - Mapa con 2 marcadores
   - Suscripción Firestore tiempo real
   - 3 cards de info
   - Detalles del pedido activo
   - **Estimado**: 15 tests
   - **Tiempo**: 3-4 horas

2. ❌ **`DriversTable.tsx`**
   - Tabla de repartidores
   - Botón de tracking
   - Badge de estado
   - **Estimado**: 8 tests
   - **Tiempo**: 1.5 horas

3. ❌ **`AddEditDriverDialog.tsx`**
   - Form para crear/editar repartidor
   - Validaciones
   - **Estimado**: 10 tests
   - **Tiempo**: 2 horas

**EXISTENTES (Sin tests)**:

4. ❌ `promotion-form.tsx` - Form de promociones
5. ❌ `manage-concept-suppliers-dialog.tsx` - Gestión de proveedores
6. ❌ `add-edit-group-dialog.tsx` - Grupos
7. ❌ `products-table.tsx` - Tabla de productos
8. ❌ `sale-product-form.tsx` - Form productos venta
9. ❌ `add-edit-product-dialog.tsx` - Diálogo productos
10. ❌ `add-edit-concept-dialog.tsx` - Conceptos
11. ❌ `add-edit-department-dialog.tsx` - Departamentos
12. ❌ `add-edit-supplier-dialog.tsx` - Proveedores
13. ❌ `add-edit-sale-category-dialog.tsx` - Categorías
14. ❌ `add-edit-business-unit-dialog.tsx` - Unidades negocio

**Estimado componentes control existentes**: ~60 tests, ~15 horas

**Subtotal Componentes Control**: 93 tests, ~21-23 horas

---

## 📋 Resumen de Tests Pendientes por Prioridad

### 🔴 PRIORIDAD CRÍTICA (Seguridad y Funcionalidad Core)

| Archivo | Tests Estimados | Tiempo | Razón |
|---------|----------------|--------|-------|
| `backend/authMiddleware.js` | 15 | 3h | **Seguridad crítica** |
| `backend/app.js` | 50 | 10h | **30+ endpoints sin tests** |
| `use-location-tracking.ts` | 12 | 3h | **Tracking GPS core** |
| `use-driver-orders.ts` | 8 | 2h | **Firestore realtime** |
| `DeliveryActions.tsx` | 12 | 3h | **Flujo principal repartidor** |
| `DriverTrackingDialog.tsx` | 15 | 4h | **Tracking admin en vivo** |

**Subtotal Crítico**: 112 tests, ~25 horas

---

### 🟡 PRIORIDAD ALTA (Funcionalidad Importante)

| Archivo | Tests Estimados | Tiempo |
|---------|----------------|--------|
| `OrderDetailMap.tsx` | 10 | 3h |
| `dashboard/page.tsx` | 10 | 2h |
| `pedidos/[id]/page.tsx` | 12 | 3h |
| `use-order-tracking.ts` | 8 | 2h |
| `DriverStats.tsx` | 6 | 1h |
| `OrderCard.tsx` | 6 | 1h |
| `DriversTable.tsx` | 8 | 1.5h |
| `AddEditDriverDialog.tsx` | 10 | 2h |

**Subtotal Alta**: 70 tests, ~15.5 horas

---

### 🟢 PRIORIDAD MEDIA (Complementarios)

| Archivo | Tests Estimados | Tiempo |
|---------|----------------|--------|
| `CustomerInfo.tsx` | 5 | 1h |
| `OrderItems.tsx` | 5 | 1h |
| `use-toast.ts` | 3 | 0.5h |
| Componentes control existentes | 60 | 15h |

**Subtotal Media**: 73 tests, ~17.5 horas

---

## 📊 Total General

| Prioridad | Tests | Tiempo Estimado |
|-----------|-------|-----------------|
| 🔴 Crítica | 112 | 25 horas |
| 🟡 Alta | 70 | 15.5 horas |
| 🟢 Media | 73 | 17.5 horas |
| **TOTAL** | **255 tests** | **~58 horas** |

---

## 🎯 Recomendación de Implementación

### Semana 1: Seguridad y Backend (25h)
- ✅ `backend/authMiddleware.js` (3h)
- ✅ `backend/app.js` - Endpoints críticos (10h)
- ✅ `use-location-tracking.ts` (3h)
- ✅ `use-driver-orders.ts` (2h)
- ✅ `DeliveryActions.tsx` (3h)
- ✅ `DriverTrackingDialog.tsx` (4h)

### Semana 2: Funcionalidad Principal (15.5h)
- ✅ `OrderDetailMap.tsx` (3h)
- ✅ `dashboard/page.tsx` (2h)
- ✅ `pedidos/[id]/page.tsx` (3h)
- ✅ `use-order-tracking.ts` (2h)
- ✅ Componentes básicos (5.5h)

### Semana 3: Complementos (17.5h)
- ✅ Resto de componentes
- ✅ Componentes control existentes

---

## 🛠️ Tests a Crear (Lista de Archivos)

### Backend
```
backend/
├── authMiddleware.test.js          ❌ CREAR (15 tests)
└── app.test.js                     ❌ CREAR (50 tests) - Solo endpoints críticos
```

### Hooks
```
src/hooks/__tests__/
├── use-driver-orders.test.ts       ❌ CREAR (8 tests)
├── use-location-tracking.test.ts   ❌ CREAR (12 tests)
├── use-order-tracking.test.ts      ❌ CREAR (8 tests)
└── use-toast.test.ts               ❌ CREAR (3 tests)
```

### Componentes Repartidor
```
src/components/repartidor/__tests__/
├── CustomerInfo.test.tsx           ❌ CREAR (5 tests)
├── DriverStats.test.tsx            ❌ CREAR (6 tests)
├── OrderItems.test.tsx             ❌ CREAR (5 tests)
├── DeliveryActions.test.tsx        ❌ CREAR (12 tests)
├── OrderCard.test.tsx              ❌ CREAR (6 tests)
└── OrderDetailMap.test.tsx         ❌ CREAR (10 tests)
```

### Componentes Control
```
src/components/control/__tests__/
├── DriverTrackingDialog.test.tsx   ❌ CREAR (15 tests)
├── DriversTable.test.tsx           ❌ CREAR (8 tests)
├── AddEditDriverDialog.test.tsx    ❌ CREAR (10 tests)
└── [otros 11 componentes]          ❌ CREAR (~60 tests)
```

### Páginas Repartidor
```
src/app/repartidor/__tests__/
├── dashboard.test.tsx              ❌ CREAR (10 tests)
└── pedido-detail.test.tsx          ❌ CREAR (12 tests)
```

---

## 📈 Métricas del Proyecto

**Estado Actual**:
- ✅ Tests existentes: 194 archivos
- ❌ Tests pendientes: ~255 tests en 32 archivos
- 📊 Cobertura módulo repartidor: **0%**
- 🎯 Cobertura deseada: **90%+**

**Después de completar**:
- ✅ Tests totales: ~449 archivos
- 📊 Cobertura estimada: **85-90%**
- 🎯 Módulo repartidor: **90%+**

---

## ✅ Tests que SÍ Existen

Para referencia, estos ya están implementados:

### Backend ✅
- `backend/cart.test.js` ✅
- `backend/pedidos.test.js` ✅
- `backend/repartidores.test.js` ✅ (15 tests - 100% passing)
- `backend/cart-promotions.test.js` ✅
- `backend/categorias-venta.test.js` ✅
- `backend/productos-venta.test.js` ✅
- `backend/promotions.test.js` ✅
- `backend/pedidos-control.test.js` ✅
- `backend/profile.test.js` ✅

### Frontend ✅
- Muchos componentes UI básicos ya tienen tests
- Componentes de orders ya testeados
- Algunos componentes de control testeados

---

## 🎓 Notas para Implementación

### Setup Necesario

**Jest + React Testing Library** ya configurado ✅

**Mocks necesarios**:
- Firebase Auth
- Firestore onSnapshot
- navigator.geolocation
- Google Maps API
- fetch (API calls)

### Patrón de Tests Recomendado

```typescript
// Ejemplo: DeliveryActions.test.tsx
describe('DeliveryActions', () => {
  // Setup mocks
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Estado: Preparando', () => {
    it('debe mostrar botón "Salir a Entregar"', () => {});
    it('debe llamar API al hacer click', () => {});
    it('debe manejar errores de GPS', () => {});
  });

  describe('Estado: En Reparto', () => {
    it('debe mostrar indicador de tracking activo', () => {});
    it('debe mostrar botón "Marcar Entregado"', () => {});
    it('debe actualizar estado al completar', () => {});
  });
});
```

---

**Documentado por**: Claude AI
**Fecha**: Enero 18, 2025
**Total tests pendientes**: 255 tests en 32 archivos
**Tiempo estimado**: ~58 horas (~7.5 días de trabajo)
