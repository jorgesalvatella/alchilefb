# Schema para Sistema de Tracking en Tiempo Real

**Fecha**: Enero 2025
**Versión**: 1.0

---

## Cambios en la Colección `repartidores`

### Campos Nuevos:

```typescript
interface Repartidor {
  // ... campos existentes
  id: string;
  name: string;
  phone: string;
  status: 'disponible' | 'ocupado';
  assignedOrderCount: number;
  userId?: string;

  // ✨ NUEVOS CAMPOS PARA TRACKING ✨
  currentLocation?: {
    lat: number;
    lng: number;
    accuracy?: number;        // Precisión en metros
    timestamp: Timestamp;     // Cuándo se capturó la ubicación
    heading?: number;         // Dirección del movimiento (0-360 grados)
    speed?: number;           // Velocidad en m/s
  };

  isTrackingActive?: boolean; // Si está compartiendo ubicación activamente
  lastLocationUpdate?: Timestamp;
}
```

---

## Cambios en la Colección `orders`

### Campos Nuevos:

```typescript
interface Order {
  // ... campos existentes

  // ✨ NUEVOS CAMPOS PARA TRACKING ✨
  driverStartedDeliveryAt?: Timestamp;  // Cuándo marcó "En Camino"
  driverLocation?: {                     // Última ubicación conocida del repartidor
    lat: number;
    lng: number;
    timestamp: Timestamp;
  };

  estimatedArrivalTime?: Timestamp;      // ETA calculado
  distanceToDestination?: number;        // Distancia en metros
}
```

---

## Flujo de Tracking

```
┌─────────────────────────────────────────────────────────────┐
│           FLUJO DE TRACKING EN TIEMPO REAL                  │
└─────────────────────────────────────────────────────────────┘

1. Repartidor marca pedido como "En Camino"
   └─> PUT /api/pedidos/:id/marcar-en-camino
   └─> Se activa: repartidores.isTrackingActive = true
   └─> Se guarda: orders.driverStartedDeliveryAt = NOW

2. Servicio de Geolocalización (Frontend del Repartidor)
   └─> setInterval cada 10 segundos
   └─> navigator.geolocation.watchPosition()
   └─> PUT /api/repartidores/me/update-location
       {
         lat: 19.4326,
         lng: -99.1332,
         accuracy: 15,
         heading: 180,
         speed: 5.2
       }

3. Backend actualiza Firestore
   └─> repartidores/{id}.currentLocation = { lat, lng, timestamp }
   └─> orders/{orderId}.driverLocation = { lat, lng, timestamp }

4. Cliente suscrito al pedido (Firestore realtime)
   └─> onSnapshot('orders/{orderId}')
   └─> Recibe actualización de driverLocation
   └─> Actualiza mapa en tiempo real

5. Repartidor marca "Entregado"
   └─> PUT /api/pedidos/:id/marcar-entregado
   └─> Se desactiva: repartidores.isTrackingActive = false
   └─> Se detiene servicio de geolocalización
```

---

## Endpoints Nuevos

### **PUT /api/repartidores/me/update-location**

Actualiza la ubicación actual del repartidor.

**Request:**
```json
{
  "lat": 19.4326,
  "lng": -99.1332,
  "accuracy": 15,
  "heading": 180,
  "speed": 5.2,
  "orderId": "order123"  // Pedido activo en reparto
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Ubicación actualizada"
}
```

**Seguridad (Raptoure):**
- ✅ Requiere claim `repartidor: true`
- ✅ Solo actualiza su propia ubicación (verificado por userId)
- ✅ Valida que el pedido esté asignado a este repartidor
- ✅ Solo funciona si el pedido está en estado "En Reparto"

---

## Firestore Security Rules

```javascript
// Actualización de rules para permitir tracking

match /repartidores/{repartidorId} {
  // ... reglas existentes ...

  // Repartidor puede actualizar solo su ubicación
  allow update: if request.auth.token.repartidor == true &&
                   resource.data.userId == request.auth.uid &&
                   request.resource.data.diff(resource.data).affectedKeys()
                     .hasOnly(['currentLocation', 'isTrackingActive', 'lastLocationUpdate']);
}

match /orders/{orderId} {
  // ... reglas existentes ...

  // Cliente puede leer la ubicación del repartidor de su pedido
  allow read: if request.auth.uid == resource.data.userId;

  // Repartidor puede actualizar solo driverLocation de sus pedidos
  allow update: if request.auth.token.repartidor == true &&
                   resource.data.driverId == request.auth.uid &&
                   request.resource.data.diff(resource.data).affectedKeys()
                     .hasOnly(['driverLocation', 'estimatedArrivalTime', 'distanceToDestination']);
}
```

---

## Consideraciones de Performance

1. **Rate Limiting**: Máximo 1 actualización cada 10 segundos
2. **Batching**: Agrupar actualizaciones si hay múltiples pedidos
3. **Precisión**: Filtrar ubicaciones con accuracy > 100m
4. **Batería**: Usar `enableHighAccuracy: false` en móvil para ahorrar batería
5. **Cleanup**: Detener tracking cuando el pedido se marca como entregado

---

## Privacidad y Seguridad

- ✅ Ubicación solo se comparte durante "En Reparto"
- ✅ Ubicación se borra después de 24 horas (Cloud Function scheduled)
- ✅ Cliente solo ve ubicación de SU repartidor asignado
- ✅ Repartidor puede pausar/reanudar tracking manualmente
- ✅ No se guarda historial de rutas (solo ubicación actual)

---

**Última actualización:** Enero 2025
**Mantenido por:** Pyra (Arquitecto Firebase) + Raptoure (Seguridad)
