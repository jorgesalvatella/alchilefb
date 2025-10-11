# Changelog

## Versión 0.2.0 - 10 de Octubre de 2025

### ✨ Nuevas Características (Features)

-   **Documentación de API con Swagger:**
    -   Se implementó `swagger-jsdoc` y `swagger-ui-express` en el backend de Express.
    -   Se generó documentación interactiva para todos los endpoints del módulo de Catálogos y Proveedores.
    -   Se securizó el endpoint `/api-docs` para que solo sea accesible por usuarios con rol de `super_admin`.

### 🐛 Correcciones (Bug Fixes)

-   **Reparación Completa de la Suite de Pruebas del Catálogo:**
    -   Se corrigió la configuración de Jest (`jest.config.js`) para resolver correctamente los alias de ruta (`@/hooks`).
    -   Se añadieron mocks faltantes para componentes de UI (`lucide-react`) que causaban errores de renderizado.
    -   Se validó que toda la suite de pruebas del frontend (`npm run test:frontend`) y del backend (`npm run test:backend`) pase sin errores.

## Versión 0.1.0 - 9 de Octubre de 2025

-   **Corrección de Tests en Catálogo de Conceptos:**
    -   Se arregló la suite de pruebas para el componente de `AdminConceptsPage` (`src/app/control/catalogo/unidades-de-negocio/[id]/departamentos/[depId]/grupos/[groupId]/conceptos/page.test.tsx`).
