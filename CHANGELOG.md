# Changelog

## Versión 0.4.0 - 13 de Octubre de 2025

### 📋 Planificación y Diseño

-   **Especificación Completa del Hub de Pedidos:**
    -   Se documentó completamente el sistema de gestión de pedidos en `docs/live-driver-tracking-module.md`.
    -   Diseño de interfaz con 4 secciones: KPIs, Filtros, Tabla Mejorada, Panel de Detalles.
    -   Definición de 5 endpoints de backend para gestión de pedidos.
    -   Plan de implementación por fases (0-3) con roadmap claro.
    -   Identificación de problemas actuales en `/control/pedidos` (colección incorrecta, información limitada).

-   **Roadmap del Sistema de Seguimiento:**
    -   **Fase 0 (✅ COMPLETADA):** Hub de Pedidos - Centro de comando con KPIs, filtros y gestión completa
    -   **Fase 1:** Asignación de repartidores con transacciones atómicas
    -   **Fase 2:** App del repartidor con GPS tracking en tiempo real
    -   **Fase 3:** Tracking del cliente con Google Maps JavaScript API

-   **Arquitectura de Datos Actualizada:**
    -   Extensión del tipo `Order` con campos: `statusHistory`, `cancelReason`, `userName`, `userEmail`, `deliveredAt`
    -   Preparación para campos futuros: `driverId`, `driverName`, `driverLocation`
    -   Estandarización de estados: `'Pedido Realizado' | 'Preparando' | 'En Reparto' | 'Entregado' | 'Cancelado'`

-   **Sistema de Diseño para Hub de Pedidos:**
    -   Badges de estado con colores semánticos consistentes
    -   Layout de 4 KPI cards con grid responsive
    -   Pills de filtros con hover effects
    -   Sheet lateral para detalles de pedidos
    -   Timeline visual de estados con iconos

### ✨ Nuevas Características (Features)

-   **Hub de Pedidos Completamente Implementado:**
    -   **Página Principal:** `/control/pedidos` completamente rediseñada como centro de comando
    -   **Sistema de KPIs en Tiempo Real:**
        -   Pedidos de hoy con comparación vs día anterior (% de cambio)
        -   Pedidos activos con desglose por estado (Preparando / En Reparto)
        -   Ingresos del día con ticket promedio
        -   Tiempo promedio de entrega (desde pedido hasta entrega)
    -   **Sistema de Filtros Avanzado:**
        -   Filtros por estado con pills coloridas y contadores
        -   Búsqueda con debounce de 300ms (ID, cliente, dirección)
        -   Filtros temporales: Hoy, Última Semana, Este Mes, Rango Personalizado
    -   **Tabla Mejorada de Pedidos:**
        -   8 columnas: ID, Cliente, Fecha, Dirección, Repartidor, Total, Estado, Acciones
        -   Información del cliente con email y teléfono visible
        -   Soporte para 3 tipos de dirección (guardada, WhatsApp, GPS)
        -   Estados vacíos informativos
        -   Skeleton loaders para mejor UX
    -   **Panel de Detalles Completo (Sheet Lateral):**
        -   Cambio de estado con selector dropdown
        -   Timeline visual del historial de estados
        -   Información completa del cliente
        -   Lista detallada de artículos con customizaciones
        -   Método de pago y total
        -   Información del repartidor (si está asignado)
        -   Cancelación de pedidos con motivo obligatorio
        -   Validaciones: no se puede cancelar pedidos entregados

### 📊 Endpoints de Backend (Implementados)

-   **GET `/api/pedidos/control`** - Listar pedidos con filtros
    -   Parámetros: `status`, `startDate`, `endDate`, `search`, `limit`, `offset`
    -   Denormalización de datos de usuario para búsqueda eficiente
    -   Paginación con limit/offset (default: 50)
    -   Requiere autenticación con rol `admin` o `super_admin`

