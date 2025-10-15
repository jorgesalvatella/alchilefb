# Módulo: Sistema Completo de Gestión y Seguimiento de Pedidos

**Estado:** Fase 0 (Hub de Pedidos) Completada. Planificando Fase 1.
**Coordinador:** Sentinel
**Última Actualización:** 15 de Octubre de 2025

Este documento describe la arquitectura completa del sistema de gestión y seguimiento de pedidos, que incluye:
1. **Hub de Pedidos** (`/control/pedidos`) - Centro de comando para administración
2. **Seguimiento de Repartidores en Tiempo Real** - Sistema de tracking GPS y asignación
3. **Vista del Cliente** - Seguimiento en tiempo real de entregas

---

## PARTE I: HUB DE PEDIDOS (Centro de Comando)

### 0. Resumen del Hub de Pedidos

El Hub de Pedidos en `/control/pedidos` será el **centro de comando centralizado** para la gestión completa de todos los pedidos del sistema. Actualmente es una página básica con una tabla simple, pero se transformará en un dashboard completo con:

- 📊 **KPIs y Estadísticas en Tiempo Real**
- 🔍 **Filtros Avanzados y Búsqueda**
- 📋 **Tabla Mejorada** con información detallada y acciones rápidas
- 📱 **Panel de Detalles** lateral/modal para gestión completa de pedidos
- 🎨 **Estados Visuales** con badges semánticos y timeline
- 🚗 **Preparación para Asignación de Repartidores** (Fase posterior)

**Objetivo:** Crear una experiencia de administración profesional y eficiente que permita a los administradores supervisar, gestionar y tomar decisiones sobre pedidos en tiempo real.

---

### 0.1. Problemas Actuales Identificados

**Análisis del código actual (`src/app/control/pedidos/page.tsx`):**

1. ❌ **Error de Colección**: Usa `collection(firestore, 'orders')` pero la colección correcta es `'pedidos'`
2. ❌ **Información Limitada**: Solo muestra ID, fecha, estado y total
3. ❌ **Sin Filtros**: No hay manera de filtrar por estado, fecha o buscar pedidos específicos
4. ❌ **Sin KPIs**: No hay métricas visuales para entender el estado del negocio
5. ❌ **Acciones Limitadas**: Solo tiene un botón "Ver" que va a `/orders/{id}` (ruta incorrecta)
6. ❌ **Sin Gestión de Estados**: No se puede cambiar el estado de un pedido desde la interfaz
7. ❌ **Sin Información del Cliente**: No muestra quién hizo el pedido
8. ❌ **Sin Dirección de Entrega**: No muestra dónde se entregará
9. ❌ **Sin Repartidor**: No hay columna para ver/asignar repartidores

---

### 0.2. Arquitectura del Hub de Pedidos

#### 0.2.1. Diseño Visual y Layout

**Estructura de la Página:**

```
┌─────────────────────────────────────────────────────────┐
│  TÍTULO: "Hub de Pedidos"                               │
│  Subtítulo: "Centro de comando para gestión..."        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  KPIs (4 Cards en Grid)                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Pedidos  │ │ Activos  │ │ Ingresos │ │ Tiempo   │  │
│  │ Hoy: 24  │ │ En Curso │ │ del Día  │ │ Promedio │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Filtros y Búsqueda                                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [Todos] [Recibido] [Preparando] [En Reparto]   │   │
│  │ [Entregado] [Cancelado]                         │   │
│  │                                                 │   │
│  │ 🔍 Buscar por ID, cliente, dirección...        │   │
│  │                                                 │   │
│  │ 📅 [Hoy ▾] [Última Semana] [Este Mes]         │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Tabla de Pedidos                                       │
│  ┌─────┬────────┬────────┬─────────┬──────────┬───┐   │
│  │ ID  │Cliente │Fecha   │Dirección│Repartidor│..│   │
│  ├─────┼────────┼────────┼─────────┼──────────┼───┤   │
│  │#A3B7│Juan P. │14:32   │Calle 5  │Carlos R. │💰│   │
│  │     │        │Hoy     │Col....  │🚗 Activo │...│   │
│  └─────┴────────┴────────┴─────────┴──────────┴───┘   │
└─────────────────────────────────────────────────────────┘
```

**Sistema de Colores (Basado en el Design System Actual):**

- **Fondos**: `bg-gray-900/50` con `backdrop-blur-sm`
- **Bordes**: `border-gray-700`
- **Texto Primario**: `text-white`
- **Texto Secundario**: `text-white/80`, `text-white/70`, `text-white/60`
- **Acentos**: `text-orange-400`, `bg-orange-500`

**Badges de Estado:**
```css
Pedido Realizado → bg-white/10 text-white/70
Preparando       → bg-orange-500/20 text-orange-400 border-orange-500/30
En Reparto       → bg-blue-500/20 text-blue-400 border-blue-500/30
Entregado        → bg-[#A8C951]/20 text-[#A8C951] border-[#A8C951]/30
Cancelado        → bg-red-500/20 text-red-400 border-red-500/30
```

---

#### 0.2.2. Componentes del Hub

