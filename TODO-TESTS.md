# TODO: Tests Pendientes del Hub de Pedidos

## 📊 Estado Actual (Actualizado: 14 de Octubre de 2025)

### Resumen Ejecutivo
- ✅ **Tests Críticos:** 26/26 pasando (100%)
- ✅ **Backend Total:** 109/115 tests pasando (95%)
- ✅ **Frontend Total:** 66/69 tests pasando (96%)
- ⏳ **Tests Pendientes:** ~44-60 tests por implementar

### Desglose Detallado

#### Backend (109/115 pasando)
- ✅ **Orders Hub (pedidos-control.test.js):** 18/18 tests ✅
- ✅ **index.test.js:** Todos pasando ✅
- ✅ **categorias-venta.test.js:** Todos pasando ✅
- ✅ **productos-venta.test.js:** Todos pasando ✅
- ✅ **profile.test.js:** Todos pasando ✅
- ⚠️ **cart.test.js:** 5 tests fallando (legacy)
- ⚠️ **pedidos.test.js:** 1 test fallando (legacy)

#### Frontend (66/69 pasando)
- ✅ **OrdersKPIs.test.tsx:** 8/8 tests ✅
- ✅ **Otros componentes:** 58/58 tests ✅
- ⚠️ **pago/page.test.tsx:** 3 tests fallando (legacy)

---

## 🎯 Cambios Recientes (v0.5.0)

### Implementaciones Completadas
- ✅ Google Places Autocomplete en registro
- ✅ Google Places Autocomplete en AddEditAddressDialog
- ✅ Google Places Autocomplete en página de perfil (`/perfil`)
- ✅ Geocoding automático en `/mis-pedidos/[id]`
- ✅ Mapa visible para todos los tipos de dirección
- ✅ Coordenadas persistidas en Firestore (lat, lng, formattedAddress)

### Impacto en Tests
- ✅ **0 tests rotos** por los cambios de v0.5.0
- ✅ **26 tests críticos** continúan pasando al 100%
- ✅ **Componentes actualizados** sin degradación

---

## ⚠️ Tests que Fallan (9 total - Código Legacy)

### Backend (6 tests fallando)

#### 1. cart.test.js (5 tests)
**Razón:** Cálculos incorrectos de extras en productos

**Tests que fallan:**
1. `should calculate totals correctly with added extras`
   - **Esperado:** totalFinal = 35.00
   - **Recibido:** totalFinal = 25.00
   - **Diferencia:** 10 (precio del extra no sumado)

2. `should handle multiple items with and without customizations`
   - **Esperado:** totalFinal = 170.00
   - **Recibido:** totalFinal = 140.00
   - **Diferencia:** 30 (múltiples extras no sumados)

3. `should return 400 if items array is missing`
   - **Esperado:** Status 400
   - **Recibido:** Status 500
   - **Razón:** Error de validación mal manejado

4. `should return 400 for invalid item structure`
   - **Esperado:** Status 400
   - **Recibido:** Status 500
   - **Razón:** Error de validación mal manejado

5. `should return 400 if a product is not found`
   - **Esperado:** Status 400
   - **Recibido:** Status 500
   - **Razón:** Error de producto no encontrado mal manejado

**Ubicación del error:** `backend/cart.js:83-86`

**Solución recomendada:**
- Revisar función `verifyCartTotals()` en `backend/cart.js`
- Corregir cálculo de extras en subtotales
- Mejorar manejo de errores (throw 400 en vez de 500)

---

#### 2. pedidos.test.js (1 test)
**Razón:** Mock de Firestore no configurado correctamente para creación de pedidos

**Test que falla:**
1. `should create an order successfully with valid data`
   - **Esperado:** Status 201
   - **Recibido:** Status 500
   - **Error:** `Cannot read properties of undefined (reading 'exists')`

**Ubicación del error:** `backend/pedidos.js:55` (llamada a `verifyCartTotals`)

