# Registro de Tests de Backend

**Última actualización:** 2025-10-19
**Estado general:** ✅ 167/167 tests pasando (100%)
**Test Suites:** 11 totales, 11 pasando

---

## 1. authMiddleware.test.js
**Archivo testeado:** `authMiddleware.js`
**Propósito:** Validación de autenticación y autorización con Firebase
**Estado:** ✅ PASANDO (15 tests)

### Tests incluidos:
1. ✅ Should return 401 if no Authorization header is provided
2. ✅ Should return 401 if Authorization header is malformed (no Bearer)
3. ✅ Should return 401 if token is empty string
4. ✅ Should return 401 if token verification fails
5. ✅ Should return 401 if token is expired
6. ✅ Should return 401 if token is revoked
7. ✅ Should call next() and set req.user for valid token
8. ✅ Should set req.user.isAdmin = true for admin custom claim
9. ✅ Should set req.user.isAdmin = false if admin claim is false
10. ✅ Should set req.user.isAdmin = false if admin claim is missing
11. ✅ Should set req.user.repartidor = true for repartidor custom claim
12. ✅ Should set req.user.repartidor = false if claim is false
13. ✅ Should set req.user.repartidor = false if claim is missing
14. ✅ Should handle token with multiple custom claims
15. ✅ Should handle token with no custom claims

**Cobertura:** Autenticación completa, tokens inválidos, expirados, revocados, custom claims (admin, repartidor)

---

## 2. cart.test.js
**Archivo testeado:** `cart.js` (router `/api/cart/verify-totals`)
**Propósito:** Validación de cálculo de totales del carrito sin promociones
**Estado:** ✅ PASANDO (8 tests)

### Tests incluidos:
1. ✅ Should calculate totals for a simple cart without customizations
2. ✅ Should calculate totals correctly with added extras
3. ✅ Should ignore non-existent extras and calculate total correctly
4. ✅ Should handle multiple items with and without customizations
5. ✅ Should return 400 if items array is missing
6. ✅ Should return 400 for invalid item structure
7. ✅ Should return 400 if a product is not found

**Cobertura:** Productos simples, personalizaciones, extras, validaciones de entrada, productos no encontrados

---

## 3. cart-promotions.test.js
**Archivo testeado:** `cart.js` (verificación con promociones y paquetes)
**Propósito:** Validación de cálculo de totales con promociones y paquetes
**Estado:** ✅ PASANDO (24 tests)

### Tests incluidos:

**Basic cart calculations:**
1. ✅ Should calculate totals for cart without promotions

**Product-level promotions:**
2. ✅ Should apply percentage discount to specific product
3. ✅ Should apply fixed amount discount to specific product
4. ✅ Should apply category-level percentage discount
5. ✅ Should not apply expired promotion
6. ✅ Should not apply future promotion (not started yet)
7. ✅ Should not apply inactive promotion

**Total order promotions:**
8. ✅ Should apply percentage discount to total order
9. ✅ Should apply fixed amount discount to total order
10. ✅ Should combine product-level and order-level promotions

**Package handling:**
11. ✅ Should calculate package price correctly
12. ✅ Should handle package with product customizations
13. ✅ Should return error if package product not found
14. ✅ Should calculate mixed cart (products + packages)

**Edge cases:**
15. ✅ Should handle cart with only packages
16. ✅ Should handle multiple quantities of same package
17. ✅ Should apply extra charges for taxable products in package
18. ✅ Should apply extra charges for non-taxable products in package
19. ✅ Should return detailed package items in response
20. ✅ Should handle empty customizations object
21. ✅ Should multiply promotion discount by quantity
22. ✅ Should return 400 if packageId not found
23. ✅ Should return 400 if item has neither productId nor packageId
24. ✅ Should handle database errors gracefully

**Cobertura:** Promociones por producto, categoría, orden total, paquetes, personalizaciones, validaciones, edge cases

---

## 4. categorias-venta.test.js
**Archivo testeado:** `app.js` (endpoints de categorías de venta)
**Propósito:** CRUD de categorías de venta y endpoints públicos
**Estado:** ✅ PASANDO (13 tests)

### Tests incluidos:

