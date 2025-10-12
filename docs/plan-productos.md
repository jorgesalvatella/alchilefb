# Plan de Implementación: Módulo de Productos de Venta

**Documento Creado por:** Atlas (Arquitecto de Soluciones)
**Fecha:** 10 de Octubre de 2025
**Estado:** Fases 1 y 2 Completadas (Versión 2.1)

**Resumen:** Este documento anula la versión anterior y define la hoja de ruta para implementar la gestión de **Productos de Venta** (el menú para clientes), un módulo distinto del catálogo de gastos/insumos ya existente.

---

## 1. Clarificación de Arquitectura

Se ha identificado una distinción clave entre dos tipos de catálogos:

1.  **Catálogo de Gastos/Insumos (Ya implementado):**
    -   **Propósito:** Gestión interna de compras y gastos (ej. "Tomate", "Servilletas").
    -   **Estructura:** `Unidades -> Departamentos -> Grupos -> Conceptos`.

2.  **Catálogo de Productos de Venta (Implementado):**
    -   **Propósito:** El menú que se ofrece a los clientes finales (ej. "Taco al Pastor", "Agua de Horchata").
    -   **Estructura:** `Unidad de Negocio -> Departamento -> Categoría de Venta -> Producto de Venta`.

Este plan se enfoca exclusivamente en el **Catálogo de Productos de Venta**.

---

## 2. Hoja de Ruta

-   **Fase 1: Desarrollo del Backend (API)** - ✅ **Completado**
    -   **Agente Responsable:** Nexus
    -   **Objetivo:** Crear y probar los endpoints CRUD para la gestión de `Productos de Venta` y `Categorías de Venta`.

-   **Fase 2: Desarrollo del Frontend (UI de Administración)** - ✅ **Completado**
    -   **Agente Responsable:** Aether
    -   **Objetivo:** Construir la interfaz en el panel de control para que los administradores gestionen la jerarquía de catálogos y los productos de venta.

-   **Fase 3: Desarrollo del Frontend (UI Pública)**
    -   **Agente Responsable:** Aether
    -   **Objetivo:** Refactorizar la página del menú público para usar la nueva estructura de datos.

-   **Fase 4: Verificación y QA Final**
    -   **Agente Responsable:** Vanguard
    -   **Objetivo:** Asegurar la correcta implementación y probar la funcionalidad de extremo a extremo de todo el flujo.

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

-   **Endpoints Probados:**
    -   `POST /api/control/productos-venta`
    -   `GET /api/control/productos-venta`
    -   `PUT /api/control/productos-venta/:id`
    -   `GET /api/control/productos-venta/:id`
    -   `POST /api/control/catalogo/categorias-venta`
    -   `GET /api/control/catalogo/categorias-venta`
    -   `GET /api/control/departamentos/:deptoId/categorias-venta`
    -   `PUT /api/control/catalogo/categorias-venta/:id`
    -   `DELETE /api/control/catalogo/categorias-venta/:id`
    -   `GET /api/menu` (Endpoint público)
    -   `GET /api/categorias-venta` (Endpoint público)
-   **Estado:** ✅ **Completado y Aprobado.**

### Pruebas de Frontend (Jest + React Testing Library)

-   **Páginas y Componentes Probados:**
    -   `src/app/control/productos-venta/page.tsx`
    -   `src/components/control/sale-product-form.tsx`
    -   Se han corregido y actualizado las pruebas existentes para toda la sección de catálogos.
-   **Estado:** ✅ **Completado y Aprobado.**

---

## 5. Plan de Ejecución Detallado

### Fase 1: Backend (Agente: Nexus) - ✅ **Completado**

1.  **Crear Endpoints CRUD:** Se crearon y probaron todos los endpoints necesarios para `productosDeVenta` y `categoriasDeVenta`.
2.  **Implementar Lógica:** Se implementó la lógica de negocio, incluyendo el cálculo de `basePrice` y la protección de rutas de administrador.
3.  **Crear Endpoints Públicos:** Se crearon y probaron los endpoints `/api/menu` y `/api/categorias-venta`.
4.  **Verificación:** Todas las pruebas de backend pasaron.

### Fase 2: Frontend (Agente: Aether) - ✅ **Completado**

1.  **Crear UI de Jerarquía:** Se crearon las páginas y componentes para gestionar las `Categorías de Venta`, anidadas dentro de sus `Departamentos` correspondientes.
2.  **Cambio Arquitectónico:** Se tomó la decisión de abandonar el `Dialog` para la gestión de productos en favor de páginas dedicadas, mejorando la UX y la responsividad.
3.  **Crear UI de Productos:** Se crearon las páginas `/control/productos-venta/nuevo` y `.../[id]/editar`, junto con el componente reutilizable `sale-product-form.tsx`.
4.  **Integración Completa:** El formulario incluye selectores jerárquicos dependientes y se integra con todos los endpoints del backend.
5.  **Verificación:** Todas las pruebas de frontend fueron creadas/actualizadas y pasaron.

### Fase 3: Frontend - UI Pública (Agente: Aether) - **Pendiente**

1.  **Refactorizar `src/app/menu/page.tsx`:**
    -   Modificar la página para hacer un `fetch` de los endpoints `/api/categorias-venta` y `/api/menu`.
    -   Agrupar los productos por su `categoriaVentaId`.
    -   Renderizar la lista de categorías, y dentro de cada una, la lista de sus productos correspondientes.
2.  **Manejo de Imágenes (URLs Firmadas):**
    -   Implementar el módulo de URLs firmadas (backend y frontend) para garantizar que las imágenes se muestren correctamente a pesar de las políticas de seguridad del bucket.
    -   **Próxima Acción:** Corregir la prueba fallida del endpoint `generate-signed-url`.