**A. KPIs Dashboard (Cards Superiores)**

Componente: `OrdersKPIs.tsx`

**Métricas a Mostrar:**
1. **Pedidos Hoy**
   - Icono: `ShoppingBag`
   - Valor: Número total de pedidos creados hoy
   - Subvalor: Comparación con ayer ("+12% vs ayer")

2. **Pedidos Activos**
   - Icono: `Activity`
   - Valor: Pedidos en estado "Preparando" + "En Reparto"
   - Subvalor: Desglose por estado

3. **Ingresos del Día**
   - Icono: `DollarSign`
   - Valor: Suma de `totalVerified` de pedidos de hoy
   - Subvalor: Ticket promedio

4. **Tiempo Promedio**
   - Icono: `Clock`
   - Valor: Tiempo promedio desde "Pedido Realizado" hasta "Entregado"
   - Subvalor: Solo pedidos completados hoy

**Cálculo de Métricas:**
- Se implementará un endpoint: `GET /api/control/pedidos/stats`
- O se calculará client-side filtrando los pedidos cargados

---

**B. Sistema de Filtros**

Componente: `OrdersFilters.tsx`

**Filtro por Estado (Pills/Badges):**
```tsx
const ORDER_STATUSES = [
  { value: 'all', label: 'Todos', count: 156 },
  { value: 'Pedido Realizado', label: 'Recibido', count: 8 },
  { value: 'Preparando', label: 'Preparando', count: 12 },
  { value: 'En Reparto', label: 'En Reparto', count: 5 },
  { value: 'Entregado', label: 'Entregado', count: 128 },
  { value: 'Cancelado', label: 'Cancelado', count: 3 }
];
```

**Filtro por Fecha:**
- Hoy (default)
- Última Semana
- Este Mes
- Rango Personalizado (Date Picker)

**Búsqueda:**
- Input con icono `Search`
- Busca en: ID de pedido, nombre del cliente, dirección de entrega
- Debounce de 300ms

---

**C. Tabla Mejorada de Pedidos**

Componente: `OrdersTable.tsx`

**Columnas:**

| Columna | Datos | Ancho | Descripción |
|---------|-------|-------|-------------|
| **ID** | `#${order.id.slice(0, 6)}` | 80px | ID corto del pedido |
| **Cliente** | `order.userId` (nombre) | 150px | Avatar + nombre |
| **Fecha** | `order.createdAt` | 120px | Fecha y hora relativa |
| **Dirección** | `order.shippingAddress` | 200px | Preview de dirección (truncado) |
| **Repartidor** | `order.driverName` | 140px | Nombre + badge de estado |
| **Total** | `order.totalVerified` | 100px | Precio formateado |
| **Estado** | `order.status` | 130px | Badge con color semántico |
| **Acciones** | Botones | 120px | Ver, Editar, Más |

**Características de la Tabla:**
- ✅ Responsive (colapsa a cards en mobile)
- ✅ Hover effects (`hover:bg-white/5`)
- ✅ Sorting por columna (fecha, total, estado)
- ✅ Paginación (20 pedidos por página)
- ✅ Skeleton loading states

---

**D. Panel de Detalles del Pedido**

Componente: `OrderDetailsSheet.tsx` (usando `Sheet` de shadcn/ui)

**Activación:** Click en cualquier fila de la tabla o botón "Ver Detalles"

**Layout del Sheet (Sidebar Derecho):**

```
┌─────────────────────────────────────┐
│  [X] Cerrar        Pedido #A3B7C9   │
├─────────────────────────────────────┤
│                                     │
│  📊 ESTADO ACTUAL                   │
│  ┌─────────────────────────────┐   │
│  │ [Preparando]                │   │
│  │ Cambiar a:                  │   │
│  │ [ Select: Preparando ▾ ]    │   │
│  └─────────────────────────────┘   │
│                                     │
│  📍 INFORMACIÓN DE ENTREGA          │
│  ┌─────────────────────────────┐   │
│  │ Cliente: Juan Pérez         │   │
│  │ Teléfono: +52 123 456 7890  │   │
│  │ Dirección:                  │   │
│  │ Calle 5 de Mayo #123        │   │
│  │ Col. Centro, CDMX           │   │
│  │                             │   │
│  │ [📱 WhatsApp] [📍 Ver Mapa] │   │
│  └─────────────────────────────┘   │
│                                     │
│  🚗 REPARTIDOR                      │
│  ┌─────────────────────────────┐   │
│  │ No asignado                 │   │
│  │ [Asignar Repartidor]        │   │
│  └─────────────────────────────┘   │
│                                     │
│  🛒 ARTÍCULOS DEL PEDIDO            │
│  ┌─────────────────────────────┐   │
│  │ • Tacos al Pastor x3 $45    │   │
│  │   + Extra queso             │   │
│  │ • Quesadilla x1      $30    │   │
│  │                             │   │
│  │ Subtotal:            $75    │   │
│  │ IVA (16%):           $12    │   │
│  │ Total:               $87    │   │
│  └─────────────────────────────┘   │
│                                     │
│  💳 MÉTODO DE PAGO                  │
│  ┌─────────────────────────────┐   │
│  │ Efectivo a la entrega       │   │
│  └─────────────────────────────┘   │
│                                     │
│  📅 TIMELINE                        │
│  ┌─────────────────────────────┐   │
│  │ ✅ Pedido Realizado         │   │
│  │    14:32:15                 │   │
│  │                             │   │
│  │ 🔄 Preparando (actual)      │   │
│  │    14:35:20                 │   │
│  │                             │   │
│  │ ⏳ En Reparto               │   │
│  │    Pendiente                │   │
│  │                             │   │
│  │ ⏳ Entregado                │   │
│  │    Pendiente                │   │
│  └─────────────────────────────┘   │
│                                     │
│  [🗑️ Cancelar Pedido]              │
│                                     │
└─────────────────────────────────────┘
```