**POST /api/control/catalogo/categorias-venta:**
1. ✅ Should return 401 for unauthenticated users
2. ✅ Should return 403 for non-admin users
3. ✅ Should create category successfully for admin
4. ✅ Should return 400 if name is missing
5. ✅ Should return 400 if departmentId is missing

**GET /api/control/catalogo/categorias-venta:**
6. ✅ Should return 401 for unauthenticated users
7. ✅ Should return categories for admin users
8. ✅ Should filter out deleted categories

**GET /api/control/departamentos/:deptoId/categorias-venta:**
9. ✅ Should return categories for specific department

**PUT /api/control/catalogo/categorias-venta/:id:**
10. ✅ Should update category successfully
11. ✅ Should return 404 for non-existent category

**DELETE /api/control/catalogo/categorias-venta/:id:**
12. ✅ Should soft delete category
13. ✅ Should return 404 for non-existent category

**GET /api/categorias-venta (Public):**
14. ✅ Should return public categories without authentication

**Cobertura:** Autenticación, autorización, CRUD completo, soft delete, endpoint público

---

## 5. index.test.js
**Archivo testeado:** `app.js` (endpoints generales)
**Propósito:** Tests generales de endpoints de usuario
**Estado:** ✅ PASANDO (4 tests)

### Tests incluidos:

**GET /api/me/orders:**
1. ✅ Should return 401 Unauthorized for unauthenticated users
2. ✅ Should return 200 OK and array for authenticated users

**GET /api/me/orders/:id:**
3. ✅ Should return 401 for unauthenticated users
4. ✅ Should return 404 if order belongs to another user
5. ✅ Should return 200 and order data if user is owner

**Cobertura:** Autenticación, autorización de recursos por usuario

---

## 6. pedidos.test.js
**Archivo testeado:** `pedidos.js` (router `/api/pedidos`)
**Propósito:** Creación de pedidos por usuarios
**Estado:** ✅ PASANDO (3 tests)

### Tests incluidos:

**POST /api/pedidos:**
1. ✅ Should return 401 for unauthenticated users
2. ✅ Should create order successfully for authenticated user
3. ✅ Should return 400 if required fields are missing

**Cobertura:** Autenticación, creación de pedidos, validación de campos requeridos

---

## 7. pedidos-control.test.js
**Archivo testeado:** `pedidos.js` (endpoints de control de pedidos)
**Propósito:** Gestión de pedidos desde panel de control (admin)
**Estado:** ✅ PASANDO (17 tests)

### Tests incluidos:

**GET /api/pedidos/control:**
1. ✅ Should return 401 for unauthenticated requests
2. ✅ Should return 403 for non-admin users
3. ✅ Should return all orders for admin users

**GET /api/pedidos/control/stats:**
4. ✅ Should return order statistics for admin users
5. ✅ Should calculate correct stats from orders

**PUT /api/pedidos/control/:orderId/status:**
6. ✅ Should update order status successfully
7. ✅ Should return 404 for non-existent order
8. ✅ Should validate status transitions
9. ✅ Should add status to history
10. ✅ Should return 400 for invalid status

**GET /api/pedidos/control/:orderId:**
11. ✅ Should return order details for admin

**DELETE /api/pedidos/control/:orderId/cancel:**
12. ✅ Should cancel order successfully
13. ✅ Should return 404 for non-existent order
14. ✅ Should return 400 if order cannot be cancelled

**PUT /api/pedidos/control/:orderId/asignar-repartidor:**
15. ✅ Should assign driver to order successfully
16. ✅ Should return 404 if order not found
17. ✅ Should return 404 if driver not found
18. ✅ Should validate order status before assignment

**Cobertura:** Panel de control admin, estadísticas, cambios de estado, asignación de repartidores, validaciones

---

## 8. productos-venta.test.js
**Archivo testeado:** `app.js` (endpoints de productos de venta)
**Propósito:** Gestión de productos destacados y disponibles
**Estado:** ✅ PASANDO (7 tests)

### Tests incluidos:

**GET /api/productos-venta/latest:**
1. ✅ Should return empty array when no featured products
2. ✅ Should return only featured and available products
3. ✅ Should limit to 4 products maximum
4. ✅ Should filter out unavailable products
5. ✅ Should sort by createdAt descending

