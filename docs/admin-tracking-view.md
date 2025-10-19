# Vista de Tracking para Super Admin

**Proyecto**: Al Chile FB - Delivery App
**Fecha**: Enero 18, 2025
**Funcionalidad**: Seguimiento en tiempo real de repartidores desde el panel de control

---

## 🎯 Funcionalidad

El super admin puede **ver en tiempo real** la ubicación de cualquier repartidor y su pedido activo desde el panel de control.

---

## 📍 URL para Super Admin

### Gestión de Repartidores
**URL**: `/control/repartidores`

**Ubicación en el navbar**:
- Sección "Gestión"
- Después de "Clientes"
- Ícono: 🚚 (Truck)
- Visible para: `admin` y `super_admin`

---

## 🗺️ Cómo Funciona

### Paso 1: Ver Lista de Repartidores

En `/control/repartidores` verás una tabla con todos los repartidores:

| Nombre | Contacto | Vehículo | Estado | Acciones |
|--------|----------|----------|--------|----------|
| Juan Pérez | 555-1234 | Moto | 🟢 Disponible | 📍 🖊️ |
| María García | 555-5678 | Bici | 🟡 Ocupado | 📍 🖊️ |

**Columnas**:
- **Nombre**: Nombre completo del repartidor
- **Contacto**: Teléfono
- **Vehículo**: Tipo de vehículo
- **Estado**:
  - 🟢 Disponible (verde)
  - 🟡 Ocupado (amarillo)
  - ⚫ Offline (gris)
- **Acciones**:
  - 📍 **Ver Tracking** (ícono de mapa azul)
  - 🖊️ **Editar** (ícono de lápiz naranja)

---

### Paso 2: Ver Tracking en Tiempo Real

Al hacer clic en el **ícono de mapa 📍**, se abre un diálogo de seguimiento en vivo.

#### Vista del Diálogo de Tracking

```
┌────────────────────────────────────────────────────────────┐
│  🧭 Tracking en Vivo - Juan Pérez                          │
│  Seguimiento en tiempo real de la ubicación del repartidor │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ 🟢 Tracking  │  │ 🕐 Última     │  │ 📦 Pedido    │    │
│  │   Activo     │  │   15:42:30    │  │   #A3F2B1    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │              [MAPA INTERACTIVO]                       │  │
│  │                                                       │  │
│  │    🔵 Repartidor (ubicación actual)                  │  │
│  │    🔴 Cliente (destino)                              │  │
│  │                                                       │  │
│  │    Leyenda:                                          │  │
│  │    🔵 Repartidor   🔴 Cliente                        │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 📦 Detalles del Pedido Activo                        │  │
│  │                                                       │  │
│  │  👤 Cliente:          📍 Dirección:                  │  │
│  │  María González        Calle Principal 123           │  │
│  │  📞 555-9876           Ciudad, Estado                │  │
│  │                                                       │  │
│  │  Estado: 🟢 En Reparto                               │  │
│  │  Total: $450.00                                      │  │
│  │  Pago: Efectivo                                      │  │
│  │  Items: 3 productos                                  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│                               [Cerrar]                      │
└────────────────────────────────────────────────────────────┘
```

---

## 📊 Información en Tiempo Real

### Tarjetas de Estado (3 cards superiores)

#### 1. Estado del Tracking
- **🟢 Tracking Activo**: El repartidor está en reparto y GPS activo
- **⚫ Sin tracking**: No hay pedido activo o GPS desactivado

#### 2. Última Actualización
- Muestra la hora exacta de la última ubicación recibida
- Formato: `15:42:30` (HH:MM:SS)
- Se actualiza automáticamente cada 10 segundos

#### 3. Pedido Activo
- Muestra el ID del pedido: `#A3F2B1`
- Si no hay pedido: `Ninguno`

---

### Mapa Interactivo

**Características**:
- **Mapa oscuro** (dark theme) para mejor visualización
- **Zoom y pan** interactivos
- **Controles**:
  - Zoom (+/-)
  - Tipo de mapa (satélite, terreno)
  - Pantalla completa

**Marcadores**:
- 🔵 **Marcador Azul**: Ubicación actual del repartidor (se actualiza cada 10s)
- 🔴 **Marcador Rojo**: Ubicación del cliente (fija)

**Actualización automática**:
- El mapa se centra automáticamente en el repartidor
- Cada 10 segundos, el marcador azul se mueve a la nueva posición
- **NO necesitas refrescar la página**, todo es en tiempo real

---

### Detalles del Pedido Activo

Si el repartidor tiene un pedido activo, se muestra:

**Información del Cliente**:
- 👤 Nombre del cliente
- 📞 Teléfono de contacto
- 📍 Dirección completa de entrega

**Estado del Pedido**:
- Badge con el estado actual:
  - 🟡 **Preparando** (naranja)
  - 🟢 **En Reparto** (verde)
- 💰 Total del pedido
- 💳 Método de pago
- 📦 Cantidad de productos

---

## 🔄 Actualización en Tiempo Real (Firestore)

### Tecnología: Firestore onSnapshot

El tracking funciona con **suscripciones en tiempo real** de Firestore:

```javascript
// Suscripción automática cada 10 segundos
onSnapshot(repartidorDoc, (snapshot) => {
  // Actualiza ubicación del repartidor
  setDriverLocation(snapshot.data().currentLocation);
  setLastUpdate(new Date());
});

onSnapshot(orderQuery, (snapshot) => {
  // Actualiza pedido activo
  setActiveOrder(snapshot.data());
});
```