-   **GET `/api/pedidos/control/stats`** - KPIs en tiempo real
    -   Cálculo de pedidos de hoy y comparación con día anterior
    -   Conteo de pedidos activos por estado
    -   Ingresos totales del día y ticket promedio
    -   Tiempo promedio de entrega (minutos)
    -   Requiere autenticación con rol `admin` o `super_admin`

-   **PUT `/api/pedidos/control/:orderId/status`** - Cambiar estado
    -   Validación de estados permitidos
    -   Registro automático en `statusHistory` con timestamp y usuario
    -   Actualización de `deliveredAt` cuando el estado cambia a 'Entregado'
    -   Requiere autenticación con rol `admin` o `super_admin`

-   **GET `/api/pedidos/control/:orderId`** - Obtener detalles completos
    -   Incluye toda la información del pedido
    -   Datos del cliente, artículos, historial de estados
    -   Requiere autenticación con rol `admin` o `super_admin`

-   **DELETE `/api/pedidos/control/:orderId/cancel`** - Cancelar pedido
    -   Validación: no se puede cancelar pedidos entregados
    -   Registro de `cancelReason`, `cancelledAt`, `cancelledBy`
    -   Actualización automática de `statusHistory`
    -   Requiere autenticación con rol `admin` o `super_admin`

### 🎯 Componentes de Frontend (Implementados)

-   **src/components/orders/OrdersKPIs.tsx** (115 líneas)
    -   4 cards de métricas con iconos y colores semánticos
    -   Indicadores de tendencia con flechas (↑↓)
    -   Skeleton loaders mientras carga
    -   Grid responsive (1/2/4 columnas)

-   **src/components/orders/OrdersFilters.tsx** (169 líneas)
    -   Pills de estado con colores consistentes con badges
    -   Efecto ring al seleccionar un filtro
    -   Input de búsqueda con icono
    -   Selector de fecha con Calendar icon
    -   Contadores de pedidos por estado

-   **src/components/orders/OrdersTable.tsx** (221 líneas)
    -   Tabla completa con 8 columnas
    -   Formateo de fechas, moneda y direcciones
    -   Badges de estado con colores semánticos
    -   Botón "Ver" para abrir detalles
    -   Estado vacío con CTA
    -   Skeleton loaders

-   **src/components/orders/OrderDetailsSheet.tsx** (550 líneas)
    -   Sheet lateral con scroll
    -   Selector de estado (disabled si está entregado/cancelado)
    -   Timeline visual de estados con iconos y colores
    -   Información del cliente (nombre, email, teléfono)
    -   Dirección de entrega formateada
    -   Lista de artículos con customizaciones y subtotales
    -   Método de pago
    -   Repartidor asignado (si existe)
    -   Alert de cancelación con razón obligatoria
    -   Dialog de confirmación para cancelar

-   **src/app/control/pedidos/page.tsx** (333 líneas)
    -   Integración completa de todos los componentes
    -   Gestión de estado con useState y useCallback
    -   Debounce de búsqueda (300ms)
    -   Llamadas a API con autenticación Firebase
    -   Cálculo de contadores de estado en frontend
    -   Manejo de errores con toast notifications (sonner)
    -   Redirección si no está autenticado
    -   Refresco automático de datos tras actualizar estado o cancelar

### 🔧 Mejoras Técnicas

-   **Correcciones en Backend:**
    -   Se corrigió el estado inicial de `'Recibido'` a `'Pedido Realizado'` en POST `/api/pedidos`
    -   Se agregó `statusHistory` al crear un nuevo pedido
    -   Se corrigió la colección de `'orders'` a `'pedidos'` en todos los endpoints

-   **Denormalización de Datos:**
    -   Se almacenan `userName`, `userEmail`, `userPhone` directamente en el pedido
    -   Permite búsquedas rápidas sin joins de colecciones

