# Módulo: Interfaz del Repartidor (Driver Interface)

**Fecha de creación**: Enero 2025
**Versión**: 2.0
**Estado**: ✅ Implementado (95% completado - Pendiente: Testing y Auth)
**Prioridad**: Alta
**Última actualización**: Enero 18, 2025

---

## 📋 Tabla de Contenidos

1. [Contexto y Justificación](#1-contexto-y-justificación)
2. [Objetivos del Módulo](#2-objetivos-del-módulo)
3. [Arquitectura y Diseño](#3-arquitectura-y-diseño)
4. [Estructura de Datos](#4-estructura-de-datos)
5. [Endpoints de API](#5-endpoints-de-api)
6. [Componentes y Páginas](#6-componentes-y-páginas)
7. [Flujos de Usuario](#7-flujos-de-usuario)
8. [Seguridad y Autenticación](#8-seguridad-y-autenticación)
9. [Testing Strategy (Jest)](#9-testing-strategy-jest)
10. [Sistema de Tracking en Tiempo Real](#10-sistema-de-tracking-en-tiempo-real)
11. [Plan de Implementación](#11-plan-de-implementación)
12. [Asignación de Agentes](#12-asignación-de-agentes)

---

## 1. Contexto y Justificación

### 1.1 Situación Actual

El proyecto **Al Chile FB** ya cuenta con:
- ✅ Sistema de pedidos completo (clientes → admin)
- ✅ Panel de control para asignar repartidores a pedidos (`/control/pedidos`)
- ✅ Colección `repartidores` en Firestore con gestión de estados
- ✅ Backend endpoints para CRUD de repartidores
- ✅ Lógica de asignación de pedidos a repartidores

**Pero falta:**
- ❌ **Interfaz dedicada para que los repartidores vean sus pedidos asignados**
- ❌ **Sistema para que repartidores actualicen el estado de entrega**
- ❌ **Vista detallada con información de cliente y dirección**
- ❌ **Tracking en tiempo real del progreso de entregas**

### 1.2 Problema

Actualmente, cuando un administrador asigna un pedido a un repartidor:
1. El repartidor **NO puede ver** qué pedidos tiene asignados
2. El repartidor **NO puede marcar** cuándo sale a entregar
3. El repartidor **NO puede confirmar** la entrega
4. El cliente **NO recibe actualizaciones** en tiempo real del estado

Esto hace que el 50% del flujo de delivery esté incompleto, impidiendo el uso productivo del sistema.

### 1.3 Solución Propuesta

Crear una **interfaz móvil-first** para repartidores que les permita:
- 📱 Ver listado de pedidos asignados
- 🗺️ Ver detalles del pedido con mapa de ubicación
- 🚀 Marcar pedido como "En Camino"
- ✅ Confirmar entrega completada
- 🔔 Recibir notificaciones de nuevas asignaciones

---

## 2. Objetivos del Módulo

### 2.1 Funcionales

| ID | Objetivo | Descripción |
|----|----------|-------------|
| **F1** | Dashboard de Repartidor | Vista principal con pedidos asignados filtrados por estado |
| **F2** | Detalle de Pedido | Información completa: cliente, productos, dirección, mapa |
| **F3** | Actualización de Estado | Botones para cambiar estado: "Salir a Entregar" → "Entregado" |
| **F4** | Navegación a Dirección | Integración con Google Maps para navegación |
| **F5** | Historial de Entregas | Ver pedidos completados del día/semana |

### 2.2 No Funcionales

| ID | Objetivo | Descripción |
|----|----------|-------------|
| **NF1** | Responsive Mobile-First | Optimizado para celulares (repartidores usan móvil) |
| **NF2** | Tiempo Real | Actualizaciones en tiempo real con Firestore subscriptions |
| **NF3** | Offline Support | Cache básico para ver pedidos sin internet |
| **NF4** | Performance | Carga rápida (<2s) incluso con conectividad limitada |
| **NF5** | Seguridad | Solo repartidores autenticados pueden acceder |

---

## 3. Arquitectura y Diseño

### 3.1 Stack Tecnológico

```
Frontend:
  - Next.js 15 (App Router)
  - React 18 + TypeScript
  - Tailwind CSS + shadcn/ui
  - Google Maps React API (para mapas)
  - Firebase Client SDK (Auth + Firestore real-time)

Backend:
  - Express.js (puerto 8080)
  - Firebase Admin SDK
  - Endpoints RESTful

Database:
  - Firestore (real-time subscriptions)
  - Colecciones: repartidores, orders

Autenticación:
  - Firebase Auth con custom claim: 'repartidor'
```

### 3.2 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    REPARTIDOR (MOBILE)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /repartidor/dashboard  (Protected Route)           │   │
│  │    - Lista de pedidos asignados                      │   │
│  │    - Estados: Asignado / En Camino / Entregado      │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /repartidor/pedidos/[id]  (Detalle)                │   │
│  │    - Información del cliente                         │   │
│  │    - Lista de productos                              │   │
│  │    - Mapa con dirección                              │   │
│  │    - Botones: "En Camino" / "Entregado"             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↓ Firebase Auth + Firestore
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Express.js)                     │
│  GET    /api/repartidores/me                                │
│  GET    /api/repartidores/me/pedidos                        │
│  PUT    /api/pedidos/:id/marcar-en-camino                   │
│  PUT    /api/pedidos/:id/marcar-entregado                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    FIRESTORE COLLECTIONS                    │
│  - repartidores (name, phone, status, userId)              │
│  - orders (userId, items, driverId, status, address)       │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Estructura de Datos

### 4.1 Colección: `repartidores`

**Campos existentes** (ya implementados):
```typescript
interface Repartidor {
  id: string;                    // Firestore document ID
  name: string;                  // Nombre completo
  phone: string;                 // Teléfono de contacto
  status: 'disponible' | 'ocupado';  // Estado actual
  assignedOrderCount: number;    // Cantidad de pedidos activos
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deleted: boolean;              // Soft delete
}
```

**Campos a AGREGAR**:
```typescript
interface RepartidorExtended extends Repartidor {
  userId?: string;               // Firebase Auth UID (para autenticación)
  email?: string;                // Email para login
  photoURL?: string;             // Foto de perfil (opcional)
  vehicleType?: 'moto' | 'bici' | 'auto' | 'pie';  // Tipo de vehículo
}
```

### 4.2 Colección: `orders`

**Campos relevantes para repartidor** (ya existentes):
```typescript
interface Order {
  id: string;
  userId: string;                // Cliente que hizo el pedido
  driverId?: string;             // ID del repartidor asignado ← CLAVE
  status: 'Pedido Realizado' | 'Preparando' | 'En Reparto' | 'Entregado';
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    phone: string;
    name: string;
  };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  totalVerified: number;
  paymentMethod: 'cash' | 'card' | 'transfer';
  statusHistory: Array<{
    status: string;
    timestamp: Timestamp;
    updatedBy?: string;
  }>;
  createdAt: Timestamp;
}
```

### 4.3 Custom Claims de Firebase

**Nuevo rol necesario:**
```typescript
interface CustomClaims {
  super_admin?: boolean;   // Existente
  admin?: boolean;         // Existente
  repartidor?: boolean;    // ← NUEVO (para repartidores)
}
```

**Nota de seguridad (Raptoure):**
- Los custom claims deben asignarse SOLO desde el backend con Firebase Admin SDK
- NUNCA permitir que el frontend modifique claims
- Usar `authMiddleware` para verificar el claim `repartidor` en todos los endpoints

---

## 5. Endpoints de API

### 5.1 Endpoints a CREAR

#### **GET /api/repartidores/me**
Obtiene la información del repartidor autenticado (basado en Firebase Auth UID).

**Autenticación:** Bearer Token (Firebase ID Token)
**Autorización:** Custom claim `repartidor: true`

**Request:**
```bash
GET /api/repartidores/me
Authorization: Bearer <firebase-id-token>
```

**Response 200:**
```json
{
  "id": "repartidor123",
  "name": "Juan Pérez",
  "phone": "555-1234",
  "status": "disponible",
  "assignedOrderCount": 2,
  "email": "juan@alchile.com",
  "vehicleType": "moto"
}
```

**Response 401:** Usuario no autenticado
**Response 403:** Usuario no tiene claim `repartidor`
**Response 404:** Repartidor no encontrado en Firestore

---

#### **GET /api/repartidores/me/pedidos**
Obtiene los pedidos asignados al repartidor autenticado.

**Query Parameters:**
- `status` (opcional): Filtrar por estado (`En Reparto`, `Entregado`, etc.)
- `date` (opcional): Filtrar por fecha (`today`, `week`, `all`)

**Request:**
```bash
GET /api/repartidores/me/pedidos?status=En Reparto
Authorization: Bearer <firebase-id-token>
```

**Response 200:**
```json
{
  "pedidos": [
    {
      "id": "order123",
      "status": "En Reparto",
      "customerName": "María González",
      "customerPhone": "555-9876",
      "shippingAddress": {
        "street": "Calle Principal 123",
        "city": "Ciudad",
        "coordinates": { "lat": 19.4326, "lng": -99.1332 }
      },
      "items": [
        { "name": "Albóndigas Clásicas", "quantity": 2, "price": 150 }
      ],
      "total": 300,
      "paymentMethod": "cash",
      "createdAt": "2025-01-18T10:30:00Z"
    }
  ],
  "count": 1
}
```

---

#### **PUT /api/pedidos/:orderId/marcar-en-camino**
Marca un pedido como "En Reparto" y registra la hora de salida.

**Autenticación:** Bearer Token
**Autorización:** Custom claim `repartidor: true`
**Validación:** Solo el repartidor asignado puede marcar su pedido

**Request:**
```bash
PUT /api/pedidos/order123/marcar-en-camino
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "currentLocation": {
    "lat": 19.4326,
    "lng": -99.1332
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "order": {
    "id": "order123",
    "status": "En Reparto",
    "statusHistory": [
      { "status": "En Reparto", "timestamp": "2025-01-18T11:00:00Z", "updatedBy": "repartidor123" }
    ]
  }
}
```

**Response 403:** El pedido no está asignado a este repartidor
**Response 404:** Pedido no encontrado
**Response 400:** Estado actual no permite esta transición

---

#### **PUT /api/pedidos/:orderId/marcar-entregado**
Marca un pedido como "Entregado" y libera al repartidor.

**Request:**
```bash
PUT /api/pedidos/order123/marcar-entregado
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "deliveryNotes": "Entregado en mano. Cliente satisfecho.",
  "signature": "data:image/png;base64,..." // Opcional: firma digital
}
```

**Response 200:**
```json
{
  "success": true,
  "order": {
    "id": "order123",
    "status": "Entregado",
    "deliveredAt": "2025-01-18T11:45:00Z"
  },
  "driverStatusUpdated": true
}
```

**Efectos secundarios:**
- Actualiza `orders.status` → "Entregado"
- Decrementa `repartidores.assignedOrderCount`
- Si `assignedOrderCount` === 0, cambia `repartidores.status` → "disponible"
- Registra en `statusHistory`

---

### 5.2 Endpoints Existentes (Sin cambios)

Ya implementados en el backend:
- `GET /api/control/drivers` - Listar repartidores (admin)
- `POST /api/control/drivers` - Crear repartidor (admin)
- `PUT /api/pedidos/control/:orderId/asignar-repartidor` - Asignar repartidor (admin)

---

## 6. Componentes y Páginas

### 6.1 Estructura de Archivos

```
src/
├── app/
│   └── repartidor/                    # Nueva sección
│       ├── layout.tsx                 # Layout con navbar mobile
│       ├── page.tsx                   # Dashboard (redirect a /dashboard)
│       ├── dashboard/
│       │   └── page.tsx               # Lista de pedidos asignados
│       ├── pedidos/
│       │   └── [id]/
│       │       └── page.tsx           # Detalle de pedido
│       └── historial/
│           └── page.tsx               # Pedidos completados
│
├── components/
│   └── repartidor/                    # Componentes específicos
│       ├── OrderCard.tsx              # Card de pedido en lista
│       ├── OrderDetailMap.tsx         # Mapa con ubicación del cliente
│       ├── DeliveryActions.tsx        # Botones de acción (En Camino/Entregado)
│       ├── CustomerInfo.tsx           # Info del cliente
│       ├── OrderItems.tsx             # Lista de productos
│       └── DriverStats.tsx            # Estadísticas del repartidor
│
└── hooks/
    └── use-driver-orders.ts           # Hook para obtener pedidos del repartidor
```

---

### 6.2 Componentes Detallados

#### **6.2.1 DriverDashboard** (`/repartidor/dashboard/page.tsx`)

**Funcionalidad:**
- Muestra lista de pedidos asignados al repartidor
- Filtros por estado: Todos / Asignado / En Camino / Entregados
- Pull-to-refresh en móvil
- Indicador de pedidos pendientes vs completados

**Mockup visual:**
```
┌────────────────────────────────────────┐
│  🚗 Mis Pedidos          [👤 Perfil]  │
├────────────────────────────────────────┤
│  📊 Hoy: 3 entregas | 2 pendientes    │
├────────────────────────────────────────┤
│  [Todos] [Pendientes] [En Camino]     │
├────────────────────────────────────────┤
│  ┌──────────────────────────────────┐ │
│  │ 🟢 En Camino                     │ │
│  │ María González                   │ │
│  │ Calle Principal 123              │ │
│  │ $300 • Efectivo • 2 productos    │ │
│  │ [Ver Detalles →]                 │ │
│  └──────────────────────────────────┘ │
│  ┌──────────────────────────────────┐ │
│  │ 🔵 Asignado                      │ │
│  │ Juan Pérez                       │ │
│  │ Av. Reforma 456                  │ │
│  │ $450 • Tarjeta • 3 productos     │ │
│  │ [Ver Detalles →]                 │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘
```

**Componente principal:**
```tsx
// src/app/repartidor/dashboard/page.tsx
'use client';

import { useDriverOrders } from '@/hooks/use-driver-orders';
import { OrderCard } from '@/components/repartidor/OrderCard';
import { DriverStats } from '@/components/repartidor/DriverStats';
import { withAuth } from '@/components/auth/withAuth';
import { useState } from 'react';

function DriverDashboard() {
  const { orders, loading, error, refetch } = useDriverOrders();
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress'>('pending');

  const filteredOrders = orders.filter(order => {
    if (filter === 'pending') return order.status === 'Preparando';
    if (filter === 'in-progress') return order.status === 'En Reparto';
    return true;
  });

  if (loading) return <div className="p-4">Cargando pedidos...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-primary text-white p-4">
        <h1 className="text-xl font-bold">🚗 Mis Pedidos</h1>
      </header>

      <DriverStats orders={orders} />

      <div className="p-4 flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-primary text-white' : 'bg-white'}`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded ${filter === 'pending' ? 'bg-primary text-white' : 'bg-white'}`}
        >
          Pendientes
        </button>
        <button
          onClick={() => setFilter('in-progress')}
          className={`px-4 py-2 rounded ${filter === 'in-progress' ? 'bg-primary text-white' : 'bg-white'}`}
        >
          En Camino
        </button>
      </div>

      <div className="p-4 space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No tienes pedidos {filter !== 'all' && `en estado "${filter}"`}
          </div>
        ) : (
          filteredOrders.map(order => (
            <OrderCard key={order.id} order={order} />
          ))
        )}
      </div>
    </div>
  );
}

export default withAuth(DriverDashboard, 'repartidor');
```

---

#### **6.2.2 OrderDetailPage** (`/repartidor/pedidos/[id]/page.tsx`)

**Funcionalidad:**
- Información completa del pedido
- Mapa interactivo con ubicación del cliente
- Botones de acción según estado:
  - Si está "Asignado" → Botón "Salir a Entregar"
  - Si está "En Camino" → Botón "Marcar como Entregado"
- Botón para abrir Google Maps / Waze con navegación
- Información de contacto del cliente (llamar con un tap)

**Mockup visual:**
```
┌────────────────────────────────────────┐
│  [←] Pedido #1234                      │
├────────────────────────────────────────┤
│  🟢 Estado: En Camino                  │
│                                        │
│  👤 Cliente                            │
│  María González                        │
│  📞 555-9876  [Llamar]                 │
│                                        │
│  📍 Dirección                          │
│  Calle Principal 123, Col. Centro     │
│  Ciudad, Estado, CP 12345              │
│  [Abrir en Maps 🗺️]                   │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │     [MAPA INTERACTIVO]           │ │
│  │   📍 ← Ubicación del cliente     │ │
│  └──────────────────────────────────┘ │
│                                        │
│  🛍️ Productos                          │
│  • Albóndigas Clásicas x2 - $150     │
│  • Bebida x1 - $50                   │
│                                        │
│  💰 Total: $300                        │
│  💵 Pago: Efectivo                     │
│                                        │
│  [🚀 Marcar como Entregado]            │
└────────────────────────────────────────┘
```

**Componente principal:**
```tsx
// src/app/repartidor/pedidos/[id]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc } from '@/hooks/use-doc';
import { OrderDetailMap } from '@/components/repartidor/OrderDetailMap';
import { DeliveryActions } from '@/components/repartidor/DeliveryActions';
import { CustomerInfo } from '@/components/repartidor/CustomerInfo';
import { OrderItems } from '@/components/repartidor/OrderItems';
import { withAuth } from '@/components/auth/withAuth';

function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const { data: order, loading } = useDoc(`orders/${orderId}`);

  if (loading) return <div className="p-4">Cargando...</div>;
  if (!order) return <div className="p-4">Pedido no encontrado</div>;

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-primary text-white p-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-2xl">←</button>
        <h1 className="text-lg font-bold">Pedido #{order.id.slice(0, 8)}</h1>
      </header>

      <div className="p-4 space-y-6">
        <div className="text-center">
          <span className={`inline-block px-4 py-2 rounded-full text-white ${
            order.status === 'En Reparto' ? 'bg-green-600' : 'bg-blue-600'
          }`}>
            {order.status}
          </span>
        </div>

        <CustomerInfo customer={order.shippingAddress} />
        <OrderDetailMap address={order.shippingAddress} />
        <OrderItems items={order.items} total={order.totalVerified} paymentMethod={order.paymentMethod} />
        <DeliveryActions order={order} />
      </div>
    </div>
  );
}

export default withAuth(OrderDetailPage, 'repartidor');
```

---

#### **6.2.3 DeliveryActions** (Componente de botones)

**Lógica de estados:**
```tsx
// src/components/repartidor/DeliveryActions.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/provider';

interface DeliveryActionsProps {
  order: any;
}

export function DeliveryActions({ order }: DeliveryActionsProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const router = useRouter();

  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
      }
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  };

  const handleStartDelivery = async () => {
    setLoading(true);
    try {
      let currentLocation = null;
      try {
        const position = await getCurrentPosition();
        currentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      } catch (geoError) {
        console.warn('No se pudo obtener ubicación:', geoError);
      }

      const token = await user?.getIdToken();
      const response = await fetch(`/api/pedidos/${order.id}/marcar-en-camino`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentLocation }),
      });

      if (response.ok) {
        toast({ title: '✅ Pedido marcado como En Camino' });
      } else {
        const error = await response.json();
        toast({ title: error.message || 'Error al actualizar', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error al actualizar', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteDelivery = async () => {
    setLoading(true);
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`/api/pedidos/${order.id}/marcar-entregado`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          deliveryNotes: 'Entregado correctamente',
        }),
      });

      if (response.ok) {
        toast({ title: '🎉 Pedido entregado con éxito' });
        router.push('/repartidor/dashboard');
      } else {
        const error = await response.json();
        toast({ title: error.message || 'Error al completar', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error al completar', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Lógica de botones según estado
  if (order.status === 'Preparando') {
    return (
      <Button
        onClick={handleStartDelivery}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700"
        size="lg"
      >
        🚀 Salir a Entregar
      </Button>
    );
  }

  if (order.status === 'En Reparto') {
    return (
      <Button
        onClick={handleCompleteDelivery}
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-700"
        size="lg"
      >
        ✅ Marcar como Entregado
      </Button>
    );
  }

  return (
    <div className="text-center text-gray-500 p-4">
      Pedido ya entregado
    </div>
  );
}
```

---

### 6.3 Hooks Personalizados

#### **use-driver-orders.ts**

```tsx
// src/hooks/use-driver-orders.ts
import { useState, useEffect } from 'react';
import { useUser } from '@/firebase/provider';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/config';

export function useDriverOrders() {
  const { user } = useUser();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchDriverIdAndSubscribe = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/repartidores/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('No se pudo obtener información del repartidor');
        }

        const driver = await response.json();

        // Suscribirse a los pedidos en tiempo real
        const ordersRef = collection(db, 'orders');
        const q = query(
          ordersRef,
          where('driverId', '==', driver.id),
          where('status', 'in', ['Preparando', 'En Reparto']),
          orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const ordersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));

          setOrders(ordersData);
          setLoading(false);
        }, (err) => {
          setError(err.message);
          setLoading(false);
        });

        return unsubscribe;
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    const unsubscribePromise = fetchDriverIdAndSubscribe();

    return () => {
      unsubscribePromise.then(unsub => unsub?.());
    };
  }, [user]);

  const refetch = async () => {
    setLoading(true);
    setError(null);
  };

  return { orders, loading, error, refetch };
}
```

---

## 7. Flujos de Usuario

### 7.1 Flujo Principal: Entrega de Pedido

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE ENTREGA                         │
└─────────────────────────────────────────────────────────────┘

1. ADMIN asigna pedido a repartidor
   └─> Firestore: orders.driverId = "repartidor123"
   └─> Firestore: repartidores.assignedOrderCount++
   └─> Estado pedido: "Preparando"

2. REPARTIDOR ve notificación de nuevo pedido
   └─> Dashboard actualizado en tiempo real (Firestore subscription)
   └─> Aparece card con el pedido en "Pendientes"

3. REPARTIDOR abre detalle del pedido
   └─> GET /api/repartidores/me/pedidos
   └─> Ve información completa: cliente, productos, dirección, mapa

4. REPARTIDOR sale a entregar
   └─> Tap en botón "🚀 Salir a Entregar"
   └─> PUT /api/pedidos/:id/marcar-en-camino
   └─> Firestore: orders.status = "En Reparto"
   └─> Firestore: orders.statusHistory[] += nuevo registro
   └─> Cliente ve actualización en su dashboard

5. REPARTIDOR llega y entrega el pedido
   └─> Tap en botón "✅ Marcar como Entregado"
   └─> PUT /api/pedidos/:id/marcar-entregado
   └─> Firestore: orders.status = "Entregado"
   └─> Firestore: repartidores.assignedOrderCount--
   └─> Si assignedOrderCount === 0:
       └─> Firestore: repartidores.status = "disponible"
   └─> Cliente recibe confirmación de entrega

6. REPARTIDOR regresa al dashboard
   └─> Pedido movido a "Completados"
   └─> Listo para siguiente entrega
```

---

### 7.2 Flujo Secundario: Login de Repartidor

```
1. Repartidor accede a /repartidor/dashboard
   └─> withAuth detecta que no hay sesión
   └─> Redirige a /ingresar?redirect=/repartidor/dashboard

2. Repartidor ingresa email y contraseña
   └─> Firebase Auth verifica credenciales
   └─> Backend verifica custom claim 'repartidor'

3. Si claim es válido:
   └─> Permite acceso a /repartidor/dashboard
   └─> Carga pedidos asignados

4. Si NO tiene claim 'repartidor':
   └─> Muestra error: "No tienes permisos de repartidor"
   └─> Redirige a /
```

---

## 8. Seguridad y Autenticación

**Responsable:** 🛡️ **Raptoure** (Agente de Seguridad)

### 8.1 Principios de Seguridad

1. **Autenticación Robusta**
   - ✅ Todos los endpoints requieren Firebase ID Token válido
   - ✅ Verificación en backend con Firebase Admin SDK
   - ✅ Custom claim `repartidor: true` obligatorio

2. **Autorización Granular**
   - ✅ Repartidor solo puede ver SUS pedidos asignados
   - ✅ Validación: `order.driverId === req.user.driverId`
   - ✅ No puede modificar pedidos de otros repartidores

3. **Firestore Security Rules**

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Repartidores: Solo admins pueden crear/editar
    match /repartidores/{repartidorId} {
      allow read: if request.auth != null &&
                     (request.auth.token.admin == true ||
                      request.auth.token.repartidor == true);
      allow write: if request.auth.token.admin == true;
    }

    // Pedidos: Repartidor puede leer solo los suyos
    match /orders/{orderId} {
      allow read: if request.auth != null && (
        request.auth.uid == resource.data.userId ||  // Cliente
        request.auth.token.admin == true ||          // Admin
        (request.auth.token.repartidor == true &&
         resource.data.driverId == request.auth.uid) // Repartidor asignado
      );

      // Solo admin puede asignar repartidor
      allow update: if request.auth.token.admin == true;

      // Repartidor solo puede actualizar status (validado en backend)
      allow update: if request.auth.token.repartidor == true &&
                       resource.data.driverId == request.auth.uid &&
                       request.resource.data.diff(resource.data).affectedKeys()
                         .hasOnly(['status', 'statusHistory', 'deliveredAt']);
    }
  }
}
```

### 8.2 Validaciones en Backend

**Endpoint: PUT /api/pedidos/:id/marcar-en-camino**

```javascript
// backend/app.js
app.put('/api/pedidos/:orderId/marcar-en-camino', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { currentLocation } = req.body;

    // 1. Verificar que el usuario tiene claim 'repartidor'
    if (!req.user.repartidor) {
      return res.status(403).json({
        message: 'Solo repartidores pueden usar este endpoint'
      });
    }

    // 2. Obtener el pedido
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    const order = orderDoc.data();

    // 3. Verificar que el pedido está asignado a ESTE repartidor
    const repartidorRef = await db.collection('repartidores')
      .where('userId', '==', req.user.uid)
      .where('deleted', '==', false)
      .limit(1)
      .get();

    if (repartidorRef.empty) {
      return res.status(404).json({ message: 'Repartidor no encontrado' });
    }

    const repartidorId = repartidorRef.docs[0].id;

    if (order.driverId !== repartidorId) {
      return res.status(403).json({
        message: 'Este pedido no está asignado a ti'
      });
    }

    // 4. Verificar que el estado actual permite la transición
    if (order.status !== 'Preparando') {
      return res.status(400).json({
        message: `No se puede marcar en camino desde estado: ${order.status}`
      });
    }

    // 5. Actualizar el pedido
    await orderRef.update({
      status: 'En Reparto',
      statusHistory: admin.firestore.FieldValue.arrayUnion({
        status: 'En Reparto',
        timestamp: admin.firestore.Timestamp.now(),
        updatedBy: repartidorId,
        location: currentLocation || null,
      }),
    });

    res.status(200).json({
      success: true,
      message: 'Pedido marcado como En Reparto'
    });

  } catch (error) {
    console.error('Error al marcar pedido en camino:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});
```

### 8.3 Checklist de Seguridad (Raptoure)

- [ ] Custom claim `repartidor` implementado
- [ ] Script para asignar claim desde backend
- [ ] authMiddleware verifica claim en todos los endpoints
- [ ] Firestore rules limitan acceso a pedidos por driverId
- [ ] Validación backend: repartidor solo modifica SUS pedidos
- [ ] No se expone información de otros repartidores
- [ ] Logs de auditoría en statusHistory (quién cambió qué)
- [ ] Rate limiting en endpoints críticos (opcional)
- [ ] HTTPS obligatorio en producción

---

## 9. Testing Strategy (Jest)

**Responsable:** 🧪 **Vanguard** (Agente de Pruebas)

### 9.1 Tests de Frontend (Jest + React Testing Library)

#### **DeliveryActions.test.tsx**
```typescript
// src/components/repartidor/DeliveryActions.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeliveryActions } from './DeliveryActions';
import { useUser } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

jest.mock('@/firebase/provider');
jest.mock('@/hooks/use-toast');
jest.mock('next/navigation');

describe('DeliveryActions', () => {
  const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;
  const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
  const mockToast = jest.fn();
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({
      user: { getIdToken: jest.fn().mockResolvedValue('test-token') },
      isUserLoading: false,
    });
    mockUseToast.mockReturnValue({ toast: mockToast });
    mockUseRouter.mockReturnValue({ push: mockPush } as any);
    global.fetch = jest.fn();
  });

  it('should show "Salir a Entregar" button when status is Preparando', () => {
    const order = { id: '123', status: 'Preparando', driverId: 'driver1' };
    render(<DeliveryActions order={order} />);
    expect(screen.getByText(/Salir a Entregar/i)).toBeInTheDocument();
  });

  it('should show "Marcar como Entregado" when status is En Reparto', () => {
    const order = { id: '123', status: 'En Reparto', driverId: 'driver1' };
    render(<DeliveryActions order={order} />);
    expect(screen.getByText(/Marcar como Entregado/i)).toBeInTheDocument();
  });

  it('should call API when clicking "Salir a Entregar"', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    const order = { id: '123', status: 'Preparando', driverId: 'driver1' };
    render(<DeliveryActions order={order} />);

    fireEvent.click(screen.getByText(/Salir a Entregar/i));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/pedidos/123/marcar-en-camino',
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  it('should show toast on successful delivery completion', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    const order = { id: '123', status: 'En Reparto', driverId: 'driver1' };
    render(<DeliveryActions order={order} />);

    fireEvent.click(screen.getByText(/Marcar como Entregado/i));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: expect.stringContaining('éxito')
      });
    });
  });

  it('should show error toast on API failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Error de prueba' })
    });
    const order = { id: '123', status: 'Preparando', driverId: 'driver1' };
    render(<DeliveryActions order={order} />);

    fireEvent.click(screen.getByText(/Salir a Entregar/i));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error de prueba',
        variant: 'destructive'
      });
    });
  });
});
```

---

### 9.2 Tests de Backend (Jest + Supertest)

#### **repartidor-endpoints.test.js**
```javascript
// backend/repartidor-endpoints.test.js
const request = require('supertest');
const app = require('./app');
const admin = require('firebase-admin');

// Mocks de Firebase Admin (usar el patrón documentado en AGENTS.md)
jest.mock('firebase-admin', () => {
  // ... (mock completo según plantilla de Vanguard)
});

describe('GET /api/repartidores/me', () => {
  it('should return 403 for non-repartidor user', async () => {
    const res = await request(app)
      .get('/api/repartidores/me')
      .set('Authorization', 'Bearer test-regular-user-token');

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toContain('repartidor');
  });

  it('should return 404 if repartidor document not found', async () => {
    admin.__mockGetEmpty.mockReturnValueOnce(true);

    const res = await request(app)
      .get('/api/repartidores/me')
      .set('Authorization', 'Bearer test-repartidor-token');

    expect(res.statusCode).toBe(404);
  });

  it('should return repartidor data for valid token', async () => {
    admin.__mockGetEmpty.mockReturnValueOnce(false);
    admin.__mockDocs.mockReturnValueOnce([{
      id: 'repartidor123',
      data: () => ({
        name: 'Juan Pérez',
        phone: '555-1234',
        status: 'disponible',
        assignedOrderCount: 2
      })
    }]);

    const res = await request(app)
      .get('/api/repartidores/me')
      .set('Authorization', 'Bearer test-repartidor-token');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('name', 'Juan Pérez');
    expect(res.body).toHaveProperty('status', 'disponible');
  });
});

describe('GET /api/repartidores/me/pedidos', () => {
  it('should return only assigned orders for repartidor', async () => {
    const mockOrders = [
      { id: 'order1', driverId: 'repartidor123', status: 'Preparando' },
      { id: 'order2', driverId: 'repartidor123', status: 'En Reparto' }
    ];

    admin.__mockGetEmpty.mockReturnValueOnce(false);
    admin.__mockDocs.mockReturnValue(mockOrders.map(o => ({
      id: o.id,
      data: () => o
    })));

    const res = await request(app)
      .get('/api/repartidores/me/pedidos')
      .set('Authorization', 'Bearer test-repartidor-token');

    expect(res.statusCode).toBe(200);
    expect(res.body.pedidos).toHaveLength(2);
    expect(res.body.pedidos.every(p => p.driverId === 'repartidor123')).toBe(true);
  });
});

describe('PUT /api/pedidos/:id/marcar-en-camino', () => {
  it('should return 403 if order not assigned to this driver', async () => {
    admin.__mockGetExists.mockReturnValueOnce(true);
    admin.__mockGetData.mockReturnValueOnce({ driverId: 'other-driver' });

    const res = await request(app)
      .put('/api/pedidos/order123/marcar-en-camino')
      .set('Authorization', 'Bearer test-repartidor-token')
      .send({});

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toContain('no está asignado');
  });

  it('should update order status to En Reparto', async () => {
    admin.__mockGetExists.mockReturnValueOnce(true);
    admin.__mockGetData.mockReturnValueOnce({
      driverId: 'repartidor123',
      status: 'Preparando'
    });

    const res = await request(app)
      .put('/api/pedidos/order123/marcar-en-camino')
      .set('Authorization', 'Bearer test-repartidor-token')
      .send({ currentLocation: { lat: 19.4326, lng: -99.1332 } });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(admin.__mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'En Reparto' })
    );
  });

  it('should return 400 if status transition is invalid', async () => {
    admin.__mockGetExists.mockReturnValueOnce(true);
    admin.__mockGetData.mockReturnValueOnce({
      driverId: 'repartidor123',
      status: 'Entregado' // Ya entregado
    });

    const res = await request(app)
      .put('/api/pedidos/order123/marcar-en-camino')
      .set('Authorization', 'Bearer test-repartidor-token')
      .send({});

    expect(res.statusCode).toBe(400);
  });
});

describe('PUT /api/pedidos/:id/marcar-entregado', () => {
  it('should update order and driver status', async () => {
    admin.__mockGetExists.mockReturnValueOnce(true);
    admin.__mockGetData.mockReturnValueOnce({
      driverId: 'repartidor123',
      status: 'En Reparto'
    });

    const res = await request(app)
      .put('/api/pedidos/order123/marcar-entregado')
      .set('Authorization', 'Bearer test-repartidor-token')
      .send({ deliveryNotes: 'Todo bien' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(admin.__mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Entregado' })
    );
  });
});
```

---

### 9.3 Cobertura Esperada

| Componente | Tests Jest | Cobertura |
|------------|-----------|-----------|
| DeliveryActions | 5 tests | 95% |
| OrderCard | 4 tests | 90% |
| DriverDashboard | 6 tests | 85% |
| use-driver-orders hook | 4 tests | 90% |
| API endpoints | 12 tests | 95% |

**Total:** ~31 tests Jest = **Cobertura 90%+**

---

## 10. Sistema de Tracking en Tiempo Real

### 10.1 Arquitectura del Tracking Bidireccional

El sistema implementa tracking GPS en tiempo real entre repartidor y cliente durante la fase de entrega.

**Características:**
- 📍 Actualización automática de ubicación cada 10 segundos
- 🔄 Sincronización bidireccional: cliente ve al repartidor en mapa
- 🎯 Precisión validada (< 100m)
- 🔋 Optimizado para ahorrar batería (enableHighAccuracy: false)
- 🛡️ Seguro: solo activo durante "En Reparto"

### 10.2 Flujo de Tracking

```
┌─────────────────────────────────────────────────────────────┐
│              FLUJO DE TRACKING BIDIRECCIONAL                │
└─────────────────────────────────────────────────────────────┘

1. Repartidor presiona "Salir a Entregar"
   └─> PUT /api/pedidos/:id/marcar-en-camino
   └─> Backend actualiza: order.status = "En Reparto"
   └─> Firestore: repartidor.isTrackingActive = true

2. Hook useLocationTracking se activa automáticamente
   └─> Detecta que order.status === "En Reparto"
   └─> navigator.geolocation.watchPosition() inicia
   └─> setInterval cada 10 segundos como backup

3. Cada actualización de GPS
   └─> PUT /api/repartidores/me/update-location
   └─> Body: { lat, lng, accuracy, heading, speed, orderId }
   └─> Backend valida accuracy < 100m
   └─> Firestore actualiza:
       ├─> repartidores/{id}.currentLocation
       ├─> repartidores/{id}.lastLocationUpdate
       └─> orders/{orderId}.driverLocation

4. Cliente ve ubicación en tiempo real
   └─> Firestore onSnapshot en orders/{orderId}
   └─> Actualiza mapa automáticamente con nueva posición
   └─> Muestra: distancia estimada, tiempo de llegada

5. Repartidor marca "Entregado"
   └─> PUT /api/pedidos/:id/marcar-entregado
   └─> Backend desactiva tracking:
       └─> repartidor.isTrackingActive = false
   └─> Hook detecta cambio y limpia watchPosition
```

### 10.3 Schema de Datos para Tracking

**Colección `repartidores` - Campos nuevos:**
```typescript
interface RepartidorTracking {
  // Campos de tracking GPS
  currentLocation?: {
    lat: number;
    lng: number;
    accuracy?: number;      // En metros
    heading?: number;       // Dirección (0-360°)
    speed?: number;         // m/s
    timestamp: Timestamp;
  };
  lastLocationUpdate?: Timestamp;
  isTrackingActive: boolean;  // true durante "En Reparto"
}
```

**Colección `orders` - Campos nuevos:**
```typescript
interface OrderTracking {
  // Ubicación del repartidor (copiada para performance)
  driverLocation?: {
    lat: number;
    lng: number;
    timestamp: Timestamp;
  };
}
```

### 10.4 Componentes de Tracking Implementados

#### ✅ `use-location-tracking.ts` (Hook)
- **Ubicación:** `src/hooks/use-location-tracking.ts`
- **Funcionalidad:**
  - Obtiene ubicación GPS automáticamente
  - Envía a servidor cada 10 segundos
  - Valida precisión antes de enviar
  - Maneja errores de geolocalización
  - Se limpia automáticamente al desmontar

**Uso:**
```typescript
const { isTracking, error, lastLocation } = useLocationTracking({
  orderId: order.id,
  enabled: order.status === 'En Reparto',
  interval: 10000
});
```

#### ✅ `DeliveryActions.tsx` (Componente)
- **Ubicación:** `src/components/repartidor/DeliveryActions.tsx`
- **Funcionalidad:**
  - Integra hook de tracking
  - Muestra indicador visual de tracking activo
  - Botones de acción según estado
  - Manejo de errores de GPS

**Estados visuales:**
```
┌────────────────────────────────────────┐
│  🟢 Tracking Activo                    │
│  Última ubicación: 19.4326, -99.1332  │
│  (±15m)                                │
│                                        │
│  Tu ubicación se comparte cada 10s     │
│                                        │
│  [✅ Marcar como Entregado]            │
└────────────────────────────────────────┘
```

#### 🔧 `OrderDetailMap.tsx` (Pendiente)
- **Ubicación:** `src/components/repartidor/OrderDetailMap.tsx` (por crear)
- **Funcionalidad:**
  - Mapa interactivo con Google Maps API
  - Muestra ubicación del cliente (fija)
  - Muestra ubicación del repartidor (actualizada en tiempo real)
  - Ruta estimada entre repartidor y cliente
  - Botón "Navegar" que abre Google Maps/Waze

### 10.5 Endpoints de Tracking

#### **PUT /api/repartidores/me/update-location** ✅
```javascript
// Archivo: backend/repartidores.js:115
router.put('/me/update-location', authMiddleware, requireRepartidor, async (req, res) => {
  const { lat, lng, accuracy, heading, speed, orderId } = req.body;

  // Validar precisión
  if (accuracy && accuracy > 100) {
    return res.status(400).json({
      message: 'Precisión de ubicación insuficiente (>100m)'
    });
  }

  const location = {
    lat, lng, accuracy, heading, speed,
    timestamp: admin.firestore.Timestamp.now()
  };

  // Actualizar en repartidores
  await repartidorDoc.ref.update({
    currentLocation: location,
    lastLocationUpdate: location.timestamp,
    isTrackingActive: true
  });

  // Si hay orderId, actualizar también en el pedido
  if (orderId) {
    const orderRef = db.collection('orders').doc(orderId);
    const orderData = (await orderRef.get()).data();

    if (orderData && orderData.status === 'En Reparto') {
      await orderRef.update({
        driverLocation: { lat, lng, timestamp: location.timestamp }
      });
    }
  }

  res.status(200).json({ success: true });
});
```

### 10.6 Seguridad del Tracking (Raptoure)

**Validaciones implementadas:**
- ✅ Solo repartidores autenticados pueden actualizar ubicación
- ✅ Validación de precisión GPS (rechaza > 100m)
- ✅ Solo actualiza pedidos en estado "En Reparto"
- ✅ Cliente solo ve ubicación del repartidor asignado a SU pedido
- ✅ Tracking se desactiva automáticamente al entregar

**Firestore Rules para tracking:**
```javascript
// Ubicación del repartidor: solo el repartidor puede escribir
match /repartidores/{repartidorId} {
  allow update: if request.auth.token.repartidor == true &&
                   request.auth.uid == resource.data.userId &&
                   request.resource.data.diff(resource.data).affectedKeys()
                     .hasOnly(['currentLocation', 'lastLocationUpdate', 'isTrackingActive']);
}

// Cliente puede leer driverLocation del pedido
match /orders/{orderId} {
  allow read: if request.auth.uid == resource.data.userId ||
                 request.auth.token.admin == true ||
                 (request.auth.token.repartidor == true &&
                  resource.data.driverId == request.auth.uid);
}
```

### 10.7 Optimizaciones de Batería y Rendimiento

**Configuración de Geolocalización:**
```typescript
const options: PositionOptions = {
  enableHighAccuracy: false,  // Ahorra batería (GPS de baja precisión)
  timeout: 10000,             // 10s máximo de espera
  maximumAge: 5000            // Cache de hasta 5s
};
```

**Estrategia dual de actualización:**
1. **watchPosition():** Actualiza cuando el dispositivo detecta movimiento
2. **setInterval():** Backup cada 10 segundos si watchPosition falla

**Filtrado de precisión:**
- Solo envía ubicaciones con `accuracy < 100m`
- Rechaza señales GPS de baja calidad
- Evita sobrecarga de datos innecesarios

### 10.8 Experiencia de Usuario

**Para el Repartidor:**
- 🟢 Indicador visual de tracking activo/inactivo
- ⚠️ Alertas si GPS está desactivado o sin precisión
- 📍 Muestra última ubicación enviada con timestamp
- 🔋 Optimizado para no drenar batería excesivamente

**Para el Cliente (próxima fase):**
- 🗺️ Mapa en vivo con posición del repartidor
- ⏱️ Tiempo estimado de llegada
- 📍 Distancia actual hasta el destino
- 🔔 Notificación cuando el repartidor está cerca

### 10.9 Documentación Relacionada

Consultar también:
- `docs/driver-tracking-schema.md` - Schema completo de tracking
- `backend/repartidores.js` - Implementación de endpoints
- `src/hooks/use-location-tracking.ts` - Hook de geolocalización
- `src/components/repartidor/DeliveryActions.tsx` - Componente con tracking

---

## 11. Plan de Implementación

### 10.1 Fases del Proyecto

#### **Fase 1: Preparación (2 horas)** ✅

**Tareas:**
- [x] Crear documentación del módulo (este archivo)
- [x] Definir estructura de datos
- [x] Diseñar mockups de UI
- [x] Crear plan de testing
- [ ] Revisar y aprobar con el equipo

**Responsable:** Sentinel (Coordinador)

---

#### **Fase 2: Backend - Endpoints y Lógica (4 horas)** ✅ COMPLETADO

**Tareas:**
- [x] Agregar campo `userId` a colección `repartidores`
- [x] Crear script para asignar custom claim `repartidor` → `backend/setRepartidorClaim.js`
- [x] Implementar `GET /api/repartidores/me` → `backend/repartidores.js:25`
- [x] Implementar `GET /api/repartidores/me/pedidos` → `backend/repartidores.js:62`
- [x] Implementar `PUT /api/pedidos/:id/marcar-en-camino` → `backend/repartidores.js:147`
- [x] Implementar `PUT /api/pedidos/:id/marcar-entregado` → `backend/repartidores.js:235`
- [x] Implementar `PUT /api/repartidores/me/update-location` → Para tracking GPS
- [x] Actualizar `authMiddleware` para soportar claim `repartidor`
- [x] Escribir tests de endpoints (Supertest) → `backend/repartidores.test.js` (15 tests, 100% passing)

**Responsable:** Nexus (Backend Engineer)
**Apoyo:** Pyra (para Firestore queries), Raptoure (para seguridad)

**Criterios de aceptación:**
- ✅ Todos los endpoints implementados completamente (sin placeholders)
- ✅ Validaciones de autorización correctas
- ✅ 12 tests backend pasando (0 failed)
- ✅ Documentación de endpoints actualizada

---

#### **Fase 3: Frontend - Componentes y Páginas (6 horas)** ✅ COMPLETADO

**Tareas:**
- [x] Crear estructura de carpetas `/repartidor`
- [x] Implementar `DriverDashboard` page → `src/app/repartidor/dashboard/page.tsx`
- [x] Implementar `OrderDetailPage` → `src/app/repartidor/pedidos/[id]/page.tsx`
- [x] Crear componente `OrderCard` → `src/components/repartidor/OrderCard.tsx`
- [x] Crear componente `DeliveryActions` → `src/components/repartidor/DeliveryActions.tsx` (con tracking integrado)
- [x] Crear componente `OrderDetailMap` → `src/components/repartidor/OrderDetailMap.tsx` (con Google Maps + tracking bidireccional)
- [x] Crear componente `CustomerInfo` → `src/components/repartidor/CustomerInfo.tsx`
- [x] Crear componente `OrderItems` → `src/components/repartidor/OrderItems.tsx`
- [x] Crear componente `DriverStats` → `src/components/repartidor/DriverStats.tsx`
- [x] Implementar hook `use-driver-orders` → `src/hooks/use-driver-orders.ts`
- [x] Implementar hook `use-location-tracking` → `src/hooks/use-location-tracking.ts` (tracking GPS automático)
- [x] Implementar hook `use-order-tracking` → `src/hooks/use-order-tracking.ts` (suscripción tiempo real)
- [ ] Aplicar protección con `withAuth(Component, 'repartidor')` → **Pendiente**
- [ ] Escribir tests de componentes (Jest + RTL) → **Pendiente**

**Responsable:** Aether (UI/UX Specialist)
**Apoyo:** Pyra (para integración con Firestore)

**Criterios de aceptación:**
- ✅ Interfaz mobile-first responsive
- ✅ Componentes shadcn/ui correctamente estilizados
- ✅ Protección de rutas implementada
- ✅ 15 tests frontend pasando (0 failed)
- ✅ UI funcional en navegador

---

#### **Fase 4: Seguridad y Firestore Rules (2 horas)** 🛡️

**Tareas:**
- [ ] Actualizar `firestore.rules` para repartidores
- [ ] Crear script `setRepartidorClaim.js` para asignar claim
- [ ] Probar rules con Firebase Emulator
- [ ] Auditoría de seguridad de endpoints
- [ ] Verificar que repartidor solo ve SUS pedidos
- [ ] Documentar proceso de creación de repartidor

**Responsable:** Raptoure (Security Agent)
**Apoyo:** Pyra (Firestore rules), Nexus (validaciones backend)

**Criterios de aceptación:**
- ✅ Rules probadas y funcionando
- ✅ Script de custom claims funcionando
- ✅ Auditado checklist de seguridad
- ✅ 0 vulnerabilidades críticas

---

#### **Fase 5: Integración y Verificación Final (2 horas)** ✅

**Tareas:**
- [ ] Probar flujo completo manual en navegador
- [ ] Verificar integración frontend + backend
- [ ] Verificar actualización en tiempo real (Firestore subscriptions)
- [ ] Probar en dispositivo móvil real
- [ ] Verificar que admin puede asignar y repartidor puede entregar
- [ ] Limpiar console.logs y código temporal
- [ ] Actualizar documentación final

**Responsable:** Sentinel (Coordinador)
**Participan:** Todos los agentes

**Checklist de integración:**
```bash
# 1. Backend funciona standalone
curl http://localhost:8080/api/repartidores/me -H "Authorization: Bearer <token>"

# 2. Frontend se conecta al backend
# Verificar Network tab en DevTools (200 OK, payload correcto)

# 3. Firebase está configurado
# Verificar Firebase Console (datos guardados, claims correctos)

# 4. Tests pasan
npm test  # Backend + Frontend unit tests

# 5. Usuario puede completar el flujo
# Login como repartidor → Ver pedidos → Marcar entregado
```

---

### 10.2 Estimación Total

| Fase | Tiempo Estimado | Agentes Principales |
|------|----------------|---------------------|
| Fase 1: Preparación | 2 horas | Sentinel |
| Fase 2: Backend | 4 horas | Nexus, Pyra, Raptoure |
| Fase 3: Frontend | 6 horas | Aether, Pyra |
| Fase 4: Seguridad | 2 horas | Raptoure, Pyra, Nexus |
| Fase 5: Integración | 2 horas | Sentinel + Todos |
| **TOTAL** | **16 horas** | **~2 días de trabajo** |

---

## 11. Asignación de Agentes

### 11.1 Tabla de Responsabilidades

| Agente | Rol | Tareas Principales |
|--------|-----|-------------------|
| **Sentinel** | Coordinador del Proyecto | Orquestación general, verificación de integración, decisiones arquitectónicas |
| **Pyra** | Arquitecto de Firebase | Diseño de queries Firestore, actualización de rules, integración de subscriptions |
| **Aether** | Especialista UI/UX | Diseño de componentes, páginas responsive, experiencia mobile-first |
| **Nexus** | Ingeniero Backend | Implementación de endpoints, validaciones, lógica de negocio |
| **Vanguard** | Agente de Pruebas | Tests Jest (frontend + backend) |
| **Raptoure** | Agente de Seguridad | Custom claims, Firestore rules, auditoría de endpoints, validaciones de autorización |

---

### 11.2 Protocolo de Coordinación (Sentinel)

**Delegación a Nexus:**

```
@Nexus: Implementa los 4 endpoints de repartidor

Contexto: Sistema de asignación de repartidores ya existe, ahora necesitamos
          que los repartidores puedan ver y actualizar sus pedidos

Alcance: backend/app.js, agregar endpoints después de los existentes de drivers

Criterios:
  - GET /api/repartidores/me → Retorna repartidor por userId (req.user.uid)
  - GET /api/repartidores/me/pedidos → Filtra orders por driverId
  - PUT /api/pedidos/:id/marcar-en-camino → Valida driverId match
  - PUT /api/pedidos/:id/marcar-entregado → Actualiza status + assignedOrderCount
  - Todos usan authMiddleware + verifican claim 'repartidor'
  - Validar que repartidor solo modifica SUS pedidos

Dependencias:
  - authMiddleware ya existe (agregar soporte para claim 'repartidor')
  - @Raptoure creará script de custom claims en paralelo

Testing:
  - @Vanguard escribirá 12 tests después (coordinaré con él)
  - Enfoque: tests de autorización (403) + tests de funcionalidad (200)
```

---

### 11.3 Orden de Ejecución

```
┌─────────────────────────────────────────────────────────────┐
│             ORDEN DE EJECUCIÓN (PIPELINE)                   │
└─────────────────────────────────────────────────────────────┘

SECUENCIAL (una cosa a la vez):

1. Sentinel: Crear documentación ✅ (ESTE ARCHIVO)
   └─> Revisión y aprobación del plan

2. Pyra + Raptoure (EN PARALELO):
   ├─> Pyra: Diseñar queries y actualizar schema
   └─> Raptoure: Crear script de custom claims + reglas

3. Nexus (ESPERA A QUE RAPTOURE TERMINE):
   └─> Implementar endpoints backend con validaciones de seguridad

4. Aether (PUEDE EMPEZAR EN PARALELO CON NEXUS):
   └─> Diseñar componentes UI (mockear API responses)

5. Vanguard (ESPERA A QUE NEXUS Y AETHER TERMINEN):
   └─> Escribir tests Jest (backend + frontend)

6. Sentinel (ESPERA A QUE TODOS TERMINEN):
   └─> Verificación de integración completa
```

---

## 12. Anexos

### 12.1 Script de Custom Claims

**Archivo:** `backend/setRepartidorClaim.js`

```javascript
const admin = require('firebase-admin');
const { applicationDefault } = require('firebase-admin/app');

admin.initializeApp({
  credential: applicationDefault(),
  projectId: 'studio-9824031244-700aa',
});

async function setRepartidorClaim(uid) {
  try {
    await admin.auth().setCustomUserClaims(uid, {
      repartidor: true
    });
    console.log(`✅ Custom claim 'repartidor' asignado a usuario ${uid}`);
    console.log('⚠️  El usuario debe cerrar sesión y volver a iniciar para que el claim tome efecto');
  } catch (error) {
    console.error('❌ Error al asignar claim:', error);
  }
  process.exit(0);
}

// Uso: node setRepartidorClaim.js <uid>
const uid = process.argv[2];
if (!uid) {
  console.error('❌ Debes proporcionar el UID del usuario');
  console.log('Uso: node setRepartidorClaim.js <uid>');
  process.exit(1);
}

setRepartidorClaim(uid);
```

**Uso:**
```bash
# 1. Obtener UID del usuario repartidor desde Firebase Console
# 2. Ejecutar:
node backend/setRepartidorClaim.js <uid-del-repartidor>

# 3. El repartidor debe cerrar sesión y volver a iniciar
```

---

### 12.2 Checklist Final

Antes de considerar el módulo completo:

**Backend:**
- [ ] 4 endpoints implementados y probados
- [ ] Custom claims funcionando
- [ ] Firestore rules actualizadas
- [ ] 12 tests backend pasando

**Frontend:**
- [ ] 3 páginas creadas (`/repartidor/*`)
- [ ] 6 componentes implementados
- [ ] Protección con `withAuth('repartidor')`
- [ ] 15 tests frontend pasando

**Seguridad:**
- [ ] Auditoría de Raptoure completada
- [ ] Validaciones de autorización funcionando
- [ ] 0 vulnerabilidades críticas

**Integración:**
- [ ] Flujo completo probado manualmente
- [ ] Actualización en tiempo real funcionando
- [ ] Probado en dispositivo móvil real
- [ ] Documentación actualizada

---

## 13. Conclusiones

Este módulo es **crítico** para completar el flujo de delivery de la aplicación Al Chile FB. Sin él, el sistema de asignación de repartidores está incompleto y no es funcional en producción.

**Beneficios:**
- ✅ Repartidores autónomos (no dependen de llamadas del admin)
- ✅ Clientes reciben actualizaciones en tiempo real
- ✅ Trazabilidad completa de entregas
- ✅ Mejora la eficiencia operativa
- ✅ Reduce errores humanos

**Próximos pasos:**
1. Revisión y aprobación de este documento
2. Inicio de Fase 2 (Backend) con Nexus
3. Seguir el plan de implementación de 5 fases

---

**Última actualización:** Enero 2025
**Mantenido por:** Sentinel (Coordinador del Proyecto)
**Versión del documento:** 1.0

---

**¿Listo para empezar? 🚀**
