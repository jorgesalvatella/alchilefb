
# Guía de Contexto de la Base de Datos (Firestore)

Este documento proporciona una visión general de la estructura de la base de datos en Firestore, las colecciones principales y las reglas de acceso. Está diseñado para que cualquier desarrollador o agente de IA pueda entender cómo se organizan los datos y cómo interactuar con ellos de forma segura.

## Principios de Diseño

La base de datos sigue un modelo que prioriza:
- **Seguridad y Aislamiento**: Los datos de los usuarios están estrictamente separados y protegidos.
- **Claridad**: La estructura es fácil de entender y consultar.
- **Escalabilidad**: El modelo está preparado para crecer sin sacrificar el rendimiento.

---

## Colecciones Principales

A continuación se describen las colecciones de nivel superior en Firestore.

### 1. `users`
- **Ruta**: `/users/{userId}`
- **Descripción**: Almacena el perfil de cada usuario de la aplicación. El `userId` corresponde al UID de autenticación de Firebase.
- **Contenido Clave**:
    - `email`: Correo del usuario.
    - `firstName`, `lastName`: Nombre y apellido.
    - `role`: Rol del usuario (`customer`, `admin`, `super-admin`). Define sus permisos.
    - `spicePreference`: Nivel de picante preferido.
- **Reglas de Acceso**:
    - Un usuario solo puede leer y escribir su propio perfil.
    - Los `super-admin` tienen acceso total.
    - Nadie puede listar todos los usuarios.

### 2. `orders`
- **Ruta**: `/orders/{orderId}`
- **Descripción**: Contiene el historial de todos los pedidos realizados en la aplicación.
- **Contenido Clave**:
    - `userId`: Referencia al usuario que hizo el pedido.
    - `orderDate`: Fecha del pedido.
    - `totalAmount`: Monto total.
    - `orderStatus`: Estado actual (`Pedido Realizado`, `Preparando`, `En Reparto`, `Entregado`).
- **Reglas de Acceso**:
    - Un usuario puede leer sus propios pedidos.
    - Los `admin` y `super-admin` pueden leer y gestionar todos los pedidos.

### 3. `menu_items`
- **Ruta**: `/menu_items/{menuItemId}`
- **Descripción**: Es el catálogo de todos los productos ofrecidos. Es de lectura pública.
- **Contenido Clave**:
    - `name`, `description`: Nombre y descripción del platillo.
    - `price`: Precio.
    - `category`: Categoría (ej. "Entradas", "Plato Fuerte").
    - `spiceLevel`: Nivel de picante.
- **Reglas de Acceso**:
    - **Lectura**: Abierta para todos (incluso usuarios no autenticados).
    - **Escritura**: Solo los `admin` y `super-admin` pueden crear, actualizar o eliminar platillos.

### 4. `expenses`, `suppliers` y `business_units`
- **Rutas**:
    - `/expenses/{expenseId}`
    - `/suppliers/{supplierId}`
    - `/business_units/{businessUnitId}`
- **Descripción**: Colecciones para la gestión interna del negocio. Contienen información sobre gastos, proveedores y unidades de negocio.
- **Reglas de Acceso**:
    - El acceso (lectura y escritura) está restringido únicamente a los roles de `admin` y `super-admin`.

---

## Sub-colecciones

Estas colecciones están anidadas dentro de un documento de una colección principal para indicar una relación de pertenencia.

### 1. `delivery_addresses` y `payment_methods`
- **Rutas**:
    - `/users/{userId}/delivery_addresses/{addressId}`
    - `/users/{userId}/payment_methods/{paymentId}`
- **Descripción**: Almacenan las direcciones de envío y los métodos de pago de un usuario específico.
- **Reglas de Acceso**:
    - Están anidadas bajo cada usuario, garantizando que solo el propietario de la cuenta pueda acceder a su propia información.

### 2. `order_items`
- **Ruta**: `/orders/{orderId}/order_items/{orderItemId}`
- **Descripción**: Contiene los detalles de cada producto dentro de un pedido.
- **Reglas de Acceso**:
    - La lectura es pública para quien tenga el ID del pedido, pero la escritura está limitada a los administradores.

---

## Resumen de Roles y Permisos

- **`customer` (Cliente)**:
    - Puede gestionar su propio perfil, direcciones y métodos de pago.
    - Puede crear pedidos y ver su historial.
    - Puede ver el menú de productos.

- **`admin` (Administrador)**:
    - Tiene todos los permisos de un `customer`.
    - Puede gestionar el menú de productos (crear, editar, eliminar).
    - Puede ver y gestionar todos los pedidos.
    - Puede gestionar la información de `expenses`, `suppliers` y `business_units`.

- **`super-admin` (Super Administrador)**:
    - Tiene acceso total y sin restricciones a toda la base de datos.