-   **Gestión de Estado con Historial:**
    -   Cada cambio de estado se registra en `statusHistory` con timestamp y usuario
    -   Se usa `admin.firestore.FieldValue.arrayUnion()` para agregar al historial
    -   Se usa `admin.firestore.FieldValue.serverTimestamp()` para timestamps precisos

-   **Optimizaciones de UX:**
    -   Debounce de 300ms en búsqueda para reducir llamadas a API
    -   Skeleton loaders en todos los componentes
    -   Toast notifications para feedback inmediato
    -   Refresco automático de datos tras operaciones

### 🔍 Problemas Resueltos

-   ✅ Colección incorrecta: `'orders'` → `'pedidos'` (corregido)
-   ✅ Sistema de filtros por estado implementado
-   ✅ Sistema de filtros por fecha implementado (hoy, semana, mes)
-   ✅ Búsqueda por ID, cliente y dirección implementada
-   ✅ KPIs visibles para administradores (4 métricas principales)
-   ✅ Gestión de estados desde la interfaz (selector + validaciones)
-   ✅ Información completa en la tabla (8 columnas)
-   ✅ Preparación para asignación de repartidores (campos en Order type)

### 📝 Documentación

-   **Documento maestro actualizado:**
    -   `docs/live-driver-tracking-module.md` expandido de 171 a 984 líneas
    -   3 partes claramente definidas: Hub de Pedidos, Seguimiento de Repartidores, Plan Maestro
    -   Diagramas ASCII de flujo y conexión entre fases
    -   Criterios de aceptación detallados para cada fase
    -   Métricas de éxito cuantificables

-   **Swagger Documentation:**
    -   Se agregaron anotaciones Swagger para todos los 5 nuevos endpoints
    -   Esquemas definidos para: OrdersListResponse, OrdersStatsResponse, OrderDetailResponse, etc.
    -   Ejemplos de respuestas incluidos

### ✅ Testing

-   **Tests de Backend (18 tests - todos pasan):**
    -   **backend/pedidos-control.test.js** - Suite completa de tests para endpoints del Hub
    -   GET `/api/pedidos/control`: 3 tests (lista de pedidos, filtros, permisos)
    -   GET `/api/pedidos/control/stats`: 2 tests (KPIs, permisos)
    -   PUT `/api/pedidos/control/:orderId/status`: 5 tests (actualización, validaciones, permisos)
    -   GET `/api/pedidos/control/:orderId`: 3 tests (detalles, not found, permisos)
    -   DELETE `/api/pedidos/control/:orderId/cancel`: 5 tests (cancelación, validaciones, permisos)

-   **Tests de Frontend (8 tests - todos pasan):**
    -   **src/components/orders/OrdersKPIs.test.tsx** - Tests del componente de KPIs
    -   Render de loading skeletons
    -   Render de 4 KPI cards con datos correctos
    -   Indicadores de tendencia (positivos/negativos)
    -   Iconos y colores semánticos
    -   Manejo de valores en cero

-   **Cobertura de Tests:**
    -   ✅ Todos los endpoints del Hub de Pedidos testeados
    -   ✅ Validaciones de permisos de admin
    -   ✅ Manejo de errores (404, 400, 403, 500)
    -   ✅ Componente principal de KPIs completamente testeado
    -   ✅ Mocks de Firebase Admin SDK y autenticación
    -   ✅ Mocks de iconos de lucide-react

### 📋 Tests Pendientes (TODO)

-   **Tests de Frontend - Componentes:**
    -   ⏳ `OrdersFilters.test.tsx` - Filtros por estado, búsqueda con debounce, selector de fechas
    -   ⏳ `OrdersTable.test.tsx` - Render de tabla, acciones (ver detalles), formateo de datos
    -   ⏳ `OrderDetailsSheet.test.tsx` - Sheet lateral, cambio de estado, cancelación de pedidos

-   **Tests de Integración:**
    -   ⏳ `pages/control/pedidos.test.tsx` - Test de integración de la página completa
    -   ⏳ Interacción entre componentes (KPIs → Filters → Table → Sheet)
    -   ⏳ Flujo completo de actualización de estado
    -   ⏳ Flujo completo de cancelación