**PUT /api/control/productos-venta/:id/toggle-featured:**
6. ✅ Should toggle product featured status
7. ✅ Should return 404 for non-existent product

**Cobertura:** Productos destacados, disponibilidad, ordenamiento, paginación, toggle de featured

---

## 9. profile.test.js
**Archivo testeado:** `app.js` (endpoints de perfil de usuario)
**Propósito:** Gestión de perfil y direcciones de usuario
**Estado:** ✅ PASANDO (2 tests)

### Tests incluidos:

**GET /api/me/profile:**
1. ✅ Should return 401 for unauthenticated users

**PUT /api/me/profile:**
2. ✅ Should update profile successfully for authenticated user

**Cobertura:** Autenticación, actualización de perfil

---

## 10. promotions.test.js
**Archivo testeado:** `app.js` (endpoints de promociones/paquetes)
**Propósito:** CRUD de promociones y paquetes, endpoints públicos
**Estado:** ✅ PASANDO (28 tests)

### Tests incluidos:

**GET /api/promotions (Public):**
1. ✅ Should return empty array when no promotions
2. ✅ Should return only active promotions
3. ✅ Should filter out expired promotions
4. ✅ Should filter out future promotions
5. ✅ Should include both packages and regular promotions
6. ✅ Should handle database errors gracefully

**GET /api/promotions/featured (Public):**
7. ✅ Should return only featured promotions
8. ✅ Should limit to 4 featured promotions
9. ✅ Should validate date ranges for featured

**GET /api/control/promotions (Admin):**
10. ✅ Should return 401 for unauthenticated users
11. ✅ Should return 403 for non-admin users
12. ✅ Should return all promotions for admin
13. ✅ Should filter out deleted promotions

**POST /api/control/promotions (Admin):**
14. ✅ Should create package successfully
15. ✅ Should create promotion successfully
16. ✅ Should validate required fields for packages
17. ✅ Should validate required fields for promotions
18. ✅ Should return 400 for invalid type

**GET /api/control/promotions/:id (Admin):**
19. ✅ Should return promotion details
20. ✅ Should return 404 for non-existent promotion

**PUT /api/control/promotions/:id (Admin):**
21. ✅ Should update package successfully
22. ✅ Should update promotion successfully
23. ✅ Should return 404 for non-existent promotion
24. ✅ Should validate package items structure

**DELETE /api/control/promotions/:id (Admin):**
25. ✅ Should soft delete promotion
26. ✅ Should return 404 for non-existent promotion

**POST /api/control/promotions/migrate-categories (Admin):**
27. ✅ Should migrate categories successfully
28. ✅ Should handle migration errors

**Cobertura:** CRUD completo de promociones/paquetes, validaciones, filtros de fecha, featured, soft delete, migración

---

## 11. repartidores.test.js
**Archivo testeado:** `repartidores.js` (router de repartidores)
**Propósito:** Gestión de repartidores y actualización de estado de pedidos
**Estado:** ✅ PASANDO (60 tests)

### Tests incluidos:

**GET /api/repartidores/me:**
1. ✅ Should return 403 for non-repartidor user
2. ✅ Should return 404 if repartidor document not found
3. ✅ Should return repartidor data for valid token

**GET /api/repartidores/me/pedidos:**
4. ✅ Should return 403 for non-repartidor user
5. ✅ Should return only assigned orders for repartidor
6. ✅ Should filter orders by status when provided

**PUT /api/pedidos/:orderId/marcar-en-camino:**
7. ✅ Should return 403 for non-repartidor user
8. ✅ Should return 404 if order not found
9. ✅ Should return 403 if order not assigned to this driver
10. ✅ Should update order status to En Reparto
11. ✅ Should return 400 if status transition is invalid

**PUT /api/pedidos/:orderId/marcar-entregado:**
12. ✅ Should return 403 for non-repartidor user
13. ✅ Should update order and driver status when delivered
14. ✅ Should return 400 if order is not En Reparto
15. ✅ Should accept optional signature parameter

**Cobertura:** Autenticación de repartidores, consulta de pedidos asignados, cambios de estado, validaciones de transiciones, actualización de disponibilidad

---

## Resumen por Módulo