**Funcionalidades del Sheet:**
- ✅ Cambio de estado con dropdown
- ✅ Ver detalles completos del pedido
- ✅ Acciones rápidas (WhatsApp, Ver mapa)
- ✅ Asignar/cambiar repartidor (preparación para Fase 1)
- ✅ Timeline de estados con timestamps
- ✅ Cancelar pedido (con confirmación)

---

#### 0.2.3. Endpoints de Backend Necesarios

**A. GET `/api/control/pedidos`**

**Propósito:** Obtener todos los pedidos con filtros

**Protección:** `authMiddleware` + verificación de `super_admin` o `admin`

**Query Params:**
- `status`: string (opcional) - Filtrar por estado
- `startDate`: ISO string (opcional) - Fecha inicio
- `endDate`: ISO string (opcional) - Fecha fin
- `search`: string (opcional) - Búsqueda en ID, nombre, dirección
- `limit`: number (opcional) - Límite de resultados (default: 50)
- `offset`: number (opcional) - Para paginación

**Response:**
```json
{
  "orders": [
    {
      "id": "abc123",
      "userId": "user456",
      "userName": "Juan Pérez",
      "userEmail": "juan@example.com",
      "userPhone": "+52 123 456 7890",
      "items": [...],
      "totalVerified": 87.50,
      "paymentMethod": "Efectivo",
      "shippingAddress": {...},
      "status": "Preparando",
      "driverId": null,
      "driverName": null,
      "createdAt": "2025-10-13T14:32:15.000Z",
      "statusHistory": [
        { "status": "Pedido Realizado", "timestamp": "2025-10-13T14:32:15.000Z" },
        { "status": "Preparando", "timestamp": "2025-10-13T14:35:20.000Z" }
      ]
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 50
}
```

---

**B. GET `/api/control/pedidos/stats`**

**Propósito:** Obtener estadísticas para los KPIs

**Protección:** `authMiddleware` + `admin`/`super_admin`

**Query Params:**
- `date`: ISO string (opcional) - Fecha para calcular stats (default: hoy)

**Response:**
```json
{
  "todayOrders": 24,
  "todayOrdersChange": 12.5,
  "activeOrders": 17,
  "activeOrdersByStatus": {
    "Preparando": 12,
    "En Reparto": 5
  },
  "todayRevenue": 2450.50,
  "averageTicket": 102.10,
  "averageDeliveryTime": 45,
  "deliveryTimeUnit": "minutes"
}
```

---

**C. PUT `/api/control/pedidos/:orderId/status`**

**Propósito:** Cambiar el estado de un pedido

**Protección:** `authMiddleware` + `admin`/`super_admin`

**Body:**
```json
{
  "status": "En Reparto"
}
```

**Validaciones:**
- El estado debe ser válido: `"Pedido Realizado" | "Preparando" | "En Reparto" | "Entregado" | "Cancelado"`
- No se puede cambiar a un estado anterior (excepto a "Cancelado")
- Registrar en `statusHistory`

**Response:**
```json
{
  "message": "Estado actualizado exitosamente",
  "order": {
    "id": "abc123",
    "status": "En Reparto",
    "statusHistory": [...]
  }
}
```

---

**D. GET `/api/control/pedidos/:orderId`**

**Propósito:** Obtener detalles completos de un pedido específico

**Protección:** `authMiddleware` + `admin`/`super_admin`

**Response:**
```json
{
  "id": "abc123",
  "userId": "user456",
  "userName": "Juan Pérez",
  "userEmail": "juan@example.com",
  "userPhone": "+52 123 456 7890",
  "items": [
    {
      "id": "item1",
      "name": "Tacos al Pastor",
      "quantity": 3,
      "price": 15,
      "customizations": {
        "added": [{ "nombre": "Extra queso", "precio": 5 }],
        "removed": []
      }
    }
  ],
  "totalVerified": 87.50,
  "paymentMethod": "Efectivo",
  "shippingAddress": {
    "street": "Calle 5 de Mayo #123",
    "city": "CDMX",
    "state": "Ciudad de México",
    "postalCode": "06000",
    "phone": "+52 123 456 7890",
    "name": "Juan Pérez"
  },
  "status": "Preparando",
  "driverId": null,
  "driverName": null,
  "driverPhone": null,
  "createdAt": "2025-10-13T14:32:15.000Z",
  "statusHistory": [...]
}
```