-   **Tests E2E (Playwright):**
    -   ⏳ Login como admin y acceso al Hub de Pedidos
    -   ⏳ Navegación y filtrado de pedidos
    -   ⏳ Cambio de estado de un pedido
    -   ⏳ Cancelación de un pedido con razón
    -   ⏳ Visualización de detalles completos

## Versión 0.3.0 - 13 de Octubre de 2025

### ✨ Nuevas Características (Features)

-   **Integración de Google Maps para Seguimiento de Pedidos:**
    -   Se integró Google Maps Embed API para mostrar ubicaciones de entrega en tiempo real.
    -   Soporte para 3 tipos de dirección: dirección guardada, coordinación por WhatsApp, y ubicación GPS.
    -   Configuración de variable de entorno `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
    -   Visualización dinámica de mapas embebidos cuando el pedido tiene ubicación GPS.

-   **Página de Seguimiento de Pedidos:**
    -   Nueva página `/mis-pedidos/[id]` con tracker visual de estados del pedido.
    -   4 etapas de seguimiento: Pedido Realizado → Preparando → En Reparto → Entregado.
    -   Indicadores visuales con iconos y colores por estado (naranja para activo, verde para entregado).
    -   Integración con mapa/dirección de entrega según tipo de envío.
    -   Lista detallada de artículos del pedido con precios.

### 🎨 Mejoras de Diseño (Design System)

-   **Estandarización Completa del Sistema de Diseño:**
    -   **Paleta de Colores Unificada:**
        -   Primario: Orange-500/600 para CTAs y elementos destacados
        -   Éxito: Fresh-green (#A8C951) para estados completados
        -   Fondo: Gray-900/800 con overlays semi-transparentes
        -   Jerarquía de texto: white, white/80, white/70, white/60
        -   Gradientes de acento: yellow-400 → orange-500 → red-600

    -   **Tipografía y Layout Estandarizado:**
        -   Títulos principales: `text-6xl md:text-8xl font-black` con gradiente
        -   Subtítulos: `text-xl text-white/80 max-w-2xl mx-auto`
        -   Padding superior uniforme: `pt-32` en todas las páginas (23 páginas actualizadas)
        -   Espaciado responsivo: `px-4 py-12 sm:px-6 lg:px-8`

    -   **Componentes Estandarizados:**
        -   Cards: `bg-gray-900/50 border-gray-700` con efectos hover
        -   Títulos de cards: `text-orange-400`
        -   Botones: Orange primario, verde para acciones de éxito
        -   Skeletons de carga: Paleta gray-700/600

-   **Páginas Rediseñadas (23 total):**
    -   **Públicas (6):** menu, carrito, pago, mis-pedidos, mis-pedidos/[id], perfil
    -   **Admin (17):** pedidos, productos-venta, productos-venta/nuevo, productos-venta/[id]/editar, productos, clientes, finanzas/proveedores, + 10 páginas de catálogo

### 🔧 Mejoras Técnicas (Technical Improvements)

-   **Estandarización de Tipos de Datos:**
    -   Unificación del tipo `Order` desde `/lib/types.ts` en todas las páginas.
    -   Nomenclatura consistente: `status`, `createdAt`, `totalVerified`.
    -   Tipo de dirección como union: `Address | 'whatsapp' | string`.
    -   Conexión completa entre lista de pedidos y página de detalle.

-   **Mejoras de UX:**
    -   Estados vacíos mejorados con iconos y CTAs claros.
    -   Color coding semántico en estados de pedidos.
    -   Transiciones suaves entre estados del tracker.
    -   Hover effects consistentes en todos los componentes interactivos.

### 📝 Documentación

-   **Variables de Entorno Documentadas:**
    -   Agregada configuración de `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` en `.env.local`
    -   Documentación de restricciones de API para desarrollo local (puerto 9002)

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
