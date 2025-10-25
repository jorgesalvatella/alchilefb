# Problemas y Pendientes - Repartidores Dashboard

Este documento registra los problemas y las inconsistencias encontradas durante el desarrollo y ajuste de la interfaz del dashboard de repartidores (`src/app/repartidor/dashboard/page.tsx`) y sus componentes relacionados.

---

## 1. Advertencia de Desaprobación `util._extend`

*   **Descripción:** Se detectó una advertencia de desaprobación (`DEP0060`) relacionada con el uso de la API `util._extend` de Node.js.
*   **Origen:** La advertencia proviene de una dependencia interna de Next.js (`http-proxy`), no directamente del código del proyecto.
*   **Stack Trace Relevante:**
    ```
    (node:68174) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
        at ProxyServer.<anonymous> (/home/beto/projects/alchilefb/node_modules/next/dist/compiled/http-proxy/index.js:13:2607)
        at proxyRequest (/home/beto/projects/alchilefb/node_modules/next/dist/server/lib/router-utils/proxy-request.js:108:15)
    ```
*   **Solución Propuesta:** Actualizar Next.js a su última versión (`npm install next@latest`). Se creó una rama de respaldo (`update-nextjs-backup`) antes de intentar la actualización.
*   **Estado:** Pendiente de confirmación de la actualización de Next.js y verificación de la eliminación de la advertencia.

---

## 2. Fondo Blanco Persistente en Componente `DriverStats`

*   **Descripción:** A pesar de los múltiples intentos de aplicar estilos de modo oscuro a la página y a los componentes de tarjeta, una sección específica (identificada visualmente como el área de estadísticas del repartidor) persiste con un fondo blanco, sobrescribiendo los estilos del tema oscuro.
*   **Origen:** El problema residía en el componente `<DriverStats />` (`@/components/repartidor/DriverStats`), que tenía clases hardcodeadas con fondos blancos (`bg-white`, `bg-blue-50`, etc.).
*   **Impacto:** Rompía la consistencia del tema oscuro en la página.
*   **Solución Implementada:**
    *   ✅ Se rediseñó completamente `DriverStats.tsx` con gradientes vibrantes:
      - Pendientes: Gradiente azul vibrante (`from-blue-500 to-blue-700`)
      - En Camino: Gradiente verde vibrante (`from-green-500 to-green-700`)
      - Completados: Gradiente naranja/rojo "Al Chile" (`from-orange-500 via-orange-600 to-red-600`)
    *   Se eliminaron todos los fondos blancos y se aplicaron colores consistentes con el tema oscuro
    *   Se agregaron efectos `hover:shadow-xl` y `transition-shadow` para mejor interactividad
*   **Estado:** ✅ **RESUELTO** (2025-10-25)

---

## 3. Scroll Horizontal en Vista Responsiva

*   **Descripción:** La página presentaba un scroll horizontal no deseado en dispositivos con pantallas pequeñas o en vista responsiva.
*   **Origen:** El problema era causado por:
    1. Título con gradiente muy grande sin `break-words`
    2. Contenedores de filtros y botones de ordenamiento sin manejo correcto de overflow
    3. Falta de `overflow-x-hidden` en el contenedor principal
*   **Impacto:** Afectaba la experiencia de usuario en dispositivos móviles.
*   **Solución Implementada:**
    *   ✅ Se agregó `overflow-x-hidden` al contenedor `<main>`
    *   ✅ Se redujo el tamaño del título en móviles (`text-5xl md:text-7xl lg:text-8xl`)
    *   ✅ Se agregó `break-words` al título para evitar desbordamiento
    *   ✅ Se implementó scroll horizontal controlado en filtros y botones con `scrollbar-hide`
    *   ✅ Se envolvieron los botones en contenedores con `min-w-max` para scroll interno
    *   ✅ Se agregó clase CSS global `.scrollbar-hide` en `globals.css`
*   **Estado:** ✅ **RESUELTO** (2025-10-25)
