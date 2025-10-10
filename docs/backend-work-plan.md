# Plan de Trabajo: Construcción de API Backend (API-First)

Este documento detalla las fases y tareas para construir el backend completo bajo la arquitectura "API-first".

---

### Fase 0: Fundación del Backend (Completado)
*   **Objetivo:** Crear la estructura base y las herramientas para la API.
*   **Tareas Realizadas:**
    *   `[HECHO]` Creación de la carpeta `backend/`.
    *   `[HECHO]` Inicialización del proyecto Node.js con Express.
    *   `[HECHO]` Instalación de dependencias (`express`, `firebase-admin`, `cors`).
    *   `[HECHO]` Creación del archivo `backend/index.js` con un servidor básico.

---

### Fase 1: Autenticación y Endpoints de Lectura del Catálogo
*   **Objetivo:** Implementar la capa de seguridad y migrar toda la funcionalidad de LECTURA del catálogo a la nueva arquitectura de API anidada.
*   **Tareas:**
    1.  **Middleware de Autenticación:** `[HECHO]` Asegurar que `authMiddleware.js` está implementado y protege las rutas de `/api/control`.
    2.  **Endpoints de Lectura Jerárquicos:**
        *   `GET /api/control/unidades-de-negocio`
        *   `GET /api/control/unidades-de-negocio/:unidadId/departamentos`
        *   `GET /api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos`
        *   `GET /api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos/:grupoId/conceptos`
    3.  **Endpoints de Lectura Globales:**
        *   `GET /api/control/proveedores`
    4.  **Refactorizar Frontend (Lectura):** Modificar todas las páginas de `Catálogo` en el panel de administración para que usen `fetch` para llamar a estos nuevos endpoints.

---

### Fase 2: Operaciones CRUD del Panel de Administración
*   **Objetivo:** Dar funcionalidad completa al panel de administración para Crear, Actualizar y Borrar (CRUD).
*   **Tareas (Endpoints a crear):**
    *   Endpoints `POST`, `PUT`, `DELETE` para `/api/control/unidades-de-negocio`.
    *   Endpoints `POST`, `PUT`, `DELETE` anidados para `departamentos`, `grupos`, y `conceptos`.
    *   Endpoints CRUD completos para `/api/control/proveedores`.
    *   Endpoints CRUD completos para `/api/control/productos` (Menú).
    *   Endpoints CRUD completos para `/api/control/gastos`.
*   **Tareas (Frontend):** Refactorizar los diálogos de "Añadir/Editar" para que usen los nuevos endpoints de la API.

---

### Fase 3: Gestión de Relaciones (Conceptos y Proveedores)
*   **Objetivo:** Implementar la lógica para la relación muchos-a-muchos.
*   **Tareas (Endpoints a crear):**
    *   `GET /api/control/conceptos/:conceptoId/proveedores` (Obtiene proveedores autorizados para un concepto).
    *   `POST /api/control/conceptos/:conceptoId/proveedores` (Asocia un proveedor a un concepto).
    *   `DELETE /api/control/conceptos/:conceptoId/proveedores/:proveedorId` (Desasocia un proveedor).

---

### Fase 4: Funcionalidad del Usuario Final
*   **Objetivo:** Migrar las operaciones que realizan los clientes.
*   **Tareas (Endpoints a crear):**
    *   `GET /api/menu` (Endpoint público para ver el menú).
    *   `GET /api/me/profile` y `PUT /api/me/profile` (para la página de perfil del usuario).
    *   `GET /api/me/orders` (para el historial de pedidos del usuario).
    *   `POST /api/checkout` (para procesar una nueva orden).
*   **Tareas (Frontend):** Refactorizar las páginas de `menu`, `profile`, `orders` y `checkout` para que dejen de usar `useCollection` y llamen a la API.

---

### Fase 5: Administración de Usuarios y Permisos
*   **Objetivo:** Implementar la capacidad de que los administradores gestionen roles.
*   **Tareas (Endpoints a crear):**
    *   `GET /api/control/usuarios` (para que un super-admin liste todos los usuarios).
    *   `POST /api/control/usuarios/:id/role` (para que un super-admin asigne roles/claims).
*   **Tareas (Frontend):** Construir la nueva interfaz de "Gestión de Usuarios" que consuma estos endpoints.