---

**E. DELETE `/api/control/pedidos/:orderId/cancel`**

**Propósito:** Cancelar un pedido

**Protección:** `authMiddleware` + `admin`/`super_admin`

**Body:**
```json
{
  "reason": "Cliente solicitó cancelación"
}
```

**Lógica:**
- Solo se puede cancelar si el estado NO es "Entregado"
- Cambiar status a "Cancelado"
- Registrar en `statusHistory`
- Guardar la razón de cancelación

**Response:**
```json
{
  "message": "Pedido cancelado exitosamente",
  "order": {
    "id": "abc123",
    "status": "Cancelado",
    "cancelReason": "Cliente solicitó cancelación"
  }
}
```

---

#### 0.2.4. Estructura de Datos Actualizada

**Campos Actuales en `/pedidos/{orderId}`:**
```typescript
interface Order {
  userId: string;
  items: CartItem[];
  totalVerified: number;
  paymentMethod: 'Efectivo' | 'Tarjeta a la entrega' | 'Transferencia bancaria';
  status: 'Recibido' | 'En preparación' | 'En camino' | 'Entregado' | 'Cancelado';
  createdAt: Timestamp;
  shippingAddress: Address | 'whatsapp' | string;
}
```

**Campos a Agregar (Fase 0 - Hub de Pedidos):**
```typescript
interface OrderExtended extends Order {
  // Para historial de estados
  statusHistory?: {
    status: string;
    timestamp: Timestamp;
    changedBy?: string; // UID del admin que hizo el cambio
  }[];

  // Para cancelaciones
  cancelReason?: string;
  cancelledAt?: Timestamp;
  cancelledBy?: string; // UID del admin

  // Para búsqueda (denormalización)
  userName?: string;
  userEmail?: string;
  userPhone?: string;

  // Para métricas
  deliveredAt?: Timestamp; // Cuando se completó la entrega

  // Para futuro (preparación para Fase 1)
  driverId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  driverLocation?: {
    lat: number;
    lng: number;
    lastUpdated: Timestamp;
  } | null;
}
```

**Nota sobre `status`:** Hay inconsistencia entre `types.ts` y el código actual:
- `types.ts` define: `'Recibido' | 'En preparación' | 'En camino' | 'Entregado' | 'Cancelado'`
- Código actual usa: `'Pedido Realizado' | 'Preparando' | 'En Reparto' | 'Entregado'`

**Decisión:** Estandarizar en:
```typescript
type OrderStatus =
  | 'Pedido Realizado' // Estado inicial
  | 'Preparando'       // En cocina
  | 'En Reparto'       // Con repartidor
  | 'Entregado'        // Completado
  | 'Cancelado';       // Cancelado por admin o cliente
```

---

### 0.3. Plan de Implementación - Fase 0: Hub de Pedidos

**Prioridad:** Alta (Fundación para todo el sistema)

**Duración Estimada:** 2-3 días

**Orden de Tareas:**

#### **Paso 1: Backend - Endpoints de Gestión** (Nexus)
- [ ] Crear endpoint `GET /api/control/pedidos` con filtros y paginación
- [ ] Crear endpoint `GET /api/control/pedidos/stats` para KPIs
- [ ] Crear endpoint `PUT /api/control/pedidos/:id/status` para cambio de estado
- [ ] Crear endpoint `GET /api/control/pedidos/:id` para detalles completos
- [ ] Crear endpoint `DELETE /api/control/pedidos/:id/cancel` para cancelaciones
- [ ] Agregar validación de estados y transiciones
- [ ] Implementar denormalización de datos de usuario en pedidos

#### **Paso 2: Frontend - Componentes Base** (Aether)
- [ ] Corregir colección de `'orders'` a `'pedidos'` en `page.tsx`
- [ ] Crear componente `OrdersKPIs.tsx` con cards de estadísticas
- [ ] Crear componente `OrdersFilters.tsx` con pills de estados y búsqueda
- [ ] Crear componente `OrdersTable.tsx` con tabla mejorada
- [ ] Crear hook personalizado `useOrdersData.ts` para manejar estado y filtros

#### **Paso 3: Frontend - Panel de Detalles** (Aether)
- [ ] Crear componente `OrderDetailsSheet.tsx` con Sheet de shadcn/ui
- [ ] Implementar sección de información del cliente
- [ ] Implementar sección de artículos del pedido
- [ ] Implementar timeline de estados con `statusHistory`
- [ ] Agregar dropdown para cambio de estado
- [ ] Agregar botón de cancelación con confirmación

#### **Paso 4: Integración y Refinamiento** (Aether + Nexus)
- [ ] Conectar frontend con endpoints de backend
- [ ] Implementar manejo de errores y estados de carga
- [ ] Agregar toasts de confirmación para acciones
- [ ] Optimizar queries y paginación
- [ ] Agregar skeleton loaders

#### **Paso 5: Testing** (Vanguard)
- [ ] Tests de backend para todos los endpoints nuevos
- [ ] Tests de frontend para componentes de KPIs
- [ ] Tests de frontend para tabla y filtros
- [ ] Tests de integración para OrderDetailsSheet
- [ ] Test E2E completo del flujo de gestión de pedidos