**Solución recomendada:**
- Verificar que el mock de Firestore incluye el método `exists`
- Asegurar que `verifyCartTotals` tiene acceso completo a la BD mockeada

---

### Frontend (3 tests fallando)

#### pago/page.test.tsx (3 tests)
**Razón:** Validaciones del flujo de pago no implementadas correctamente

**Tests que fallan:**
1. Test de validación de método de pago
2. Test de validación de dirección de entrega
3. Test de creación de orden

**Solución recomendada:**
- Revisar componente de pago en `src/app/pago/page.tsx`
- Actualizar validaciones según especificación
- Verificar integración con backend de pedidos

---

## 📝 Tests Pendientes por Componente

### 1. OrdersFilters.tsx (Prioridad: Alta)
**Archivo:** `src/components/orders/OrdersFilters.test.tsx`

Tests a implementar:
- [ ] Render de pills de estado con contadores
- [ ] Click en pill de estado actualiza el filtro seleccionado
- [ ] Pills aplican estilos correctos según estado seleccionado
- [ ] Input de búsqueda acepta texto
- [ ] Búsqueda con debounce de 300ms
- [ ] Selector de fecha cambia el valor correctamente
- [ ] Cambio de fecha dispara callback onDateFilterChange
- [ ] Render de todos los estados: Todos, Recibido, Preparando, En Reparto, Entregado, Cancelado

**Estimación:** 8-10 tests

---

### 2. OrdersTable.tsx (Prioridad: Alta)
**Archivo:** `src/components/orders/OrdersTable.test.tsx` (YA CREADO - necesita ejecutarse)

Tests a implementar:
- [x] Render de loading skeletons (ya en archivo)
- [x] Render de estado vacío (ya en archivo)
- [x] Render de tabla con pedidos (ya en archivo)
- [x] Formateo de IDs (últimos 6 caracteres) (ya en archivo)
- [x] Formateo de moneda CLP (ya en archivo)
- [x] Badges de estado con estilos correctos (ya en archivo)
- [x] Manejo de direcciones: objeto, whatsapp, GPS (ya en archivo)
- [x] Click en botón "Ver" llama onViewDetails (ya en archivo)
- [x] Render de "Sin asignar" para pedidos sin repartidor (ya en archivo)
- [x] Render de información de repartidor (ya en archivo)
- [x] Manejo de estados desconocidos (ya en archivo)

**Estado:** Tests ya creados, **EJECUTAR Y VALIDAR**

**Estimación:** 11 tests (ya implementados)

---

### 3. OrderDetailsSheet.tsx (Prioridad: Alta)
**Archivo:** `src/components/orders/OrderDetailsSheet.test.tsx`

Tests a implementar:
- [ ] No renderiza cuando order es null
- [ ] Renderiza sheet cuando isOpen es true
- [ ] Muestra ID del pedido truncado y en mayúsculas
- [ ] Muestra badge de estado correcto
- [ ] Selector de estado visible para pedidos no finalizados
- [ ] Selector de estado disabled para pedidos Entregados/Cancelados
- [ ] Cambio de estado llama a onStatusChange
- [ ] Muestra loading state mientras actualiza estado
- [ ] Renderiza timeline de statusHistory correctamente
- [ ] Muestra información del cliente (nombre, email, teléfono)
- [ ] Formatea dirección correctamente según tipo
- [ ] Lista items del pedido con customizaciones
- [ ] Muestra total calculado correctamente
- [ ] Muestra método de pago
- [ ] Muestra información del repartidor si existe
- [ ] Muestra información de cancelación si está cancelado
- [ ] Botón "Cancelar Pedido" visible para pedidos activos
- [ ] Dialog de cancelación se abre al hacer click
- [ ] Cancelación requiere razón obligatoria
- [ ] Cancelación llama a onCancelOrder con razón
- [ ] Cierra sheet al llamar onClose

**Estimación:** 20-25 tests

---

