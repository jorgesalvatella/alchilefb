# Auditoría: Inconsistencia "orders" vs "pedidos"

**Fecha**: 2025-01-25
**Reportado por**: Sistema de Auditoría
**Prioridad**: 🔴 CRÍTICA

---

## 📊 Resumen Ejecutivo

Se encontró una **inconsistencia crítica** en los nombres de colecciones de Firestore para pedidos:
- **Backend principal** usa: `pedidos` ✅
- **Backend de repartidores** usa: `orders` ❌
- **Frontend** usa: mixto (`orders` y sin acceso directo)

**Impacto**: Los repartidores no pueden ver sus pedidos asignados en el dashboard.

---

## 🔍 Hallazgos Detallados

### Backend

#### ✅ Archivos que usan `pedidos` (CORRECTO - 10 ubicaciones)

| Archivo | Línea | Contexto |
|---------|-------|----------|
| `backend/pedidos.js` | 119 | Crear nuevo pedido |
| `backend/pedidos.js` | 194 | GET /api/control/pedidos (listar) |
| `backend/pedidos.js` | 319 | GET /api/control/stats (hoy) |
| `backend/pedidos.js` | 325 | GET /api/control/stats (ayer) |
| `backend/pedidos.js` | 435 | PUT /api/control/:orderId/status |
| `backend/pedidos.js` | 470 | Verificar otros pedidos activos |
| `backend/pedidos.js` | 532 | PUT /api/control/:orderId/cancel |
| `backend/pedidos.js` | 609 | DELETE /api/control/:orderId |
| `backend/pedidos.js` | 702 | PUT /api/control/:orderId/asignar-repartidor |
| `backend/app.js` | 4204, 4226 | Endpoints de pedidos |
| `backend/cleanup-corrupt-orders.js` | 13 | Script de limpieza |

#### ❌ Archivos que usan `orders` (INCORRECTO - 5 ubicaciones)

| Archivo | Línea | Contexto | Endpoint |
|---------|-------|----------|----------|
| `backend/repartidores.js` | 181 | Actualizar ubicación del pedido | PUT /api/repartidores/me/update-location |
| `backend/repartidores.js` | 240 | Obtener pedidos del repartidor | GET /api/repartidores/me/pedidos |
| `backend/repartidores.js` | 328 | Marcar pedido en camino | PUT /api/pedidos/:orderId/marcar-en-camino |
| `backend/repartidores.js` | 466 | Marcar pedido entregado | PUT /api/pedidos/:orderId/marcar-entregado |
| `backend/repartidores.test.js` | 119 | Mock en tests | - |

---

### Frontend

#### ❌ Archivos que usan `orders` (INCORRECTO - 4 ubicaciones)

| Archivo | Línea | Contexto |
|---------|-------|----------|
| `src/hooks/use-driver-orders.ts` | 49 | Hook para obtener pedidos del repartidor |
| `src/components/control/DriverTrackingDialog.tsx` | 94 | Tracking en tiempo real |
| `src/app/control/page.tsx` | 13 | Dashboard de control (admin) |
| `src/app/control/clientes/page.tsx` | 16 | Vista de clientes |

#### ✅ Archivos que NO acceden directamente a Firestore

La mayoría del frontend usa endpoints API (correcto):
- `src/components/orders/AssignDriverDialog.tsx` - Usa `/api/pedidos/control/:id/asignar-repartidor` ✅
- Otras vistas usan endpoints del backend ✅

---

## 🎯 Análisis de Impacto

### 1. **Dashboard de Repartidores** 🔴 CRÍTICO
- **Archivo afectado**: `src/hooks/use-driver-orders.ts`
- **Problema**: Busca en `collection(db, 'orders')` pero los pedidos se guardan en `pedidos`
- **Resultado**: Repartidor no ve pedidos asignados
- **Usuarios afectados**: Todos los repartidores

### 2. **Endpoints de Repartidores** 🔴 CRÍTICO
- **Archivos afectados**: `backend/repartidores.js` (4 ubicaciones)
- **Problema**: Todos los endpoints de repartidor buscan en `orders` en vez de `pedidos`
- **Endpoints afectados**:
  - `PUT /api/repartidores/me/update-location`
  - `GET /api/repartidores/me/pedidos`
  - `PUT /api/pedidos/:orderId/marcar-en-camino`
  - `PUT /api/pedidos/:orderId/marcar-entregado`