---

### 0.4. Criterios de Aceptación - Fase 0

**Para considerar el Hub de Pedidos completo:**

✅ **Funcionalidad:**
- [ ] Admin puede ver todos los pedidos en una tabla
- [ ] Admin puede filtrar pedidos por estado
- [ ] Admin puede filtrar pedidos por rango de fechas
- [ ] Admin puede buscar pedidos por ID, cliente o dirección
- [ ] Admin puede ver KPIs en tiempo real
- [ ] Admin puede cambiar el estado de un pedido
- [ ] Admin puede ver detalles completos de un pedido en un panel lateral
- [ ] Admin puede cancelar un pedido con razón
- [ ] La tabla muestra: ID, Cliente, Fecha, Dirección, Total, Estado, Acciones
- [ ] La interfaz es responsive (funciona en mobile)

✅ **Backend:**
- [ ] Todos los endpoints tienen autenticación
- [ ] Solo admins pueden acceder a los endpoints
- [ ] Los cambios de estado se registran en `statusHistory`
- [ ] Las cancelaciones guardan la razón
- [ ] Los datos de usuario están denormalizados en pedidos

✅ **UX:**
- [ ] Los estados tienen colores semánticos consistentes
- [ ] Hay feedback visual para todas las acciones (toasts)
- [ ] Los tiempos de carga muestran skeletons
- [ ] Los errores se manejan con mensajes claros
- [ ] La búsqueda tiene debounce para no saturar

✅ **Testing:**
- [ ] Cobertura de backend: 90%+
- [ ] Cobertura de frontend: 80%+
- [ ] Al menos 1 test E2E del flujo completo

---

### 0.5. Funcionalidades Detalladas del Hub (Fase 0 - Completada)

El Hub de Pedidos es un panel de control integral que ofrece las siguientes capacidades:

**1. Dashboard de KPIs (Indicadores Clave de Rendimiento):**
*   **Visión General Instantánea:** Cuatro tarjetas principales que muestran en tiempo real:
    *   **Pedidos Hoy:** Conteo total de pedidos del día y una comparación porcentual con el día anterior.
    *   **Pedidos Activos:** Suma de pedidos en estado "Preparando" y "En Reparto".
    *   **Ingresos del Día:** Monto total facturado y el ticket promedio por pedido.
    *   **Tiempo Promedio de Entrega:** Media de tiempo desde la creación hasta la entrega para los pedidos completados en el día.

**2. Sistema de Filtros y Búsqueda Dinámica:**
*   **Filtro por Estado:** Botones interactivos para filtrar la lista de pedidos por cada estado (Recibido, Preparando, En Reparto, etc.), incluyendo un contador de cuántos pedidos hay en cada estado.
*   **Filtro por Fecha:** Un selector permite ver los pedidos de "Hoy", "Última Semana", "Este Mes" o un rango de fechas personalizado.
*   **Búsqueda Inteligente:** Un campo de búsqueda que filtra pedidos por ID, nombre del cliente o dirección de entrega, con un `debounce` de 300ms para una experiencia fluida.

**3. Gestión de Pedidos en Panel de Detalles:**
*   **Vista Rápida:** Al hacer clic en un pedido, se abre un panel lateral (`Sheet`) sin abandonar la página principal.
*   **Cambio de Estado:** Un selector permite al administrador cambiar el estado de un pedido (ej. de "Preparando" a "En Reparto"). La acción se bloquea para pedidos ya entregados o cancelados.
*   **Historial Completo:** Un timeline visual muestra cada cambio de estado que ha tenido el pedido y cuándo ocurrió.
*   **Detalles Completos:** El panel muestra toda la información del cliente, los artículos del pedido (con sus personalizaciones), el desglose de subtotal, IVA y total, y el método de pago.
*   **Cancelación de Pedidos:** Un botón permite cancelar un pedido, solicitando obligatoriamente una razón para la cancelación.

**4. Tabla de Pedidos Optimizada:**
*   Presenta la información más relevante de cada pedido en 8 columnas, incluyendo ID, cliente, fecha, dirección, total y estado (con badges de color).
*   Maneja de forma inteligente distintos tipos de dirección (dirección guardada, ubicación GPS, o coordinación por WhatsApp).
*   Incluye estados de carga (skeletons) para una mejor experiencia de usuario.

---

## PARTE II: SEGUIMIENTO DE REPARTIDORES EN TIEMPO REAL

### 1. Resumen de la Funcionalidad

El objetivo es crear un sistema completo que permita a los administradores asignar pedidos a repartidores, que los repartidores gestionen sus entregas y actualicen su ubicación, y que los clientes vean el progreso de su entrega en un mapa en tiempo real.

El flujo principal es:
1.  **Admin** asigna un pedido a un repartidor disponible a través del panel de control.
2.  **Repartidor** recibe la notificación en su propia interfaz, acepta el pedido e inicia la entrega, activando el seguimiento GPS.
3.  **Cliente** ve la ubicación del repartidor moverse en el mapa de la página de su pedido.
4.  **Repartidor** marca el pedido como "Entregado", finalizando el seguimiento.

