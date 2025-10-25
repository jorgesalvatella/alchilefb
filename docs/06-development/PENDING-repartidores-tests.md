# Tests Pendientes - Módulo de Repartidores

**Fecha**: 2025-10-25
**Estado**: ⏸️ PENDIENTE
**Prioridad**: Alta (mantener 100% de cobertura)

---

## 📋 Contexto

Durante la sesión del 2025-10-25 se implementaron mejoras significativas al dashboard de repartidores (ver `session-2025-10-25-driver-dashboard-improvements.md`). Los tests existentes necesitan ser actualizados para reflejar estos cambios y mantener la cobertura del 100%.

---

## 🧪 Tests que Requieren Actualización

### 1. `src/components/repartidor/__tests__/DriverStats.test.tsx`

**Cambios en el componente**:
- Se reemplazaron fondos blancos (`bg-white`, `bg-blue-50`) por gradientes vibrantes
- Nuevas clases CSS:
  - Pendientes: `bg-gradient-to-br from-blue-500 to-blue-700 border-blue-400`
  - En Camino: `bg-gradient-to-br from-green-500 to-green-700 border-green-400`
  - Completados: `bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 border-orange-400`

**Actualizar**:
- ✅ Tests de renderizado que verifican clases CSS
- ✅ Snapshots (si existen)
- ✅ Tests de accesibilidad con nuevos colores

**Comando**:
```bash
npm test -- DriverStats.test.tsx
```

---

### 2. `src/components/repartidor/__tests__/OrderCard.test.tsx`

**Cambios en el componente**:
- Agregado prop opcional `eta?: string | null`
- Nueva sección de ETA con estilos específicos:
  ```tsx
  {eta && (
    <div className="flex items-center gap-2 bg-orange-500/20 border border-orange-500/30">
      <Clock className="w-4 h-4 text-orange-400" />
      <span>ETA: {eta}</span>
    </div>
  )}
  ```
- Mejorados colores de badges de estado
- Mejores contrastes para modo oscuro

**Actualizar**:
- ✅ Agregar tests para renderizado con `eta` prop
- ✅ Test cuando `eta` es `null` (no se muestra sección)
- ✅ Test cuando `eta` tiene valor (se muestra correctamente)
- ✅ Verificar nuevas clases CSS de contraste

**Ejemplo de test a agregar**:
```typescript
it('should display ETA when provided', () => {
  const orderWithCoords = {
    ...mockOrder,
    shippingAddress: {
      ...mockOrder.shippingAddress,
      coordinates: { lat: 20.6296, lng: -87.0739 }
    }
  };

  render(<OrderCard order={orderWithCoords} eta="15 mins" />);

  expect(screen.getByText(/ETA: 15 mins/i)).toBeInTheDocument();
  expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
});

it('should not display ETA section when eta is null', () => {
  render(<OrderCard order={mockOrder} eta={null} />);

  expect(screen.queryByText(/ETA:/i)).not.toBeInTheDocument();
});
```

**Comando**:
```bash
npm test -- OrderCard.test.tsx
```

---

### 3. **NUEVO**: `src/hooks/__tests__/use-eta-calculator.test.ts`

**Archivo NO existe** - Necesita ser creado

**Funcionalidad a testear**:
- Hook `useETACalculator` que calcula ETAs usando Google Directions API
- Integración con Geolocation API
- Manejo de errores
- Estados de loading

**Tests requeridos**:

```typescript
describe('useETACalculator', () => {
  beforeEach(() => {
    // Mock navigator.geolocation
    global.navigator.geolocation = {
      getCurrentPosition: jest.fn(),
    };

    // Mock fetch para Google Directions API
    global.fetch = jest.fn();
  });

  it('should get current location on mount', async () => {
    // Test que se obtiene ubicación actual
  });

  it('should calculate ETAs for destinations', async () => {
    // Test cálculo de ETAs
  });

  it('should handle geolocation errors', async () => {
    // Test manejo de errores de GPS
  });

  it('should handle API errors', async () => {
    // Test manejo de errores de Google API
  });

  it('should cache location for 1 minute', async () => {
    // Test de caché
  });

  it('should allow manual refetch', async () => {
    // Test función refetch
  });

  it('should return null for destinations without coordinates', () => {
    // Test casos edge
  });
});
```

**Crear archivo**:
```bash
touch src/hooks/__tests__/use-eta-calculator.test.ts
```

---

### 4. `src/app/repartidor/dashboard/__tests__/page.test.tsx`

**Cambios en el componente**:
- Agregado sistema de ordenamiento (`sortBy` state)
- Integración con `useETACalculator`
- Nuevos botones de ordenamiento (Fecha, Cercanía, Estado)
- Función `sortedAndFilteredOrders` con lógica compleja
- Solución de scroll horizontal

**Actualizar**:
- ✅ Tests de ordenamiento por fecha
- ✅ Tests de ordenamiento por cercanía (mockear ETAs)
- ✅ Tests de ordenamiento por estado
- ✅ Tests de interacción con botones de ordenamiento
- ✅ Tests de integración con `useETACalculator`
- ✅ Test de indicador "Calculando ETAs..."
- ✅ Tests de scroll horizontal solucionado (clases CSS)