**Ventajas**:
- ✅ Sin necesidad de refrescar la página
- ✅ Latencia < 1 segundo
- ✅ Consume menos recursos que polling
- ✅ Se actualiza automáticamente cuando:
  - El repartidor se mueve (cada 10s)
  - El pedido cambia de estado
  - Se asigna un nuevo pedido

---

## 🎯 Casos de Uso

### Caso 1: Repartidor con Pedido Activo "En Reparto"
**Estado**: 🟢 Tracking Activo

**Lo que verás**:
- Marcador azul 🔵 moviéndose en el mapa cada 10s
- Marcador rojo 🔴 en la ubicación del cliente
- Información completa del pedido
- Última actualización en tiempo real

**Ideal para**:
- Monitorear entregas en progreso
- Estimar tiempo de llegada
- Dar soporte al cliente ("El repartidor está a 5 minutos")

---

### Caso 2: Repartidor con Pedido "Preparando"
**Estado**: ⚫ Sin tracking

**Lo que verás**:
- Información del pedido activo
- Sin ubicación en el mapa (aún no sale a entregar)
- Mensaje: "Tracking no disponible"

**Por qué**: El tracking GPS solo se activa cuando el repartidor presiona "Salir a Entregar".

---

### Caso 3: Repartidor sin Pedido Activo
**Estado**: ⚫ Sin tracking

**Lo que verás**:
- Mensaje: "Tracking no disponible"
- "El repartidor no tiene un pedido activo"

**Solución**: Asigna un pedido desde `/control/pedidos`.

---

## 🛠️ Archivos Implementados

```
src/components/control/
└── DriverTrackingDialog.tsx        ← NUEVO: Diálogo de tracking en vivo

src/components/control/DriversTable.tsx  ← MODIFICADO: Botón de tracking

src/app/control/repartidores/page.tsx    ← MODIFICADO: Integración del diálogo

src/lib/navigation.ts                    ← MODIFICADO: Enlace en navbar
```

---

## 📱 Responsive Design

El diálogo de tracking es **responsive**:

- **Desktop** (> 1024px):
  - Mapa grande (500px altura)
  - 2 columnas para info del pedido
  - Diálogo max-width: 1152px

- **Tablet** (768px - 1024px):
  - Mapa medio (400px altura)
  - 1-2 columnas según espacio

- **Mobile** (< 768px):
  - Mapa pequeño (300px altura)
  - 1 columna
  - Scroll vertical
  - Optimizado para pantallas táctiles

---

## 🔒 Seguridad

### Permisos Requeridos
- Solo usuarios con rol `admin` o `super_admin` pueden acceder
- Protegido con `withAuth(Component, 'admin')`

### Datos Mostrados
- El admin puede ver la ubicación de **cualquier** repartidor
- Sin restricciones (necesario para supervisión)

### Firestore Rules (ya implementadas)
```javascript
match /repartidores/{repartidorId} {
  // Admin puede leer ubicación
  allow read: if request.auth.token.admin == true;
}

match /orders/{orderId} {
  // Admin puede leer pedidos
  allow read: if request.auth.token.admin == true;
}
```

---

## 🎓 Guía de Uso Paso a Paso

### 1. Acceder al Panel de Repartidores
- Login como super admin
- Click en "Repartidores" en el navbar (sección Gestión)
- Verás la lista de todos los repartidores

### 2. Abrir Tracking en Vivo
- Busca un repartidor con estado "Ocupado" 🟡
- Click en el ícono de mapa azul 📍
- Se abre el diálogo de tracking

### 3. Monitorear la Entrega
- **Mapa**: Verás 2 marcadores (repartidor y cliente)
- **Ubicación**: Se actualiza automáticamente cada 10s
- **Pedido**: Info completa del pedido activo
- **Tiempo**: Última actualización mostrada arriba

### 4. Cerrar el Tracking
- Click en "Cerrar" o fuera del diálogo
- El tracking se mantiene activo en segundo plano
- Puedes volver a abrirlo cuando quieras

---

## 🚀 Próximas Mejoras Sugeridas

### Funcionalidades Adicionales (Opcionales)

1. **Vista de Todos los Repartidores**
   - Un solo mapa con todos los repartidores activos
   - Filtrar por zona/estado

2. **Ruta Estimada**
   - Usar Google Directions API
   - Mostrar tiempo estimado de llegada (ETA)
   - Calcular distancia restante

3. **Historial de Ubicaciones**
   - Ver ruta completa del repartidor
   - Heatmap de zonas más visitadas

4. **Notificaciones para Admin**
   - Alerta si repartidor está detenido > 10 min
   - Notificación cuando llega al destino

5. **Estadísticas en Tiempo Real**
   - Cantidad de repartidores activos
   - Pedidos en camino
   - Mapa de calor de entregas

---

## ✅ Resumen

**¿Qué tienes ahora?**
- ✅ Enlace "Repartidores" en el navbar del admin
- ✅ Tabla con lista de repartidores
- ✅ Botón "Ver Tracking" (ícono 📍) en cada fila
- ✅ Diálogo con mapa en tiempo real
- ✅ Actualización automática cada 10 segundos
- ✅ Información del pedido activo
- ✅ Sin necesidad de refrescar la página

**URLs clave**:
- Gestión: `/control/repartidores`
- (El tracking se abre en un diálogo modal)

**Próximo paso**:
1. Accede a `/control/repartidores` como super admin
2. Haz click en el ícono 📍 de un repartidor
3. ¡Verás el tracking en vivo!

---

**Documentado por**: Claude AI
**Fecha**: Enero 18, 2025
**Versión**: 1.0
