# Módulo: Personalización de Productos

## 1. Objetivo

Implementar una funcionalidad que permita a los clientes personalizar los productos del menú, quitando ingredientes base y añadiendo ingredientes extra con costo adicional.

## 2. Agentes Responsables

| Agente | Rol |
| :--- | :--- |
| **Atlas** | Arquitecto de Soluciones (Supervisor) |
| **Pyra** | Arquitecto de Firebase |
| **Nexus** | Ingeniero de Backend |
| **Aether** | Especialista en UI/UX |
| **Vanguard** | Agente de Pruebas y Calidad |

## 3. Plan de Implementación Detallado

### Paso 1: Actualización del Modelo de Datos

*   **Descripción:** Modificar la colección `productos` en Firestore para soportar personalizaciones.
*   **Tareas:**
    1.  Añadir un campo `ingredientesBase` (Array de strings).
    2.  Añadir un campo `ingredientesExtra` (Array de objetos con `nombre` y `precio`).
*   **Agente Responsable:** **Pyra**.

### Paso 2: Adaptación del Backend

*   **Descripción:** Actualizar la API para procesar y calcular el costo de los productos personalizados.
*   **Tareas:**
    1.  Modificar el endpoint `POST /api/cart` para aceptar personalizaciones.
    2.  Implementar la lógica de cálculo de precios en el servidor.
    3.  Asegurar que el carrito en Firestore guarde estas personalizaciones.
*   **Agente Responsable:** **Nexus**.

### Paso 3: Desarrollo de la Interfaz de Usuario (UI)

*   **Descripción:** Crear el componente de React para que el usuario seleccione las personalizaciones.
*   **Tareas:**
    1.  Diseñar y construir un modal de personalización usando `shadcn/ui`.
    2.  Mostrar ingredientes base y extra con sus precios.
    3.  Actualizar el precio del artículo en tiempo real en la UI.
*   **Agente Responsable:** **Aether**.

### Paso 4: Integración Frontend y Lógica de Cliente

*   **Descripción:** Conectar el nuevo componente de UI con el sistema del carrito.
*   **Tareas:**
    1.  Actualizar el `CartContext` para almacenar personalizaciones.
    2.  Modificar la página del carrito para mostrar los detalles de la personalización.
    3.  Enviar la información correcta al backend al añadir al carrito.
*   **Agente Responsable:** **Aether**.

### Paso 5: Pruebas de Calidad

*   **Descripción:** Validar que toda la funcionalidad opera correctamente.
*   **Tareas:**
    1.  Crear pruebas unitarias (Supertest) para la lógica de cálculo de precios en el backend.
    2.  Crear pruebas de componente (React Testing Library) para el modal de personalización.
    3.  Realizar pruebas de integración para el flujo completo.
*   **Agente Responsable:** **Vanguard**.
