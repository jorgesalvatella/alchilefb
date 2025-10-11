# Resumen de Contexto del Agente - 10/10/2025

**NOTA IMPORTANTE:** Este archivo es una "memoria a corto plazo" para los agentes de IA. Su único propósito es registrar el estado actual del trabajo para poder reanudarlo fácilmente. **NO sustituye ni modifica la documentación oficial del proyecto.** Los planes y arquitecturas definitivas se encuentran en la carpeta `/docs`.

---

## Objetivo Principal Actual

Implementar la refactorización del catálogo de ventas para usar una estructura jerárquica y relacional, abandonando el campo de texto `category`.

**Jerarquía Aprobada:** `Unidad de Negocio` -> `Departamento` -> `Categoría de Venta` -> `Producto de Venta`.

## Plan General Aprobado

1.  **Fase 1 (Backend):** Nexus implementará el nuevo modelo de datos y endpoints para `categoriasDeVenta` y actualizará los endpoints de `productosDeVenta`. Vanguard validará con pruebas.
2.  **Fase 2 (Frontend Admin):** Aether creará la UI para gestionar las nuevas categorías y refactorizará el formulario de producto para usar selects dependientes.
3.  **Fase 3 (Frontend Público):** Aether actualizará la página del menú público para usar la nueva estructura.

## Estado Actual Preciso

Nos encontramos al **inicio de la Fase 1 (Backend)**.

La **próxima acción inmediata** es que **Nexus** modifique el archivo `backend/app.js` para:
1.  Añadir los endpoints CRUD para `/api/control/catalogo/categorias-venta`.
2.  Modificar los endpoints de `productos-venta` para usar los nuevos campos relacionales (`businessUnitId`, `departmentId`, `categoriaVentaId`).

## Decisiones Clave Recientes

-   **Precios y Rentabilidad:** El admin introduce el precio final (IVA incl.). El backend calcula y guarda el `basePrice` (precio sin IVA) y acepta campos opcionales para `cost` y `platformFeePercent`. El formulario del admin muestra una "Calculadora de Rentabilidad" en tiempo real.
-   **IVA por Producto:** Se añadió un campo booleano `isTaxable` a cada producto para manejar artículos exentos de impuestos.
- **Subida de Archivos:** Se utilizan endpoints de API específicos por recurso (ej. `/api/control/productos-venta/upload-image`) en lugar de un endpoint genérico.

---

## Próximos Pasos

Al reanudar la sesión, todos los agentes deben tomar este archivo como punto de partida para re-establecer el contexto. La implementación continuará con la **Fase 1 (Backend)**, siguiendo las directrices detalladas en el plan maestro:

**`/docs/plan-productos.md`**