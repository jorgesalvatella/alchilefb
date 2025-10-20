# Módulo: Paquetes y Promociones

**Fecha:** 17 de Octubre, 2025
**Coordinador:** Sentinel
**Estado:** Planificado

---

## 1. Objetivo

Implementar un sistema integral que permita a los administradores crear, gestionar y ofrecer dos tipos de ofertas a los clientes: **Paquetes** (combinaciones de productos a un precio fijo con personalización) y **Promociones** (descuentos aplicables a productos, categorías o al total del pedido). El sistema debe manejar cálculos de precios complejos en el backend y ofrecer una experiencia de usuario clara y flexible.

## 2. Agentes Responsables

| Agente | Rol |
| :--- | :--- |
| **Sentinel** | Coordinador del Proyecto |
| **Pyra** | Arquitecto de Firebase |
| **Nexus** | Ingeniero de Backend |
| **Aether** | Especialista en UI/UX |
| **Vanguard** | Agente de Pruebas y Calidad |
| **Raptoure** | Agente de Seguridad y Hardening |

---

## 3. Plan de Implementación Detallado

### Fase 1: Diseño del Modelo de Datos y Seguridad

*   **Agentes Asignados:** **Pyra**, **Raptoure**
*   **Objetivo:** Definir una estructura de datos robusta y segura en Firestore.

*   **Tareas (Pyra):**
    1.  **Definir Esquema:** Implementar la nueva colección `promotions` en Firestore con el esquema flexible acordado.
    2.  **Reglas de Seguridad:** Actualizar `firestore.rules` para permitir acceso de escritura solo a los administradores y acceso de lectura a todos los usuarios para la colección `promotions`.

*   **Tareas (Raptoure):**
    1.  **Auditar Esquema:** Revisar la estructura de datos propuesta para identificar posibles vectores de abuso (ej. manipulación de precios).
    2.  **Validar Reglas:** Asegurar que las reglas de seguridad para `promotions` cumplan con el principio de mínimo privilegio.

### Fase 2: Desarrollo de la Lógica de Backend

*   **Agente Asignado:** **Nexus**
*   **Objetivo:** Construir la API para la gestión de ofertas y la lógica de cálculo de precios.

*   **Tareas:**
    1.  **Endpoints de Administración:** Crear los endpoints CRUD (`POST`, `GET`, `PUT`, `DELETE`) para `/api/control/promotions`, protegidos con `authMiddleware` y rol de `admin`.
    2.  **Endpoint Público:** Implementar `GET /api/promotions` para que el frontend pueda obtener todas las ofertas activas.
    3.  **Actualizar Lógica de Precios:** Modificar los endpoints de verificación (`/api/cart/verify-totals`) y finalización de compra (`/api/pedidos`) para implementar la nueva lógica de precios, incluyendo el cálculo de impuestos sobre el total final.

### Fase 3: Desarrollo de la Interfaz de Usuario

*   **Agente Asignado:** **Aether**
*   **Objetivo:** Crear las interfaces para la administración y el consumo de las nuevas ofertas.

*   **Tareas:**
    1.  **Panel de Administración:** Crear la página `/control/promociones` con una tabla para listar ofertas y un formulario dinámico que se adapte para crear/editar tanto paquetes como promociones.
    2.  **Visualización Pública:** Integrar la visualización de paquetes y promociones en la página del menú.
    3.  **Lógica del Carrito:** Implementar la visualización de paquetes como grupos de ítems, permitir la personalización completa (agregar/quitar extras) de los productos dentro de un paquete y asegurar que el precio total del carrito se actualice dinámicamente.

### Fase 4: Pruebas y Aseguramiento de Calidad

*   **Agente Asignado:** **Vanguard**
*   **Objetivo:** Garantizar la robustez y fiabilidad del módulo completo.

*   **Tareas:**
    1.  **Pruebas de Backend:** Escribir tests unitarios y de integración para los nuevos endpoints y la lógica de cálculo de precios.
    2.  **Pruebas de Frontend:** Crear tests para el formulario dinámico de administración y la compleja interfaz del carrito.
    3.  **Pruebas End-to-End (E2E):** Desarrollar una suite de Playwright que simule el flujo completo: añadir un paquete, personalizarlo con extras, verificar el precio y completar el pedido.

---

## 4. Modelo de Datos Detallado (`promotions`)

*   `name`: `string` - (ej. "Paquete Amigos", "20% OFF en Bebidas")
*   `description`: `string`
*   `type`: `string` - Valores posibles: `'package'`, `'promotion'`.
*   `isActive`: `boolean`
*   `startDate`, `endDate`: `timestamp` (opcionales)

#### Si `type` es `'package'`:
*   `packagePrice`: `number` - Precio base del paquete.
*   `packageItems`: `array` de objetos `[{ productId: string, name: string, quantity: number }]`.

#### Si `type` es `'promotion'`:
*   `promoType`: `string` - Valores: `'percentage'`, `'fixed_amount'`.
*   `promoValue`: `number` - (ej. `20` para 20% o `50` para $50).
*   `appliesTo`: `string` - Valores: `'product'`, `'category'`, `'total_order'`.
*   `targetIds`: `array` de `string` - IDs de los productos o categorías a los que aplica.

---

## 5. Lógica de Precios en Backend

El cálculo final del total verificado en el backend seguirá esta fórmula:

**Total Verificado =**
  (Suma de precios de productos individuales fuera de paquetes, con sus extras)
  **+** (Suma de `packagePrice` de todos los paquetes en el carrito)
  **+** (Suma del costo de todos los `extras` añadidos a productos *dentro* de los paquetes)

El cálculo de impuestos (IVA) se aplicará sobre este **Total Verificado**.

---

## 6. Criterios de Aceptación

-   ✅ Un administrador puede crear, ver, actualizar y desactivar un paquete.
-   ✅ Un administrador puede crear, ver, actualizar y desactivar una promoción de descuento.
-   ✅ Un cliente puede ver los paquetes y promociones en el menú.
-   ✅ Un cliente puede añadir un paquete al carrito.
-   ✅ Un cliente puede personalizar (agregar y quitar extras) un producto que forma parte de un paquete desde el carrito.
-   ✅ El precio total del carrito se actualiza correctamente para reflejar el costo de los extras añadidos a un paquete.
-   ✅ El backend verifica y calcula correctamente el precio final de un pedido que contiene paquetes personalizados.
-   ✅ Existen pruebas automatizadas que cubren la lógica de precios y el flujo de usuario.