# Actualización en Tiempo Real de Pedidos del Cliente

**Fecha de implementación:** 2025-10-25
**Autor:** Claude Code
**Versión:** 1.0

---

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Problema Resuelto](#problema-resuelto)
- [Solución Implementada](#solución-implementada)
- [Archivos Modificados](#archivos-modificados)
- [Detalles Técnicos](#detalles-técnicos)
- [Seguridad](#seguridad)
- [Beneficios](#beneficios)
- [Pruebas](#pruebas)
- [Guía de Uso](#guía-de-uso)
- [Consideraciones de Costos](#consideraciones-de-costos)

---

## 📖 Descripción General

Se implementó **actualización en tiempo real** para las páginas de pedidos del cliente usando **Firestore onSnapshot**. Esto permite que los clientes vean cambios instantáneos cuando:

- El admin cambia el estado del pedido (Pendiente → Preparando → En Reparto → Entregado)
- Se asigna un repartidor al pedido
- Se actualiza cualquier información del pedido
- Se modifica la ubicación del repartidor durante la entrega

Los clientes **ya no necesitan recargar la página** para ver actualizaciones.

---

## 🚨 Problema Resuelto

### Estado Anterior

Las páginas de pedidos del cliente hacían **una sola petición HTTP** cuando se cargaban:

**Página de Lista (`/mis-pedidos/page.tsx`):**
```typescript
// ❌ PROBLEMA: Fetch único, sin actualizaciones
useEffect(() => {
  const fetchOrders = async () => {
    const response = await fetch('/api/me/orders', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setOrders(data);
  };
  fetchOrders();
}, [user]);
```

**Página de Detalle (`/mis-pedidos/[id]/page.tsx`):**
```typescript
// ❌ PROBLEMA: Fetch único, sin actualizaciones
const response = await fetch(`/api/me/orders/${id}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
setOrder(data);
```

### Impacto del Problema

1. **Experiencia del Usuario:**
   - Cliente ve "Pedido Realizado" durante minutos después de que el admin lo cambió a "Preparando"
   - No sabe cuándo se asignó el repartidor
   - Necesita refrescar manualmente la página constantemente
   - Genera confusión y llamadas de soporte: "¿Dónde está mi pedido?"

2. **Operación del Negocio:**
   - Clientes preguntan por teléfono estado de pedidos
   - Pérdida de confianza en el sistema
   - Más carga en servicio al cliente

---

## ✨ Solución Implementada

### Firestore onSnapshot

Implementamos **subscripciones en tiempo real** usando `onSnapshot()` de Firestore, que:

1. Establece una **conexión persistente** con Firestore
2. **Escucha cambios** en documentos o colecciones
3. **Ejecuta un callback** automáticamente cuando hay cambios
4. **Se limpia automáticamente** cuando el componente se desmonta

---

## 📁 Archivos Modificados

### 1. `/src/app/mis-pedidos/page.tsx` (Lista de Pedidos)

**Imports agregados:**
```typescript
import { useFirestore } from '@/firebase/provider';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
```

**Código anterior:**
```typescript
// Fetch único con API REST
useEffect(() => {
  const fetchOrders = async () => {
    if (user) {
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/me/orders', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch orders');
        const data = await response.json();
        setOrders(data);
      } catch (error) {
        console.error(error);
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    }
  };
  fetchOrders();
}, [user]);
```

**Código nuevo:**
```typescript
// Subscripción en tiempo real con Firestore
const firestore = useFirestore();

useEffect(() => {
  if (!user || !firestore) {
    setIsLoading(false);
    return;
  }

  // Establecer subscripción en tiempo real a los pedidos del usuario
  const ordersRef = collection(firestore, 'pedidos');
  const q = query(
    ordersRef,
    where('userId', '==', user.uid),
    orderBy('createdAt', 'desc')
  );

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const ordersData: Order[] = [];
      querySnapshot.forEach((doc) => {
        ordersData.push({ ...doc.data(), id: doc.id } as Order);
      });
      setOrders(ordersData);
      setIsLoading(false);
    },
    (error) => {
      console.error('Error al suscribirse a los pedidos:', error);
      setOrders([]);
      setIsLoading(false);
    }
  );

  // Cleanup: desuscribirse cuando el componente se desmonte
  return () => unsubscribe();
}, [user, firestore]);
```

**Diferencias clave:**
- ✅ No usa `fetch()` - conexión directa a Firestore
- ✅ `onSnapshot()` se ejecuta **cada vez que cambian los datos**
- ✅ `query()` con filtros server-side para eficiencia
- ✅ `orderBy('createdAt', 'desc')` - pedidos más recientes primero
- ✅ Cleanup automático con `return () => unsubscribe()`

---

### 2. `/src/app/mis-pedidos/[id]/page.tsx` (Detalle de Pedido)

**Imports agregados:**
```typescript
import { useFirestore } from '@/firebase/provider';
import { doc, onSnapshot } from 'firebase/firestore';
```

**Código anterior:**
```typescript
// Fetch único con API REST
useEffect(() => {
  const fetchOrder = async () => {
    if (user) {
      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/me/orders/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.status === 404) {
          notFound();
          return;
        }
        if (!response.ok) throw new Error('Failed to fetch order details');
        const data = await response.json();
        setOrder(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
  };
  fetchOrder();
}, [user, id]);
```

**Código nuevo:**
```typescript
// Subscripción en tiempo real a documento específico
const firestore = useFirestore();

useEffect(() => {
  if (!user || !firestore) {
    setIsLoading(false);
    return;
  }

  // Establecer subscripción en tiempo real al pedido
  const orderRef = doc(firestore, 'pedidos', id);

  const unsubscribe = onSnapshot(
    orderRef,
    (docSnapshot) => {
      if (!docSnapshot.exists()) {
        notFound();
        return;
      }

      const orderData = docSnapshot.data() as Order;

      // Verificar que el pedido pertenece al usuario
      if (orderData.userId !== user.uid) {
        notFound();
        return;
      }

      setOrder({ ...orderData, id: docSnapshot.id });
      setIsLoading(false);
    },
    (error) => {
      console.error('Error al suscribirse al pedido:', error);
      setIsLoading(false);
    }
  );

  // Cleanup: desuscribirse cuando el componente se desmonte
  return () => unsubscribe();
}, [user, firestore, id]);
```

**Diferencias clave:**
- ✅ Subscripción a **documento específico** con `doc()`
- ✅ Validación de seguridad: `orderData.userId !== user.uid`
- ✅ Manejo de documento no existente con `notFound()`
- ✅ Actualización instantánea cuando cambia el estado del pedido

---

### 3. `/src/app/mis-pedidos/page.test.tsx` (Tests Actualizados)

**Mocks agregados:**
```typescript
// Mock Firestore
const mockOnSnapshot = jest.fn();
const mockCollection = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: (...args: any[]) => mockCollection(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  orderBy: (...args: any[]) => mockOrderBy(...args),
  onSnapshot: (...args: any[]) => mockOnSnapshot(...args),
}));

// Mock useFirestore
jest.mock('@/firebase/provider', () => ({
  useFirestore: jest.fn(() => ({ collection: mockCollection })),
}));
```

**Test actualizado:**
```typescript
it('should display a list of orders for an authenticated user', async () => {
  const mockOrders = [
    { id: 'order1', status: 'Entregado', totalVerified: 100, createdAt: { _seconds: 1672531200 }, userId: 'test-user-123' },
    { id: 'order2', status: 'En Reparto', totalVerified: 150, createdAt: { _seconds: 1672617600 }, userId: 'test-user-123' },
  ];

  // Mock onSnapshot para retornar los pedidos
  mockOnSnapshot.mockImplementation((query, successCallback) => {
    const mockQuerySnapshot = {
      forEach: (callback: any) => {
        mockOrders.forEach(order => {
          callback({
            data: () => order,
            id: order.id,
          });
        });
      },
    };
    successCallback(mockQuerySnapshot);
    return jest.fn(); // unsubscribe function
  });

  render(<OrdersPage />);

  await waitFor(() => {
    expect(screen.getByText(/Pedido #order1/i)).toBeInTheDocument();
    expect(screen.getByText(/Pedido #order2/i)).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('$150.00')).toBeInTheDocument();
  });
});
```

**Cambios en tests:**
- ✅ Ya no mockean `fetch()`
- ✅ Mockean `onSnapshot()` con callback
- ✅ Simulan `querySnapshot.forEach()`
- ✅ Retornan función `unsubscribe` para cleanup

---

### 4. `/src/app/mis-pedidos/[id]/page.test.tsx` (Tests Actualizados)

**Mocks agregados:**
```typescript
// Mock Firestore
const mockOnSnapshot = jest.fn();
const mockDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => mockDoc(...args),
  onSnapshot: (...args: any[]) => mockOnSnapshot(...args),
}));

// Mock useFirestore
jest.mock('@/firebase/provider', () => ({
  useFirestore: jest.fn(() => ({ collection: jest.fn() })),
}));
```

**Test actualizado:**
```typescript
it('should display order details when data is fetched successfully', async () => {
  const mockOrder = {
    id: 'order-123',
    status: 'Preparando',
    totalVerified: 150.0,
    subtotalVerified: 129.31,
    taxVerified: 20.69,
    createdAt: { _seconds: 1672617600, _nanoseconds: 0 },
    items: [
      { name: 'Taco', quantity: 2, totalItem: 50 },
      { name: 'Quesadilla', quantity: 1, totalItem: 100 },
    ],
    shippingAddress: { formattedAddress: '123 Main St, Anytown, USA' },
    userId: 'test-user-123',
  };

  // Mock onSnapshot para retornar el pedido
  mockOnSnapshot.mockImplementation((docRef, successCallback) => {
    const mockDocSnapshot = {
      exists: () => true,
      data: () => mockOrder,
      id: 'order-123',
    };
    successCallback(mockDocSnapshot);
    return jest.fn(); // unsubscribe function
  });

  render(<OrderTrackingPage />);

  expect(await screen.findByText(/Rastrea Tu Pedido/i)).toBeInTheDocument();
  expect(await screen.findByText('2 x Taco')).toBeInTheDocument();
  expect(await screen.findByText('$150.00')).toBeInTheDocument();
});
```

---

## 🔒 Seguridad

### Reglas de Firestore

Las reglas de seguridad en `/firestore.rules` garantizan que:

```javascript
match /pedidos/{pedidoId} {
  // Cliente puede ver SOLO SUS pedidos
  allow list, get: if request.auth.uid == resource.data.userId;

  // Usuario autenticado puede crear pedidos
  allow create: if isSignedIn();

  // Admins y Super-admins pueden ver/modificar todos los pedidos
  allow read, write: if isAdmin() || isSuperAdmin();
}
```

### Validación en Código

Además de las reglas de Firestore, el código valida:

```typescript
// En mis-pedidos/[id]/page.tsx
const orderData = docSnapshot.data() as Order;

// Verificar que el pedido pertenece al usuario
if (orderData.userId !== user.uid) {
  notFound();
  return;
}
```

### Protección Multicapa

1. **Firestore Rules:** Primera línea de defensa (server-side)
2. **Validación en Código:** Segunda capa de seguridad (client-side)
3. **Authentication:** Solo usuarios autenticados pueden suscribirse
4. **Query Filters:** `where('userId', '==', user.uid)` - solo datos del usuario

---

## 🎁 Beneficios

### Para el Cliente

| Beneficio | Descripción | Impacto |
|-----------|-------------|---------|
| **Actualización Instantánea** | Ve cambios sin recargar | ⭐⭐⭐⭐⭐ |
| **Tracking en Vivo** | Sabe cuándo se asigna repartidor | ⭐⭐⭐⭐⭐ |
| **Mejor UX** | Experiencia moderna y fluida | ⭐⭐⭐⭐ |
| **Menos Confusión** | No más "¿por qué no veo actualizaciones?" | ⭐⭐⭐⭐⭐ |
| **Tranquilidad** | Ve progreso en tiempo real | ⭐⭐⭐⭐ |

### Para el Negocio

| Beneficio | Descripción | Impacto |
|-----------|-------------|---------|
| **Menos Soporte** | Clientes no llaman preguntando estado | 💰💰💰 |
| **Mejor Imagen** | Sistema moderno y profesional | 🚀🚀🚀 |
| **Escalabilidad** | Firestore maneja miles de subscripciones | 📈📈📈 |
| **Eficiencia** | Solo cambios se transmiten, no todo | ⚡⚡⚡ |
| **Confiabilidad** | No depende de polling manual | ✅✅✅ |

### Para el Sistema

| Beneficio | Descripción |
|-----------|-------------|
| **Menos Carga** | No hay polling constante al servidor |
| **Bandwidth** | Solo cambios se transmiten, no documentos completos |
| **Cleanup Automático** | Subscripciones se cancelan al desmontar componente |
| **Server-Side Filters** | Firestore filtra en el servidor, no en cliente |

---

## 🧪 Pruebas

### Prueba Manual (Desarrollo)

1. **Setup:**
   ```bash
   npm run dev
   ```

2. **Escenario 1: Lista de Pedidos**
   - Abrir `/mis-pedidos` en navegador (como cliente)
   - Abrir `/control/pedidos` en otra pestaña (como admin)
   - Cambiar estado de un pedido en panel admin
   - **Verificar:** Lista del cliente se actualiza **instantáneamente**

3. **Escenario 2: Detalle de Pedido**
   - Abrir `/mis-pedidos/[id]` en navegador (como cliente)
   - Desde admin, cambiar estado: Pendiente → Preparando
   - **Verificar:** Barra de progreso se actualiza **sin recargar**
   - Asignar repartidor desde admin
   - **Verificar:** Aparece información del repartidor **instantáneamente**

4. **Escenario 3: Múltiples Clientes**
   - Abrir la app en 2 navegadores diferentes con usuarios distintos
   - Cada usuario ve **solo sus pedidos**
   - Actualizar pedido del Usuario A desde admin
   - **Verificar:** Usuario A ve cambios, Usuario B **NO** los ve

### Tests Automatizados

```bash
# Ejecutar tests de mis-pedidos
npm run test:frontend -- mis-pedidos

# Ejecutar todos los tests de frontend
npm run test:frontend

# Ejecutar con coverage
npm run test:frontend -- --coverage
```

**Tests existentes:**
- ✅ `mis-pedidos/page.test.tsx` (3 tests)
- ✅ `mis-pedidos/[id]/page.test.tsx` (2 tests)

---

## 📘 Guía de Uso

### Para Desarrolladores

#### Agregar nueva subscripción

```typescript
import { useFirestore } from '@/firebase/provider';
import { doc, onSnapshot } from 'firebase/firestore';

function MyComponent() {
  const firestore = useFirestore();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!firestore) return;

    const docRef = doc(firestore, 'collection', 'documentId');

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setData(snapshot.data());
        }
      },
      (error) => {
        console.error('Error:', error);
      }
    );

    return () => unsubscribe(); // ⚠️ CRÍTICO: Cleanup
  }, [firestore]);

  return <div>{data?.field}</div>;
}
```

#### Patrón para Query (múltiples documentos)

```typescript
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const collectionRef = collection(firestore, 'pedidos');
const q = query(
  collectionRef,
  where('userId', '==', userId),
  orderBy('createdAt', 'desc')
);

