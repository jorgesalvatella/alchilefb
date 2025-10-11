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

### Modelo de Datos (Firestore)

-   **Agente Consultor:** Pyra
-   **Colección:** `productosDeVenta`
-   **Campos del Documento:**
    -   `name` (string) - *Requerido*
    -   `description` (string)
    -   `price` (number) - *Requerido*
    -   `category` (string) - *Requerido (ej. "Bebidas", "Tacos", "Postres")*
    -   `imageUrl` (string) - *Opcional*
    -   `isAvailable` (boolean) - Para marcar si el producto está disponible en el menú.
    -   `deleted` (boolean) - Para soft deletes.
    -   `createdAt` (string) - ISO Timestamp.
    -   `updatedAt` (string) - ISO Timestamp.

---

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