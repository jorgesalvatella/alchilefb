# TODO: Tests Pendientes del Hub de Pedidos

## Estado Actual ✅
- **Backend**: 18/18 tests pasando (100%)
- **Frontend**: 8/26+ tests completados (~30%)

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

**Última actualización:** 14 de Octubre de 2025
**Progreso actual:** 26/~70 tests (37%)
