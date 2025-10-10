# Guía de Contexto de la Base de Datos (Firestore)

Este documento proporciona una visión general de la estructura de la base de datos en Firestore. Describe las colecciones, sub-colecciones y los campos clave que contienen.

**Nota Importante:** Para toda la información relacionada con la seguridad, roles, permisos y reglas de acceso, por favor consulta el documento `docs/auth-strategy.md`.

---

## Colecciones de Usuario y Pedidos

### 1. `users`
- **Ruta**: `/users/{userId}`
- **Descripción**: Almacena el perfil de cada usuario de la aplicación. El `userId` corresponde al UID de autenticación de Firebase.
- **Contenido Clave**:
    - `email`: Correo del usuario.
    - `firstName`, `lastName`: Nombre y apellido.
    - `claims`: Objeto que contiene los roles (`super_admin`, `admin`). La seguridad se basa en estos claims.
    - `spicePreference`: Nivel de picante preferido.

### 2. `orders`
- **Ruta**: `/orders/{orderId}`
- **Descripción**: Contiene el historial de todos los pedidos realizados en la aplicación.
- **Contenido Clave**:
    - `userId`: Referencia al usuario que hizo el pedido.
    - `orderDate`: Fecha del pedido.
    - `totalAmount`: Monto total.
    - `orderStatus`: Estado actual (`Pedido Realizado`, `Preparando`, `En Reparto`, `Entregado`).
- **Sub-colección**: `order_items` (`/orders/{orderId}/order_items/{orderItemId}`) que detalla cada producto del pedido.

---

## Catálogo del Negocio y Gastos

Esta sección describe la estructura jerárquica utilizada para clasificar los gastos y gestionar el catálogo interno.

### 1. `unidades-de-negocio` (Colección Raíz)
- **Ruta**: `/unidades-de-negocio/{unidadId}`
- **Descripción**: Representa una sucursal o entidad de negocio principal. Es el nivel más alto de la jerarquía del catálogo.
- **Contenido Clave**:
    - `name`: Nombre comercial (ej. "Sucursal Centro").
    - `razonSocial`, `address`, `phone`: Datos fiscales y de contacto.

### 2. `departamentos`
- **Ruta**: `/departamentos/{deptoId}`
- **Descripción**: Departamentos dentro de una unidad de negocio (ej. "Cocina", "Barra").
- **Contenido Clave**:
    - `name`: Nombre del departamento.
    - `businessUnitId`: **(Referencia)** ID del documento en `unidades-de-negocio` al que pertenece.

### 3. `grupos`
- **Ruta**: `/grupos/{grupoId}`
- **Descripción**: Agrupaciones dentro de un departamento (ej. "Bebidas", "Carnes", "Limpieza").
- **Contenido Clave**:
    - `name`: Nombre del grupo.
    - `businessUnitId`: **(Referencia)** ID de la unidad de negocio.
    - `departmentId`: **(Referencia)** ID del departamento al que pertenece.

### 4. `conceptos`
- **Ruta**: `/conceptos/{conceptoId}`
- **Descripción**: El item de gasto más específico (ej. "Coca-Cola", "Arrachera", "Servilletas").
- **Contenido Clave**:
    - `name`: Nombre del concepto.
    - `businessUnitId`, `departmentId`, `groupId`: **(Referencias)** IDs que lo anidan en la jerarquía.
    - `proveedoresIds`: **(Relación N:M)** Un array de strings, donde cada string es el ID de un proveedor autorizado en la colección `proveedores`.

### 5. `proveedores` (Colección Global)
- **Ruta**: `/proveedores/{proveedorId}`
- **Descripción**: Lista global de todos los proveedores con los que trabaja el negocio.
- **Contenido Clave**:
    - `name`: Nombre del proveedor.
    - `contactName`, `phone`, `email`: Información de contacto.

### 6. `gastos`
- **Ruta**: `/gastos/{gastoId}`
- **Descripción**: Registra cada gasto individual incurrido por el negocio.
- **Contenido Clave**:
    - `fecha`: Fecha del gasto.
    - `monto`: Monto total del gasto.
    - `conceptoId`, `proveedorId`: **(Referencias)** IDs que lo asocian a un concepto y a un proveedor específico.
    - `...` y otros campos como `factura`, `metodoDePago`, etc.

---

### 7. `productos` (Menú Público)
- **Ruta**: `/productos/{productoId}`
- **Descripción**: Es el catálogo de todos los productos ofrecidos a la venta para los clientes.
- **Contenido Clave**:
    - `name`, `description`: Nombre y descripción del platillo.
    - `price`: Precio.
    - `category`: Categoría (ej. "Entradas", "Plato Fuerte").
