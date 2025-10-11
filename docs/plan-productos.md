# Plan de Implementación: Módulo de Productos de Venta

**Documento Creado por:** Atlas (Arquitecto de Soluciones)
**Fecha:** 10 de Octubre de 2025
**Estado:** Aprobado (Versión 2)

**Resumen:** Este documento anula la versión anterior y define la hoja de ruta para implementar la gestión de **Productos de Venta** (el menú para clientes), un módulo distinto del catálogo de gastos/insumos ya existente.

---

## 1. Clarificación de Arquitectura

Se ha identificado una distinción clave entre dos tipos de catálogos:

1.  **Catálogo de Gastos/Insumos (Ya implementado):**
    -   **Propósito:** Gestión interna de compras y gastos (ej. "Tomate", "Servilletas").
    -   **Estructura:** `Unidades -> Departamentos -> Grupos -> Conceptos`.

2.  **Catálogo de Productos de Venta (Por implementar):**
    -   **Propósito:** El menú que se ofrece a los clientes finales (ej. "Taco al Pastor", "Agua de Horchata").
    -   **Estructura:** Será una colección independiente y más simple, probablemente organizada por categorías.

Este plan se enfoca exclusivamente en el **Catálogo de Productos de Venta**.

---

## 2. Hoja de Ruta

-   **Fase 1: Desarrollo del Backend (API)**
    -   **Agente Responsable:** Nexus
    -   **Objetivo:** Crear y probar los endpoints CRUD para la gestión de `Productos de Venta`.

-   **Fase 2: Desarrollo del Frontend (UI de Administración)**
    -   **Agente Responsable:** Aether
    -   **Objetivo:** Construir la interfaz en el panel de control para que los administradores gestionen los productos de venta.

-   **Fase 3: Verificación y QA**
    -   **Agente Responsable:** Vanguard
    -   **Objetivo:** Asegurar la correcta implementación y probar la funcionalidad de extremo a extremo.

---

## 3. Hoja de Requerimientos

### Requerimientos Funcionales (FR)

-   **FR1 - Creación de Productos de Venta:** Los administradores deben poder crear un nuevo producto para el menú.
-   **FR2 - Lectura de Productos de Venta:** Los administradores deben poder ver una lista de todos los productos de venta.
-   **FR3 - Actualización de Productos de Venta:** Los administradores deben poder editar un producto de venta.
-   **FR4 - Eliminación de Productos de Venta:** Los administradores deben poder eliminar (soft delete) un producto de venta.
-   **FR5 - Visualización Pública:** Los usuarios (autenticados o no) deben poder ver el menú de productos disponibles.

### Modelo de Datos: Colección `productosDeVenta`

Esta colección contendrá todos los artículos que se pueden vender a los clientes.

**Campos del Documento:**

*   `id` (string) - *Autogenerado*
*   `name` (string) - *Requerido*
*   `description` (string) - *Opcional*
*   `price` (number) - *Requerido. **Nota de Arquitectura:** Este es el precio final que ve el cliente (IVA incluido). El administrador solo necesita introducir este valor.*
*   `basePrice` (number) - *Requerido. **Nota de Arquitectura:** Este es el precio antes de impuestos. Será calculado y guardado automáticamente por el backend. Si `isTaxable` es true, el cálculo es `price / 1.16`; si es false, `basePrice` es igual a `price`.*
*   `cost` (number) - *Opcional. Costo de producción del producto.*
*   `platformFeePercent` (number) - *Opcional. Comisión de la plataforma de venta (ej. 20 para 20%).*
*   `businessUnitId` (string) - *Requerido. ID de la Unidad de Negocio a la que pertenece.*
*   `departmentId` (string) - *Requerido. ID del Departamento al que pertenece.*
*   `categoriaVentaId` (string) - *Requerido. ID de la Categoría de Venta a la que pertenece.*
*   `isTaxable` (boolean) - *Requerido. Indica si al producto se le deben aplicar impuestos.*
*   `isAvailable` (boolean) - *Requerido, indica si el producto está disponible para la venta*
*   `createdAt` (timestamp) - *Autogenerado*
--- 
### Nuevo Catálogo: Colección `categoriasDeVenta`

Esta colección define las categorías a las que pueden pertenecer los productos de venta, creando una jerarquía organizacional.

**Campos del Documento:**

*   `id` (string) - *Autogenerado*
*   `name` (string) - *Requerido*
*   `description` (string) - *Opcional*
*   `businessUnitId` (string) - *Requerido. ID de la Unidad de Negocio a la que está asociada.*
*   `departmentId` (string) - *Requerido. ID del Departamento al que está asociada.*
*   `deletedAt` (timestamp) - *Opcional, para borrado lógico*

---
**Funcionalidad Adicional: Calculadora de Rentabilidad (UI del Admin)**

## 4. Plan de Pruebas

-   **Agente Responsable:** Vanguard

### Pruebas de Backend (Jest + Supertest)

-   **Nuevos Endpoints a Probar:**
    -   `POST /api/control/productos-venta`
    -   `GET /api/control/productos-venta`
    -   `PUT /api/control/productos-venta/:id`
    -   `DELETE /api/control/productos-venta/:id`
    -   `GET /api/menu` (Endpoint público)
-   **Casos de Prueba:**
    -   Verificar creación, lectura, actualización y borrado por parte de administradores.
    -   Verificar que usuarios no-admin no puedan acceder a los endpoints de control (403).
    -   Verificar que el endpoint `/api/menu` sea público y devuelva solo productos `isAvailable: true` y `deleted: false`.

### Pruebas de Frontend (Jest + React Testing Library)

-   **Nueva Página `src/app/control/productos-venta/page.tsx`:**
    -   Test para renderizar la tabla de productos.
    -   Test para los estados de carga y error.
-   **Nuevo Componente `AddEditSaleProductDialog.tsx`:**
    -   Test para el formulario de creación/edición.
    -   Test para la validación y el envío de datos a la API.

---

## 5. Plan de Ejecución Detallado

### Fase 1: Backend (Agente: Nexus)

1.  **Crear Endpoints CRUD en `backend/app.js`:**
    -   `POST /api/control/productos-venta`
    -   `GET /api/control/productos-venta`
    -   `PUT /api/control/productos-venta/:id`
    -   `DELETE /api/control/productos-venta/:id`
    -   `GET /api/menu`
2.  **Implementar Lógica:**
    -   Endpoints de `/control` deben usar `authMiddleware` y verificar rol de administrador.
    -   Endpoint `/api/menu` debe ser público.
    -   Implementar la lógica CRUD contra la nueva colección `productosDeVenta`.
3.  **Documentar con Swagger:** Añadir los nuevos endpoints a la documentación de la API.
4.  **Escribir Pruebas:** Implementar los tests de backend definidos anteriormente.

### Fase 2: Frontend (Agente: Aether)

1.  **Crear Página de Gestión:** Crear la ruta y el componente principal en `src/app/control/productos-venta/page.tsx`.
2.  **Añadir Navegación:** Agregar un enlace en el menú lateral del panel de control para ir a "Productos de Venta".
3.  **Desarrollar UI:** Construir la tabla y el diálogo para el CRUD de productos de venta, reutilizando componentes de `shadcn/ui` existentes.
4.  **Integrar con API:** Conectar la UI a los nuevos endpoints del backend.

### Fase 3: Verificación (Agente: Vanguard)

1.  **Ejecutar Pruebas:** Correr `npm test` para asegurar que todas las pruebas, nuevas y antiguas, pasen.
2.  **Validación Funcional:** Realizar una revisión manual del flujo completo de gestión de productos de venta.