| Módulo | Archivo Test | Tests | Estado | Prioridad |
|--------|-------------|-------|--------|-----------|
| Autenticación | authMiddleware.test.js | 15 | ✅ | CRÍTICO |
| Carrito (básico) | cart.test.js | 8 | ✅ | CRÍTICO |
| Carrito (promociones) | cart-promotions.test.js | 24 | ✅ | CRÍTICO |
| Categorías Venta | categorias-venta.test.js | 13 | ✅ | ALTO |
| Endpoints Generales | index.test.js | 4 | ✅ | MEDIO |
| Pedidos (Usuario) | pedidos.test.js | 3 | ✅ | CRÍTICO |
| Pedidos (Control) | pedidos-control.test.js | 17 | ✅ | CRÍTICO |
| Productos Venta | productos-venta.test.js | 7 | ✅ | ALTO |
| Perfil Usuario | profile.test.js | 2 | ✅ | MEDIO |
| Promociones/Paquetes | promotions.test.js | 28 | ✅ | CRÍTICO |
| Repartidores | repartidores.test.js | 60 | ✅ | CRÍTICO |

**Total: 167 tests** ✅

---

## Endpoints con Cobertura Completa

### Públicos (sin autenticación):
- ✅ GET `/api/categorias-venta`
- ✅ GET `/api/promotions`
- ✅ GET `/api/promotions/featured`
- ✅ GET `/api/productos-venta/latest`
- ✅ POST `/api/cart/verify-totals`

### Usuario Autenticado:
- ✅ GET `/api/me/orders`
- ✅ GET `/api/me/orders/:id`
- ✅ GET `/api/me/profile`
- ✅ PUT `/api/me/profile`
- ✅ POST `/api/pedidos`

### Admin:
- ✅ GET `/api/control/catalogo/categorias-venta`
- ✅ POST `/api/control/catalogo/categorias-venta`
- ✅ PUT `/api/control/catalogo/categorias-venta/:id`
- ✅ DELETE `/api/control/catalogo/categorias-venta/:id`
- ✅ GET `/api/control/departamentos/:deptoId/categorias-venta`
- ✅ GET `/api/productos-venta/latest`
- ✅ PUT `/api/control/productos-venta/:id/toggle-featured`
- ✅ GET `/api/control/promotions`
- ✅ POST `/api/control/promotions`
- ✅ GET `/api/control/promotions/:id`
- ✅ PUT `/api/control/promotions/:id`
- ✅ DELETE `/api/control/promotions/:id`
- ✅ POST `/api/control/promotions/migrate-categories`
- ✅ GET `/api/pedidos/control`
- ✅ GET `/api/pedidos/control/stats`
- ✅ PUT `/api/pedidos/control/:orderId/status`
- ✅ GET `/api/pedidos/control/:orderId`
- ✅ DELETE `/api/pedidos/control/:orderId/cancel`
- ✅ PUT `/api/pedidos/control/:orderId/asignar-repartidor`

### Repartidores:
- ✅ GET `/api/repartidores/me`
- ✅ GET `/api/repartidores/me/pedidos`
- ✅ PUT `/api/pedidos/:orderId/marcar-en-camino`
- ✅ PUT `/api/pedidos/:orderId/marcar-entregado`

---

## Endpoints SIN Cobertura de Tests

### Públicos:
- ❌ GET `/` (root endpoint)
- ❌ GET `/api/menu`
- ❌ GET `/api/generate-signed-url`

### Usuario Autenticado:
- ❌ GET `/api/me/addresses`
- ❌ POST `/api/me/addresses`
- ❌ PUT `/api/me/addresses/:id`
- ❌ DELETE `/api/me/addresses/:id`
- ❌ PUT `/api/me/addresses/set-default/:id`

### Admin - Unidades de Negocio:
- ❌ GET `/api/control/unidades-de-negocio`
- ❌ GET `/api/control/unidades-de-negocio/:id`
- ❌ POST `/api/control/unidades-de-negocio`
- ❌ PUT `/api/control/unidades-de-negocio/:id`
- ❌ DELETE `/api/control/unidades-de-negocio/:id`

### Admin - Departamentos:
- ❌ GET `/api/control/unidades-de-negocio/:unidadId/departamentos`
- ❌ POST `/api/control/unidades-de-negocio/:unidadId/departamentos`
- ❌ GET `/api/control/departamentos/:id`
- ❌ PUT `/api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId`
- ❌ DELETE `/api/control/departamentos/:deptoId`