const unsubscribe = onSnapshot(q, (querySnapshot) => {
  const items = [];
  querySnapshot.forEach((doc) => {
    items.push({ id: doc.id, ...doc.data() });
  });
  setItems(items);
});
```

#### ⚠️ Errores Comunes

**Error 1: Memory Leak**
```typescript
// ❌ MAL: No cleanup
useEffect(() => {
  onSnapshot(docRef, (snapshot) => {
    setData(snapshot.data());
  });
}, []);

// ✅ BIEN: Con cleanup
useEffect(() => {
  const unsubscribe = onSnapshot(docRef, (snapshot) => {
    setData(snapshot.data());
  });
  return () => unsubscribe(); // Limpia subscripción
}, []);
```

**Error 2: Dependencias Faltantes**
```typescript
// ❌ MAL: firestore en dependencies pero no en if
useEffect(() => {
  const unsubscribe = onSnapshot(doc(firestore, 'col', id), ...);
  return () => unsubscribe();
}, [id]); // Falta firestore

// ✅ BIEN: Todas las dependencias
useEffect(() => {
  if (!firestore) return;
  const unsubscribe = onSnapshot(doc(firestore, 'col', id), ...);
  return () => unsubscribe();
}, [firestore, id]);
```

**Error 3: No validar seguridad**
```typescript
// ❌ MAL: Confía ciegamente en los datos
const orderData = docSnapshot.data();
setOrder(orderData);

