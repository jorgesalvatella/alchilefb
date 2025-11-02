# Correcciones de Tests - 2025-11-02

**Estado final**: ✅ **TODOS LOS TESTS PASANDO**
- **Frontend**: Todos los tests pasan
- **Backend**: 448/448 tests pasan (24 suites)

---

## Tests Arreglados

### 1. Frontend: `header.test.tsx` ✅

**Problema**:
- Test se "colgaba" y fallaba con error: `Cannot read properties of undefined (reading '_context')`
- El componente `Header` usa el hook `useLogoUrl` que internamente accede a `FirebaseContext`
- El test no proveía el contexto de Firebase

**Solución**:
```typescript
// Agregado en src/components/layout/header.test.tsx
jest.mock('@/hooks/use-logo-url', () => ({
  useLogoUrl: () => ({
    logoUrl: '/default-logo.png',
    isLoading: false,
    error: null,
  }),
}));
```

**Resultado**: 10/10 tests pasando en 1.4s

**Archivo modificado**: `src/components/layout/header.test.tsx`

---

### 2. Backend: `pedidos.test.js` ✅

**Problema inicial**: 404 - Ruta no encontrada

**Causa**:
- `app` se importaba ANTES de los mocks
- Faltaban mocks de módulos que `app.js` importa: `cart`, `repartidores`, `verification`, `fcm`

**Problema secundario**: 404 - "Usuario no encontrado"

**Causa**:
- La ruta POST `/api/pedidos` verifica que el usuario exista en Firestore
- Faltaba mock de la colección `users`

**Problema terciario**: 500 - `Cannot read properties of undefined (reading 'reduce')`

**Causa**:
- El mock de `verifyCartTotals` no retornaba la estructura correcta
- Faltaban propiedades `items` y `summary.totalFinal`

**Solución completa**:
```javascript
// 1. Reorganizar imports - app se importa DESPUÉS de los mocks
// 2. Agregar mocks de módulos
jest.mock('./cart', () => ({
  router: require('express').Router(),
  verifyCartTotals: jest.fn().mockResolvedValue({
    valid: true,
    items: [
      { id: 'prod1', name: 'Taco', price: 10, quantity: 2, subtotalItem: 20 },
      { id: 'prod2', name: 'Agua', price: 5, quantity: 1, subtotalItem: 5 }
    ],
    summary: {
      subtotal: 25,
      tax: 0,
      totalFinal: 25
    }
  })
}));

jest.mock('./repartidores', () => require('express').Router());
jest.mock('./verification/phone-verification-routes', () => require('express').Router());
jest.mock('./routes/fcm', () => require('express').Router());

// 3. Agregar mock de colección users en el mock de firebase-admin
if (collectionName === 'users') {
  return {
    doc: (docId) => ({
      get: () => Promise.resolve({
        exists: docId === 'test-user-id',
        data: () => ({
          phoneVerified: true,
          email: 'test@example.com'
        })
      }),
      update: jest.fn()
    }),
  };
}
```

**Resultado**: Test "should create an order successfully" pasa

**Archivo modificado**: `backend/pedidos.test.js`

---

### 3. Backend: `pedidos-control.test.js` ✅

**Problema**: 500 - `Cannot read properties of undefined (reading 'data')`

**Causa**:
- En línea 837 de `pedidos.js`, después de la transacción, se hace `.get()` para obtener el pedido actualizado
- Los tests configuraban `mockTransactionGet` (usado dentro de la transacción) pero NO `mockGet` (usado después)
- El código usa ese documento para enviar notificaciones

**Tests afectados**:
1. "should assign a driver successfully"
2. "should assign a busy driver successfully"

**Solución**:
```javascript
// Agregar en ambos tests
mockGet.mockResolvedValueOnce({
  exists: true,
  data: () => ({ ...mockOrder, driverId: 'driver456', userId: 'user1' })
});
```

**Resultado**: Ambos tests pasan

**Archivo modificado**: `backend/pedidos-control.test.js`

---

## Resumen de Cambios

| Archivo | Líneas Modificadas | Tipo de Cambio |
|---------|-------------------|----------------|
| `src/components/layout/header.test.tsx` | +8 | Mock agregado |
| `backend/pedidos.test.js` | +30 | Mocks reorganizados y agregados |
| `backend/pedidos-control.test.js` | +10 | Mock agregado en 2 tests |

---

## Estado Actual del Proyecto

### Tests Frontend
- ✅ Todos pasando
- ✅ `header.test.tsx`: 10/10 tests

### Tests Backend
- ✅ 448/448 tests pasando
- ✅ 24/24 test suites pasando
- ✅ Tiempo de ejecución: ~3.4s

### Coverage
- No se corrió coverage en esta sesión
- Foco en arreglar tests fallidos

---

## Lecciones Aprendidas

1. **Importar mocks ANTES que módulos**: Los mocks de Jest deben definirse antes de importar los módulos que los usan

2. **Mockear dependencies transitivas**: Si un módulo (como `app.js`) importa otros módulos, todos deben estar mockeados

3. **Estructura completa de mocks**: Los mocks deben retornar la estructura exacta que el código espera (ej: `verifyCartTotals` necesita `items` y `summary.totalFinal`)

4. **Mockear operaciones post-transacción**: Si el código hace `.get()` después de una transacción, ese `.get()` también necesita estar mockeado

5. **Contextos de React en tests**: Componentes que usan contextos necesitan que esos contextos estén mockeados o provistos en los tests

---

**Fecha**: 2025-11-02
**Responsable**: Claude Code (Sentinel)
**Tiempo**: ~2 horas
**Impacto**: Todos los tests del proyecto ahora pasan ✅