**Ejemplo de tests a agregar**:
```typescript
describe('Order sorting', () => {
  it('should sort by date when date button is clicked', () => {
    // Test ordenamiento por fecha
  });

  it('should sort by distance when cercanía button is clicked', () => {
    // Mock ETAs y verificar orden
  });

  it('should sort by status when estado button is clicked', () => {
    // Verificar Preparando antes de En Reparto
  });

  it('should show active state on selected sort button', () => {
    // Verificar clases CSS bg-blue-600
  });
});

describe('ETA integration', () => {
  it('should display ETAs in order cards', () => {
    // Mock useETACalculator
  });

  it('should show loading indicator while calculating ETAs', () => {
    // Mock loading state
  });
});
```

**Comando**:
```bash
npm test -- dashboard/page.test.tsx
```

---

### 5. `src/components/repartidor/__tests__/OrderDetailMap.test.tsx`

**Cambios en el componente**:
- Mejorados estilos para modo oscuro
- Nuevas clases CSS en estados de error/loading
- Botones con colores vibrantes (blue-600, purple-600)

**Actualizar**:
- ✅ Verificar nuevas clases CSS de modo oscuro
- ✅ Tests de estados de error con nuevos estilos
- ✅ Tests de loading con nuevos estilos
- ✅ Snapshots (si existen)

**Comando**:
```bash
npm test -- OrderDetailMap.test.tsx
```

---

### 6. `src/app/repartidor/pedidos/[id]/__tests__/page.test.tsx`

**Cambios en el componente**:
- Mejorados colores de badges de estado
- Background negro (`bg-black`)
- Barra de acciones inferior con modo oscuro

**Actualizar**:
- ✅ Verificar nuevas clases CSS
- ✅ Tests de badges con nuevos colores
- ✅ Tests de estados de loading/error con modo oscuro

**Comando**:
```bash
npm test -- pedidos/[id]/page.test.tsx
```

---

## 🎯 Prioridad de Ejecución

### Alta Prioridad (Funcionalidad Nueva)
1. **use-eta-calculator.test.ts** (crear desde cero)
2. **dashboard/page.test.tsx** (ordenamiento y ETAs)
3. **OrderCard.test.tsx** (prop ETA)

### Media Prioridad (Estilos)
4. **DriverStats.test.tsx** (verificar gradientes)
5. **OrderDetailMap.test.tsx** (modo oscuro)
6. **pedidos/[id]/page.test.tsx** (modo oscuro)

---

## 📝 Estrategia de Testing

### 1. Mocks Necesarios

**Geolocation API**:
```typescript
const mockGeolocation = {
  getCurrentPosition: jest.fn((success) =>
    success({
      coords: {
        latitude: 20.6296,
        longitude: -87.0739,
        accuracy: 50,
      },
    })
  ),
};

global.navigator.geolocation = mockGeolocation;
```

**Google Directions API**:
```typescript
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({
      status: 'OK',
      routes: [{
        legs: [{
          duration: { text: '15 mins', value: 900 },
          distance: { text: '3.2 km', value: 3200 },
        }],
      }],
    }),
  })
);
```

**useETACalculator Hook**:
```typescript
jest.mock('@/hooks/use-eta-calculator', () => ({
  useETACalculator: jest.fn(() => ({
    etas: new Map([
      ['20.6296,-87.0739', { duration: '15 mins', distance: '3.2 km', durationInMinutes: 15 }]
    ]),
    loading: false,
    error: null,
    currentLocation: { lat: 20.6296, lng: -87.0739 },
    refetch: jest.fn(),
    getETA: jest.fn((lat, lng) => ({
      duration: '15 mins',
      distance: '3.2 km',
      durationInMinutes: 15
    })),
  })),
}));
```

### 2. Tests de Integración

Considerar agregar tests E2E para el flujo completo:
1. Repartidor ve dashboard con ETAs
2. Ordena por cercanía
3. Selecciona pedido más cercano
4. Ve mapa con navegación
5. Marca como entregado

---

## 🔧 Comandos Útiles

```bash
# Ejecutar TODOS los tests del módulo repartidor
npm test -- --testPathPattern="repartidor"

# Ejecutar tests con coverage
npm test -- --testPathPattern="repartidor" --coverage

# Ejecutar tests en modo watch
npm test -- --testPathPattern="repartidor" --watch

# Actualizar snapshots
npm test -- --testPathPattern="repartidor" --updateSnapshot

# Ver coverage detallado
npm test -- --testPathPattern="repartidor" --coverage --coverageReporters=text-lcov
```

---

## ✅ Checklist de Completitud

Marcar cuando estén completados:

- [ ] `DriverStats.test.tsx` actualizado
- [ ] `OrderCard.test.tsx` actualizado con prop ETA
- [ ] `use-eta-calculator.test.ts` creado desde cero
- [ ] `dashboard/page.test.tsx` actualizado con ordenamiento
- [ ] `OrderDetailMap.test.tsx` actualizado con modo oscuro
- [ ] `pedidos/[id]/page.test.tsx` actualizado con modo oscuro
- [ ] Todos los tests pasan (100%)
- [ ] Coverage sigue en 100%
- [ ] No hay warnings en los tests
- [ ] Snapshots actualizados (si aplica)

---

## 📚 Referencias

- Documentación de cambios: `docs/06-development/session-2025-10-25-driver-dashboard-improvements.md`
- Guía de testing: `docs/04-testing/testing-guide.md`
- Tests existentes: `docs/04-testing/frontend-tests.md`

---

**Última actualización**: 2025-10-25
**Próxima acción**: Completar tests en nueva sesión dedicada a testing