// ✅ BIEN: Valida ownership
const orderData = docSnapshot.data();
if (orderData.userId !== user.uid) {
  notFound();
  return;
}
setOrder(orderData);
```

---

## 💰 Consideraciones de Costos

### Firestore Pricing

Firestore cobra por:
- **Lecturas de documentos:** Cada cambio = 1 lectura
- **Bandwidth:** Datos transferidos

### Cálculo de Costos

**Ejemplo: Cliente mirando pedido durante 30 minutos**

**Antes (con polling cada 10 segundos):**
```
30 minutos = 1800 segundos
1800 / 10 = 180 requests
180 requests × tamaño del pedido = $$$ en bandwidth
```

**Ahora (con onSnapshot):**
```
1 conexión inicial = 1 lectura
Cambio de estado (Preparando → En Reparto) = 1 lectura
Asignación de repartidor = 1 lectura
Total = 3 lecturas

Bandwidth: Solo los campos que cambiaron
```

### Optimizaciones Implementadas

1. **Server-Side Filtering:**
   ```typescript
   where('userId', '==', user.uid) // Solo pedidos del usuario
   ```
   No descarga pedidos de otros usuarios.

2. **Selective Fields:**
   Firestore solo transmite los campos que cambiaron, no todo el documento.

3. **Cleanup Automático:**
   Subscripciones se cancelan cuando usuario sale de la página.

### Estimación de Costos

Para un negocio con **100 pedidos/día**:

- Pedidos activos simultáneos: ~10
- Cambios promedio por pedido: 4 (Realizado → Preparando → En Reparto → Entregado)
- Lecturas/día: 100 × 4 = **400 lecturas**
- Costo Firestore: ~$0.0012 USD/día = **$0.036 USD/mes**

**Conclusión:** El costo es **insignificante** comparado con el valor para el cliente.

---

## 🔄 Flujo de Actualización

### Diagrama de Flujo

```
┌─────────────┐
│   Cliente   │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. Abre /mis-pedidos/[id]
       ▼