### 3. **Vista de Control/Admin** 🟡 MEDIO
- **Archivos afectados**:
  - `src/app/control/page.tsx`
  - `src/app/control/clientes/page.tsx`
- **Problema**: Posiblemente muestran datos vacíos o incorrectos
- **Usuarios afectados**: Admins y super_admins

### 4. **Tracking en Tiempo Real** 🟡 MEDIO
- **Archivo afectado**: `src/components/control/DriverTrackingDialog.tsx`
- **Problema**: No puede mostrar ubicación del repartidor en tiempo real
- **Usuarios afectados**: Admins monitoreando entregas

---

## 📋 Plan de Corrección Propuesto

### Opción A: Cambiar TODO a `pedidos` (RECOMENDADO)

**Ventajas**:
- ✅ Consistente con el estándar documentado
- ✅ Consistente con el 90% del código existente
- ✅ Nombre en español, igual que otras colecciones

**Archivos a modificar**:
1. `backend/repartidores.js` - 4 líneas
2. `src/hooks/use-driver-orders.ts` - 1 línea
3. `src/components/control/DriverTrackingDialog.tsx` - 1 línea
4. `src/app/control/page.tsx` - 1 línea
5. `src/app/control/clientes/page.tsx` - 1 línea
6. `backend/repartidores.test.js` - 1 línea (mock)

**Total**: 9 cambios simples de string

---

### Opción B: Cambiar TODO a `orders` (NO RECOMENDADO)

**Desventajas**:
- ❌ Requiere cambiar 10+ archivos del backend principal
- ❌ Inconsistente con estándar en español (`usuarios`, `productos`, `repartidores`)
- ❌ Mayor riesgo de romper funcionalidad existente
- ❌ Requiere migración de datos en producción

---

## ✅ Checklist de Implementación (Opción A)

### Backend
- [ ] `backend/repartidores.js:181` - Cambiar a `pedidos`
- [ ] `backend/repartidores.js:240` - Cambiar a `pedidos`
- [ ] `backend/repartidores.js:328` - Cambiar a `pedidos`
- [ ] `backend/repartidores.js:466` - Cambiar a `pedidos`
- [ ] `backend/repartidores.test.js:119` - Actualizar mock

### Frontend
- [ ] `src/hooks/use-driver-orders.ts:49` - Cambiar a `pedidos`
- [ ] `src/components/control/DriverTrackingDialog.tsx:94` - Cambiar a `pedidos`
- [ ] `src/app/control/page.tsx:13` - Cambiar a `pedidos`
- [ ] `src/app/control/clientes/page.tsx:16` - Cambiar a `pedidos`

### Testing
- [ ] Ejecutar tests de backend: `npm run test:backend`
- [ ] Ejecutar tests de frontend: `npm run test:frontend`
- [ ] Test manual: Asignar pedido a repartidor
- [ ] Test manual: Ver pedido en dashboard de repartidor
- [ ] Test manual: Marcar pedido "en camino"
- [ ] Test manual: Marcar pedido "entregado"

### Documentación
- [ ] Actualizar `docs/02-architecture/firestore-collections-standard.md`
- [ ] Agregar nota en changelog sobre la corrección

---

## ⚠️ Antes de Implementar

**IMPORTANTE**: El usuario debe verificar en Firestore Console:

1. Navegar a Firestore Database
2. Verificar si existe la colección `orders`
3. Si existe, contar cuántos documentos tiene
4. Reportar hallazgos antes de proceder

**Preguntas críticas**:
- ¿Existe la colección `orders` en Firestore? (Sí/No)
- ¿Cuántos documentos contiene? (número)
- ¿Son datos de producción o prueba? (producción/prueba)

---

## 📝 Notas Adicionales

### Origen Probable del Bug

Este bug probablemente ocurrió cuando se implementaron los endpoints de repartidores (`backend/repartidores.js`) como un módulo separado, sin seguir la convención establecida en `backend/pedidos.js`.

### Prevención Futura

1. **Linter Rule**: Considerar agregar regla ESLint que detecte `collection('orders')`
2. **Code Review**: Revisar checklist en PRs que mencionen Firestore
3. **Tests de Integración**: Agregar tests que verifiquen nombres de colecciones
4. **Documentación**: El estándar ya está documentado en `docs/02-architecture/firestore-collections-standard.md`

---

**Generado por**: Auditoría Automatizada
**Fecha**: 2025-01-25
**Relacionado con**: Issue "Repartidor no ve pedidos asignados"