---

## 2. Arquitectura y Componentes

### 2.1. Cambios en Firestore

**A. Nueva Colección: `drivers`**

Se creará una nueva colección para gestionar la información y el estado de los repartidores.

-   **Ruta:** `/drivers/{driverId}`
-   **Schema:**
    ```json
    {
      "name": "string",
      "phone": "string",
      "vehicle": "string",
      "status": "'available' | 'busy' | 'offline'",
      "currentOrderId": "string | null",
      "currentLocation": {
        "lat": "number",
        "lng": "number",
        "lastUpdated": "timestamp"
      }
    }
    ```

**B. Actualización de la Colección: `pedidos`**

Se añadirán campos a los documentos de pedidos para vincularlos con un repartidor.

-   **Ruta:** `/pedidos/{orderId}`
-   **Nuevos Campos:**
    ```json
    {
      // ... campos existentes ...
      "driverId": "string | null",
      "driverName": "string | null",
      "driverPhone": "string | null",
      "driverLocation": {
        "lat": "number",
        "lng": "number",
        "lastUpdated": "timestamp"
      } | null,
      "statusHistory": [
        { "status": "Recibido", "timestamp": "timestamp" },
        { "status": "En camino", "timestamp": "timestamp" }
      ]
    }
    ```
    *Nota: Se añade `statusHistory` para una mejor auditoría, como sugirió Pyra.*

### 2.2. Nuevos Endpoints de Backend (Express.js)

Se creará un endpoint para manejar la lógica de negocio de la asignación.

-   **Endpoint:** `PUT /api/control/pedidos/:orderId/assign-driver`
-   **Protección:** `authMiddleware` + Verificación de claim `super_admin`.
-   **Body:** `{ "driverId": "string" }`
-   **Lógica de Negocio (Recomendaciones de Nexus):**
    1.  La operación completa se ejecutará dentro de una **transacción atómica de Firestore** para garantizar la consistencia de los datos.
    2.  **Validar Inputs**:
        -   Verificar que `driverId` y `orderId` existen. Si no, devolver `404 Not Found`.
        -   Verificar que el repartidor seleccionado está en estado `'available'`. Si no, devolver `409 Conflict`.
    3.  **Actualizar Pedido**: Añadir la información del repartidor (`driverId`, `driverName`, `driverPhone`), cambiar el `status` a "En camino" y registrar el cambio en `statusHistory`.
    4.  **Actualizar Repartidor**: Cambiar el `status` a `'busy'` y asignar el `currentOrderId`.
    5.  **Respuesta**: Devolver `200 OK` con un mensaje de éxito.

### 2.3. Nuevas Interfaces de Frontend (Next.js + shadcn/ui)

**A. Panel de Admin (`/control/pedidos`)**
-   Se añadirá una columna "Repartidor" a la tabla de pedidos.
-   Un botón "Asignar Repartidor" abrirá un `<Dialog>` de `shadcn/ui`.
-   El diálogo mostrará una lista de repartidores disponibles, con badges de colores indicando su estado.
-   Al seleccionar un repartidor, se llamará al nuevo endpoint del backend.

**B. App del Repartidor (`/driver/dashboard`)**
-   Ruta protegida que requerirá el custom claim `driver: true`.
-   Diseño **mobile-first** con botones grandes y claros.
-   Mostrará una tarjeta con los detalles del pedido asignado.
-   Botón "Iniciar Entrega" que activará `navigator.geolocation.watchPosition` para actualizar `driverLocation` en el documento del pedido cada 20-30 segundos.
-   Botón "Marcar como Entregado" que cambiará el estado del pedido.

**C. Vista de Tracking del Cliente (`/mis-pedidos/[id]`)**
-   Se migrará el mapa de Google Maps Embed API a **Google Maps JavaScript API**.
-   Se usará un listener `onSnapshot` de Firestore para escuchar cambios en el campo `driverLocation` del pedido.
-   Se renderizarán dos marcadores: uno para el destino (dirección del cliente) y otro para la ubicación del repartidor, que se moverá suavemente en el mapa.
-   Opcional: Dibujar una `Polyline` para mostrar la ruta.

### 2.4. Reglas de Seguridad de Firestore (Refinadas por Pyra)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    match /pedidos/{orderId} {
      // El cliente puede leer su propio pedido. El admin puede leer todos.
      allow read: if request.auth.uid == resource.data.userId || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.super_admin == true;
      
      // El repartidor ASIGNADO (y solo él) puede actualizar su ubicación y el estado del pedido.
      allow update: if request.auth.uid == resource.data.driverId &&
                       request.resource.data.diff(resource.data).affectedKeys()
                       .hasOnly(['driverLocation', 'status']);
    }

    match /drivers/{driverId} {
      // Cualquier usuario autenticado puede leer la info de los repartidores (para el mapa del admin).
      allow read: if request.auth != null;
      
      // Un repartidor solo puede actualizar su propio documento.
      allow update: if request.auth != null && request.auth.uid == driverId;
    }
  }
}
```

### 2.5. Infraestructura (DevOps)

-   Se generará una nueva clave de API en Google Cloud Console para la **Maps JavaScript API**.
-   La clave se restringirá para ser usada únicamente desde el dominio de la aplicación.
-   Se almacenará de forma segura como una variable de entorno `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

