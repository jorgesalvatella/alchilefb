# Lista de Tareas Pendientes

Este archivo registra las tareas técnicas y de refactorización que se han identificado para mejorar la calidad y mantenibilidad del proyecto a largo plazo.

## Refactorización del Backend

- **[ ] Modularizar el Backend de Express:**
  - **Objetivo:** Mover la lógica de los endpoints que actualmente reside en `app.js` a archivos de rutas dedicados para mejorar la organización, legibilidad y mantenibilidad.
  - **Archivos a crear:**
    - `backend/routes/catalogos.js` (para unidades, departamentos, grupos, conceptos)
    - `backend/routes/proveedores.js`
    - `backend/routes/productosVenta.js`
    - `backend/routes/cart.js`
  - **Acciones:**
    1. Crear un nuevo directorio `backend/routes`.
    2. Mover gradualmente la lógica de cada dominio a su respectivo archivo de rutas.
    3. `app.js` deberá ser limpiado para que actúe principalmente como un coordinador que importa y monta estos nuevos módulos de rutas.
  - **Prioridad:** Media. Realizar cuando no haya funcionalidades críticas en desarrollo.