### 4. Página /control/pedidos (Prioridad: Media)
**Archivo:** `src/app/control/pedidos/page.test.tsx`

Tests de integración a implementar:
- [ ] Redirige a /ingresar si usuario no está autenticado
- [ ] Muestra loading mientras verifica autenticación
- [ ] Renderiza todos los componentes principales (KPIs, Filters, Table)
- [ ] Llama a fetchOrders en mount con usuario autenticado
- [ ] Llama a fetchStats en mount con usuario autenticado
- [ ] Actualiza orders cuando cambia selectedStatus
- [ ] Actualiza orders cuando cambia searchTerm (con debounce)
- [ ] Actualiza orders cuando cambia dateFilter
- [ ] handleViewDetails abre OrderDetailsSheet
- [ ] handleStatusChange actualiza pedido y refresca datos
- [ ] handleCancelOrder cancela pedido y cierra sheet
- [ ] Muestra toast de éxito al actualizar estado
- [ ] Muestra toast de error en fallos de API
- [ ] Calcula statusCounts correctamente

**Estimación:** 14-16 tests

---

## 🎭 Tests E2E con Playwright (Prioridad: Baja)

### Archivo: `e2e/orders-hub.spec.ts`

Flujos completos a testear:
- [ ] **Flujo de Autenticación**
  - Login como admin
  - Navegación a /control/pedidos
  - Verificar que KPIs son visibles

- [ ] **Flujo de Filtrado**
  - Filtrar por estado "Preparando"
  - Verificar que solo muestra pedidos en ese estado
  - Cambiar a "En Reparto"
  - Verificar actualización de tabla

- [ ] **Flujo de Búsqueda**
  - Escribir en input de búsqueda
  - Esperar debounce
  - Verificar resultados filtrados

- [ ] **Flujo de Cambio de Estado**
  - Click en "Ver" de un pedido
  - Cambiar estado en el sheet
  - Verificar toast de éxito
  - Verificar badge actualizado en tabla

- [ ] **Flujo de Cancelación**
  - Abrir detalles de un pedido activo
  - Click en "Cancelar Pedido"
  - Ingresar razón de cancelación
  - Confirmar cancelación
  - Verificar pedido marcado como cancelado

**Estimación:** 5 specs principales con ~15-20 assertions

---

## 📊 Resumen de Estimaciones

| Componente | Tests Estimados | Estado | Prioridad |
|------------|----------------|--------|-----------|
| OrdersFilters | 8-10 | ⏳ Pendiente | Alta |
| OrdersTable | 11 | ✅ Creado | Alta (ejecutar) |
| OrderDetailsSheet | 20-25 | ⏳ Pendiente | Alta |
| Página Principal | 14-16 | ⏳ Pendiente | Media |
| E2E Playwright | 5 specs | ⏳ Pendiente | Baja |
| **TOTAL** | **~60-70 tests** | **26 completados** | - |

---

## 🎯 Plan de Acción Recomendado

### Fase 1: Completar Tests Unitarios (Prioridad Alta)
1. ✅ OrdersKPIs - **COMPLETADO** (8 tests)
2. ⏳ Ejecutar OrdersTable.test.tsx existente (11 tests)
3. ⏳ Crear OrdersFilters.test.tsx (8-10 tests)
4. ⏳ Crear OrderDetailsSheet.test.tsx (20-25 tests)

### Fase 2: Tests de Integración (Prioridad Media)
5. ⏳ Crear page.test.tsx (14-16 tests)

### Fase 3: Tests E2E (Prioridad Baja)
6. ⏳ Configurar Playwright si no está
7. ⏳ Crear orders-hub.spec.ts (5 specs)

---

## 💡 Notas de Implementación

### Mocks Necesarios
```typescript
// Ya implementados:
- lucide-react icons
- firebase-admin
- authMiddleware

// A implementar:
- @/components/ui/* (shadcn components)
- next/navigation (router)
- Firebase client SDK
- sonner (toast)
```

