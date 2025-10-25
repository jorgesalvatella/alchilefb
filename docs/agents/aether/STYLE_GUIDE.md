# Guía de Estilo UI/UX (Aether)

Este documento detalla la paleta de colores y los patrones de estilo utilizados en el proyecto "Al Chile FB", recopilados para asegurar la consistencia visual y la experiencia de usuario.

---

## 🎨 Paleta de Colores

Los colores se definen principalmente a través de variables CSS en `src/app/globals.css` y se extienden en `tailwind.config.ts`. Se favorece el uso de estas variables para mantener la coherencia del tema (claro/oscuro).

### Colores del Tema (Variables CSS)

| Nombre de la Variable | Descripción | Modo Claro (HSL) | Modo Oscuro (HSL) |
| :-------------------- | :---------- | :--------------- | :---------------- |
| `--background`        | Fondo principal | `0 0% 100%` (Blanco) | `0 0% 0%` (Negro) |
| `--foreground`        | Texto principal | `0 0% 3.9%` | `0 0% 98%` |
| `--card`              | Fondo de tarjetas | `0 0% 100%` (Blanco) | `0 0% 0%` (Negro) |
| `--card-foreground`   | Texto en tarjetas | `0 0% 3.9%` | `0 0% 98%` |
| `--primary`           | Color primario | `2 78% 42%` (`#C11B17`) | `2 78% 42%` (`#C11B17`) |
| `--primary-foreground`| Texto en primario | `0 0% 98%` | `0 0% 98%` |
| `--secondary`         | Color secundario | `0 0% 96.1%` | `0 0% 15%` |
| `--secondary-foreground`| Texto en secundario | `0 0% 9%` | `0 0% 98%` |
| `--muted`             | Elementos silenciados | `0 0% 96.1%` | `0 0% 15%` |
| `--muted-foreground`  | Texto silenciado | `0 0% 45.1%` | `0 0% 63.9%` |
| `--accent`            | Color de acento | `76 56% 55%` (`#A8C951`) | `76 56% 55%` (`#A8C951`) |
| `--accent-foreground` | Texto en acento | `45 100% 10%` | `45 100% 10%` |
| `--border`            | Bordes | `0 0% 89.8%` | `0 0% 20%` |
| `--input`             | Campos de entrada | `0 0% 89.8%` | `0 0% 20%` |
| `--ring`              | Anillos de enfoque | `2 78% 42%` | `2 78% 42%` |

### Colores Extendidos (Tailwind)

| Nombre de la Clase | Valor | Uso Común |
| :----------------- | :---- | :-------- |
| `chile-red`        | `#C11B17` | Alias para `--primary` |
| `fresh-green`      | `#A8C951` | Alias para `--accent` |
| `light-gray`       | `#F3F4F6` | Fondo claro específico |
| `orange-400`       | (definido en `globals.css`) | Elementos de acento, estados |
| `yellow-400`       | (definido en `globals.css`) | Gradientes, acentos |
| `red-600`          | (definido en `globals.css`) | Gradientes, acentos |
| `blue-400`         | (definido en `globals.css`) | Estados específicos |
| `green-600`        | (definido en `globals.css`) | Estados específicos |
| `gray-900/50`      | `#111827` con 50% opacidad | Fondos de tarjetas oscuras |
| `gray-700`         | `#374151` | Bordes, esqueletos |
| `gray-600`         | `#4B5563` | Esqueletos |
| `gray-300`         | `#D1D5DB` | Iconos en estado vacío (modo claro) |

---

## 📐 Patrones de Estilo

### 1. Diseño General y Contenedores

*   **Contenedor Principal de Página:**
    *   Clases: `container mx-auto px-4 py-12 sm:px-6 lg:px-8 pt-32`
    *   Propósito: Centrar el contenido, aplicar padding responsivo y un `padding-top` consistente para dejar espacio al encabezado global.

### 2. Tipografía y Encabezados

*   **Título Principal de Página (`h1`):**
    *   Clases: `text-6xl md:text-8xl font-black text-white mb-6`
    *   **Estilo de Gradiente para Títulos:**
        *   Clases: `bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent`
        *   Propósito: Efecto visual distintivo para títulos importantes.
*   **Subtítulos/Descripciones de Página (`p`):**
    *   Clases: `text-xl text-white/80 max-w-2xl mx-auto`
    *   Propósito: Descripciones centradas y legibles.

### 3. Componentes de Tarjeta (`Card`)

*   **Estilo Base de Tarjeta (Modo Oscuro):**
    *   Clases: `rounded-lg border bg-card text-card-foreground shadow-sm`
    *   **Variante Específica para Tarjetas Oscuras:**
        *   Clases: `bg-gray-900/50 border-gray-700 text-white` (o `bg-card border-gray-700 text-white` para usar la variable)
    *   **Interacción al Pasar el Ratón:**
        *   Clases: `hover:shadow-lg transition-shadow cursor-pointer` (a menudo combinado con `hover:scale-105`)

### 4. Botones (`Button`)

*   **Botón Primario (Acción Principal):**
    *   Clases: `bg-orange-500 text-white hover:bg-orange-600 font-bold`
*   **Botón Outline (Acción Secundaria/Filtro):**
    *   Clases: `variant="outline" text-primary border-primary hover:bg-primary/10`
*   **Botones de Filtro Inactivos:**
    *   Clases: `text-muted-foreground hover:bg-accent/10`

### 5. Esqueletos de Carga (`Skeleton`)

*   **Estilo General:**
    *   Clases: `bg-gray-700` o `bg-gray-600`
    *   Propósito: Indicadores visuales de carga en modo oscuro.

### 6. Colores de Texto Adicionales

*   `text-foreground`: Color de texto principal del tema.
*   `text-muted-foreground`: Color de texto secundario/silenciado del tema.
*   `text-white/70`, `text-white/80`: Variantes de texto blanco con opacidad para descripciones.

### 7. Iconografía

*   Se utiliza la librería `lucide-react` para todos los iconos.

---

**Nota:** Este documento es una recopilación de los estilos existentes. Cualquier nueva implementación debe adherirse a estos patrones y utilizar las variables de color del tema siempre que sea posible. En caso de necesitar un color específico no definido, se debe justificar y considerar su adición a la paleta.