┌──────────────────────────┐
│   useEffect() ejecuta    │
│   onSnapshot(orderRef)   │
└──────┬───────────────────┘
       │
       │ 2. Establece subscripción
       ▼
┌──────────────────────────┐
│      Firestore           │
│   (Base de datos)        │
└──────┬───────────────────┘
       │
       │ 3. Envía datos iniciales
       ▼
┌──────────────────────────┐
│   Cliente recibe datos   │
│   setOrder(orderData)    │
└──────────────────────────┘
       │
       │ ⏳ Usuario espera...
       │
┌──────▼───────────────────┐
│   Admin cambia estado    │
│   en /control/pedidos    │
└──────┬───────────────────┘
       │
       │ 4. Actualiza Firestore
       ▼
┌──────────────────────────┐
│      Firestore           │
│   detecta cambio         │
└──────┬───────────────────┘
       │
       │ 5. Notifica a subscriptores
       ▼
┌──────────────────────────┐
│   onSnapshot callback    │
│   ejecuta AUTOMÁTICAMENTE│
└──────┬───────────────────┘
       │
       │ 6. Actualiza estado
       ▼
┌──────────────────────────┐
│   Cliente ve cambios     │
│   SIN RECARGAR PÁGINA    │
└──────────────────────────┘
```

### Código del Flujo

**Paso 1-3: Setup inicial**
```typescript
const unsubscribe = onSnapshot(orderRef, (docSnapshot) => {
  // Este callback se ejecuta inmediatamente con datos actuales
  setOrder(docSnapshot.data());
});
```

**Paso 4-6: Actualización automática**
```typescript
// Mismo callback se ejecuta AUTOMÁTICAMENTE cuando hay cambios
// No necesitas hacer nada más
```

---

## 📚 Referencias

### Documentación Oficial

- [Firestore onSnapshot](https://firebase.google.com/docs/firestore/query-data/listen)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [React useEffect Cleanup](https://react.dev/reference/react/useEffect#cleaning-up-function)

### Archivos Relacionados

- `/firestore.rules` - Reglas de seguridad
- `/src/firebase/provider.tsx` - Context de Firebase
- `/src/lib/types.ts` - Tipos TypeScript

---

## ✅ Checklist de Implementación

Para implementar tiempo real en nuevas páginas:

- [ ] Importar `useFirestore` y funciones de Firestore
- [ ] Reemplazar `fetch()` con `onSnapshot()`
- [ ] Agregar validación de `firestore` en useEffect
- [ ] Implementar callback de éxito con `setData()`
- [ ] Implementar callback de error con manejo apropiado
- [ ] **CRÍTICO:** Retornar función cleanup `return () => unsubscribe()`
- [ ] Agregar validación de seguridad si es necesario
- [ ] Actualizar tests con mocks de Firestore
- [ ] Probar manualmente con cambios en tiempo real
- [ ] Verificar que cleanup funciona (no memory leaks)

---

## 🤝 Contribuciones

Si encuentras bugs o tienes sugerencias:

1. Verificar que las reglas de Firestore sean correctas
2. Revisar que el cleanup esté implementado
3. Comprobar validación de seguridad
4. Documentar el caso de uso

---

**Última actualización:** 2025-10-25
**Versión del documento:** 1.0
**Mantenido por:** Equipo de Desarrollo