---

## 3. Plan de Implementación por Fases

**Fase 1 (Backend y Panel de Admin)**
1.  **Pyra**: Crear manualmente la colección `drivers` en Firestore con algunos repartidores de prueba.
2.  **Pyra/Aire**: Asignar el custom claim `driver: true` a los usuarios de prueba.
3.  **Nexus**: Implementar el endpoint `PUT /api/control/pedidos/:id/assign-driver` con transacciones y manejo de errores.
4.  **Vanguard**: Escribir los tests de backend para el nuevo endpoint.
5.  **Aether**: Modificar la página `/control/pedidos` para añadir la UI de asignación de repartidores.

**Fase 2 (App del Repartidor)**
6.  **Aether**: Crear la nueva página `/driver/dashboard`.
7.  **Aether/Pyra**: Implementar la lógica de seguimiento GPS que actualiza Firestore.
8.  **Vanguard**: Escribir tests de integración para la página del repartidor, mockeando la geolocalización.

**Fase 3 (Tracking del Cliente)**
9.  **Aether**: Migrar el mapa en `/mis-pedidos/[id]` a la JavaScript API.
10. **Aether/Pyra**: Implementar el listener `onSnapshot` para recibir actualizaciones de ubicación.
11. **Vanguard**: Escribir un test E2E con Playwright que cubra el flujo completo.

---

## 4. Estrategia de Pruebas (Plan de Vanguard)

-   **Backend (Jest + Supertest)**: Cobertura total del nuevo endpoint, incluyendo casos de éxito, autorización (admin/no-admin), y errores (404, 409).
-   **Frontend (Jest + RTL)**: Pruebas unitarias y de integración para los nuevos componentes de UI, mockeando las llamadas a la API y a Firestore.
-   **End-to-End (Playwright)**: Un test completo que simulará a un admin asignando un pedido, un repartidor iniciando la entrega y un cliente viendo el mapa actualizado.

---

## PARTE III: PLAN MAESTRO DE IMPLEMENTACIÓN

### Roadmap General

**Fase 0: Hub de Pedidos (Centro de Comando)** - ✅ **COMPLETADA**
- Duración: 2-3 días
- Estado: Completado
- Objetivo: Crear el centro de comando para gestionar todos los pedidos

**Fase 1: Asignación de Repartidores** ⬅️ **PRÓXIMA FASE**
- Duración: 3-4 días
- Estado: Pendiente (Requiere Fase 0 completa)

**Fase 2: App del Repartidor**
- Duración: 3-4 días
- Estado: Pendiente (Requiere Fase 1 completa)
- Objetivo: Dashboard mobile-first para repartidores
- Entregables:
  - Ruta protegida `/driver/dashboard`
  - Sistema de GPS tracking en tiempo real
  - Actualización automática de ubicación en Firestore
  - Botones de gestión de entrega (Iniciar/Completar)

**Fase 3: Tracking del Cliente en Tiempo Real**
- Duración: 2-3 días
- Estado: Pendiente (Requiere Fase 2 completa)
- Objetivo: Mapa en tiempo real para clientes
- Entregables:
  - Migración a Google Maps JavaScript API
  - Listener `onSnapshot` para ubicación del repartidor
  - Marcadores dinámicos en el mapa
  - Polyline opcional para mostrar ruta

---

### Conexión Entre Fases

**¿Cómo se conecta todo?**

```
┌─────────────────────────────────────────────────────────────┐
│  FASE 0: HUB DE PEDIDOS                                     │
│  /control/pedidos                                           │
│                                                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐          │
│  │   KPIs     │  │  Filtros   │  │   Tabla    │          │
│  └────────────┘  └────────────┘  └────────────┘          │
│                                      │                      │
│                      Click en fila ──┘                      │
│                                      ↓                      │
│                            ┌──────────────────┐            │
│                            │ OrderDetailsSheet│            │
│                            │                  │            │
│                            │ [Asignar Repartidor] ← FASE 1│
│                            └──────────────────┘            │
└─────────────────────────────────────────────────────────────┘
                                      │
                  ┌───────────────────┴───────────────────┐
                  ↓                                       ↓
     ┌────────────────────────────┐       ┌──────────────────────┐
     │  FASE 2: APP REPARTIDOR    │       │  FASE 3: CLIENTE     │
     │  /driver/dashboard         │       │  /mis-pedidos/[id]   │
     │                            │       │                      │
     │  ┌──────────────────────┐ │       │  ┌────────────────┐ │
     │  │ Pedido Asignado      │ │       │  │  Mapa Tiempo   │ │
     │  │ [Iniciar Entrega]    │ │       │  │  Real          │ │
     │  │                      │ │       │  │                │ │
     │  │ GPS Tracking ────────┼─┼───────┼──▶ Ubicación del │ │
     │  │ (cada 20-30s)        │ │       │  │ Repartidor     │ │
     │  └──────────────────────┘ │       │  └────────────────┘ │
     └────────────────────────────┘       └──────────────────────┘
```