### Utilidades de Testing
```typescript
// Crear helpers en test-utils.ts:
- renderWithProviders() - Wrapper con Firebase + Router
- mockOrder() - Factory de pedidos de prueba
- mockStats() - Factory de estadísticas de prueba
- waitForDebounce() - Helper para búsquedas con debounce
```

---

## ✅ Criterios de Aceptación

Para considerar el testing completo:
- [ ] Cobertura de código > 80% en componentes críticos
- [ ] Todos los tests unitarios pasando
- [ ] Tests de integración de página principal pasando
- [ ] Al menos 3 flujos E2E críticos implementados
- [ ] CI/CD configurado para ejecutar tests automáticamente

---

---

## 🔧 Plan de Acción para Tests que Fallan

### Prioridad 1: Arreglar cart.test.js (5 tests)
**Tiempo estimado:** 2-3 horas

**Pasos:**
1. Revisar `backend/cart.js:25-86` - Función `verifyCartTotals()`
2. Corregir cálculo de extras:
   ```javascript
   // Asegurar que se suman los extras al subtotal del item
   itemSubtotal = basePrice + extrasTotal
   ```
3. Mejorar manejo de errores:
   ```javascript
   // Lanzar error 400 para validaciones
   if (!items || !Array.isArray(items)) {
     return res.status(400).json({ message: 'Request body must contain an array of items.' });
   }
   ```
4. Ejecutar `cd backend && npm test cart.test.js`
5. Verificar que todos pasan

---

### Prioridad 2: Arreglar pedidos.test.js (1 test)
**Tiempo estimado:** 1 hora

**Pasos:**
1. Revisar mock de Firestore en `backend/pedidos.test.js`
2. Asegurar que el mock incluye:
   ```javascript
   doc: jest.fn(() => ({
     get: jest.fn().mockResolvedValue({
       exists: true,
       data: () => ({ /* mock data */ })
     })
   }))
   ```
3. Ejecutar `cd backend && npm test pedidos.test.js`
4. Verificar que pasa

---

### Prioridad 3: Arreglar pago/page.test.tsx (3 tests)
**Tiempo estimado:** 2-4 horas

**Pasos:**
1. Revisar `src/app/pago/page.test.tsx` y `src/app/pago/page.tsx`
2. Identificar qué validaciones faltan
3. Implementar validaciones correctas en el componente
4. Actualizar tests si es necesario
5. Ejecutar `npx jest pago/page.test.tsx`
6. Verificar que todos pasan

---

## 📈 Progreso y Métricas

### Estado de Salud del Proyecto
```
Tests Totales: 184 (115 backend + 69 frontend)
Tests Pasando: 175 (95%)
Tests Fallando: 9 (5%)
Tests Pendientes: ~44-60 (nuevos)
```

### Roadmap de Testing

**Semana 1:**
- ✅ Día 1-2: Arreglar cart.test.js (5 tests)
- ✅ Día 3: Arreglar pedidos.test.js (1 test)
- ✅ Día 4-5: Arreglar pago/page.test.tsx (3 tests)
- 🎯 **Meta:** 100% de tests existentes pasando

**Semana 2:**
- Día 1-2: Ejecutar y validar OrdersTable.test.tsx (11 tests)
- Día 3-4: Crear OrdersFilters.test.tsx (8-10 tests)
- Día 5: Review y ajustes
- 🎯 **Meta:** Componentes de filtros y tabla cubiertos

**Semana 3:**
- Día 1-5: Crear OrderDetailsSheet.test.tsx (20-25 tests)
- 🎯 **Meta:** Componente de detalles cubierto

**Semana 4:**
- Día 1-3: Crear page.test.tsx integración (14-16 tests)
- Día 4-5: Setup Playwright y 1er flujo E2E
- 🎯 **Meta:** Testing de integración completo

---

**Última actualización:** 14 de Octubre de 2025
**Progreso actual:** 26/~70 tests nuevos (37%) + 175/184 tests existentes (95%)