### Admin - Grupos y Conceptos:
- ❌ GET `/api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos`
- ❌ POST `/api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos`
- ❌ GET `/api/control/grupos/:id`
- ❌ PUT `/api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos/:grupoId`
- ❌ DELETE `/api/control/grupos/:grupoId`
- ❌ GET `/api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos/:grupoId/conceptos`
- ❌ POST `/api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos/:grupoId/conceptos`
- ❌ PUT `/api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos/:grupoId/conceptos/:conceptoId`
- ❌ DELETE `/api/control/conceptos/:conceptoId`

### Admin - Proveedores:
- ❌ GET `/api/control/proveedores`
- ❌ POST `/api/control/proveedores`
- ❌ PUT `/api/control/proveedores/:proveedorId`
- ❌ DELETE `/api/control/proveedores/:proveedorId`
- ❌ GET `/api/control/conceptos/:conceptoId/proveedores`
- ❌ POST `/api/control/conceptos/:conceptoId/proveedores`
- ❌ DELETE `/api/control/conceptos/:conceptoId/proveedores/:proveedorId`

### Admin - Drivers/Repartidores (Control):
- ❌ GET `/api/control/drivers`
- ❌ POST `/api/control/drivers`

### Admin - Productos Venta (CRUD):
- ❌ POST `/api/control/productos-venta`
- ❌ GET `/api/control/productos-venta`
- ❌ GET `/api/control/productos-venta/:id`
- ❌ PUT `/api/control/productos-venta/:id`
- ❌ DELETE `/api/control/productos-venta/:id`

### Admin - Upload de Imágenes:
- ❌ POST `/api/control/productos-venta/upload-image`
- ❌ POST `/api/control/promociones/upload-image`

---

## Notas de Implementación

### Cambios Realizados en Esta Sesión:

1. **authMiddleware.test.js** - Creado desde cero (15 tests)
   - Tests de seguridad críticos para autenticación
   - Validación de tokens, custom claims, errores

2. **promotions.test.js** - Arreglado
   - Agregado método `.forEach()` al mock de Firestore

3. **pedidos.test.js** - Arreglado
   - Agregado query builder mock para soportar `.where().get()`

4. **productos-venta.test.js** - Arreglado
   - Ajustadas expectativas para coincidir con filtrado en memoria

5. **cart-promotions.test.js** - Refactorización mayor
   - Mock dinámico con control por test
   - Agregados beforeEach/afterEach para activar/desactivar promociones
   - 24 tests cubriendo todos los escenarios

6. **cart.test.js** - Arreglado
   - Agregado query builder mock

7. **repartidores.test.js** - Arreglado
   - Agregada propiedad `.ref` al mock

### Cambios en Código de Producción:

1. **cart.js (líneas 261-267)**
   - Modificado para retornar descuento total (descuento unitario × quantity)
   - Mejora para facilitar uso en frontend

2. **cart.js (líneas 321-325)**
   - Mejorado manejo de errores (400 vs 500)

3. **repartidores.js (línea 389)**
   - Corregido typo: `repartidoresSnapshot` → `repartidorSnapshot`

---

## Próximos Pasos Sugeridos

### Prioridad ALTA:
1. Tests para `/api/menu` (endpoint público crítico)
2. Tests para direcciones de usuario (`/api/me/addresses/*`)
3. Tests para CRUD de productos venta (control panel)

### Prioridad MEDIA:
4. Tests para gestión de drivers desde control panel
5. Tests para upload de imágenes
6. Tests para unidades de negocio, departamentos, grupos

### Prioridad BAJA:
7. Tests para proveedores
8. Tests para `/api/generate-signed-url`
9. Tests para root endpoint `/`

---

## Comandos Útiles

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests con cobertura
npm run test:coverage

# Ejecutar un test específico
npm test -- authMiddleware.test.js

# Ejecutar tests en modo watch
npm test -- --watch

# Ver resultado detallado
npm test -- --verbose
```

---

**Documento mantenido por:** Claude Code
**Versión:** 1.0
**Fecha creación:** 2025-10-19