**Flujo Completo:**
1. **Admin** en el Hub ve un pedido nuevo
2. **Admin** abre el panel de detalles y hace click en "Asignar Repartidor" (Fase 1)
3. Sistema asigna el pedido y actualiza Firestore
4. **Repartidor** ve el pedido en su dashboard móvil (Fase 2)
5. **Repartidor** acepta y comienza tracking GPS
6. **Cliente** ve el mapa actualizarse en tiempo real (Fase 3)
7. **Admin** monitorea todo desde el Hub

---

### Dependencias Técnicas

**Firestore:**
- Fase 0: Solo usa colección `pedidos` (ya existe)
- Fase 1: Requiere colección `drivers` nueva
- Fase 2: Requiere campos `driverLocation` en `pedidos`
- Fase 3: Requiere listener a `driverLocation`

**Backend:**
- Fase 0: 5 endpoints nuevos en `backend/pedidos.js`
- Fase 1: 1 endpoint nuevo (assign-driver) con transacciones
- Fase 2: Endpoint para repartidor actualizar ubicación
- Fase 3: Sin endpoints nuevos (usa onSnapshot)

**Frontend:**
- Fase 0: Solo modifica `/control/pedidos`
- Fase 1: Agrega componente de asignación al Sheet
- Fase 2: Nueva ruta `/driver/dashboard`
- Fase 3: Modifica `/mis-pedidos/[id]` existente

---

### Métricas de Éxito

**Fase 0 (Hub de Pedidos):**
- ✅ Administradores pueden gestionar pedidos 3x más rápido
- ✅ Reducción de errores en cambios de estado (tracking completo)
- ✅ Visibilidad completa del negocio con KPIs en tiempo real
- ✅ 0 clicks para ver detalles (Sheet lateral)

**Fase 1 (Asignación):**
- ✅ Asignación de repartidores en < 30 segundos
- ✅ 0% de asignaciones duplicadas (transacciones atómicas)
- ✅ Visibilidad de disponibilidad de repartidores en tiempo real

**Fase 2 (App Repartidor):**
- ✅ Repartidores pueden gestionar entregas sin llamadas al restaurante
- ✅ Tracking GPS preciso con actualizaciones cada 20-30s
- ✅ UI mobile-first usable con una mano

**Fase 3 (Cliente):**
- ✅ Clientes ven ubicación del repartidor en < 5s de latencia
- ✅ Reducción de llamadas "¿Dónde está mi pedido?" en 80%
- ✅ Mayor satisfacción del cliente con transparencia

---

### Próximos Pasos Inmediatos

**Ahora (Fase 0):**
1. ✅ Documentación completa (este archivo)
2. ⏳ Implementar endpoints de backend
3. ⏳ Crear componentes de frontend
4. ⏳ Testing exhaustivo
5. ⏳ Deploy y validación

**Después de Fase 0:**
- Revisar AGENTS.md y actualizar con aprendizajes
- Planificar Fase 1 con Pyra (diseño de colección `drivers`)
- Configurar custom claims `driver: true` en Firebase Auth
- Preparar ambiente de pruebas para repartidores

---

### Notas Importantes

**Sobre el Estado Actual:**
- El tracker de cliente ya funciona (`/mis-pedidos/[id]`)
- Usa Google Maps Embed API (estático)
- Muestra timeline de estados básico
- Ya está integrado con tipos `Order` de `/lib/types.ts`

**Sobre Inconsistencias Detectadas:**
- ⚠️ Colección `orders` vs `pedidos` → Estandarizar a `pedidos`
- ⚠️ Estados en `types.ts` vs código real → Estandarizar a `'Pedido Realizado' | 'Preparando' | 'En Reparto' | 'Entregado' | 'Cancelado'`
- ⚠️ Ruta `/orders/{id}` vs `/mis-pedidos/[id]` → Estandarizar a `/mis-pedidos/[id]`

**Sobre Testing:**
- Vanguard liderará la estrategia de testing
- Objetivo: 90% cobertura backend, 80% frontend
- Tests E2E con Playwright para flujos críticos
- Mock de geolocalización para tests del repartidor

---

## Conclusión

Este documento ahora describe el **sistema completo de gestión y seguimiento de pedidos** para Al Chile FB, dividido en 4 fases claramente definidas:

- **Fase 0** sienta las bases con un Hub de Pedidos profesional
- **Fase 1** conecta repartidores al sistema
- **Fase 2** empodera a los repartidores con una app móvil
- **Fase 3** completa la experiencia con tracking en tiempo real para clientes

Cada fase construye sobre la anterior, permitiendo despliegues incrementales y validación continua con usuarios reales.

**Estado Actual:** Fase 0 en desarrollo activo.
**Próximo Hito:** Hub de Pedidos completo y funcional (2-3 días).

---

**Coordinador:** Sentinel
**Documento Mantenido Por:** Equipo de Agentes (Sentinel, Pyra, Aether, Nexus, Vanguard, Aire)
**Última Revisión:** 13 de Octubre de 2025
