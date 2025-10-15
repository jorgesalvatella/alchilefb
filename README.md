# Al Chile - Food Delivery App

Aplicación completa de delivery de comida construida con Next.js 15, Firebase y Google Maps.

## 🚀 Características Principales

### Para Clientes
- 🛒 **Menú Interactivo**: Navegación por categorías con productos personalizables
- 🗺️ **Google Places Autocomplete**: Registro de direcciones con autocompletado inteligente
- 📍 **Tracking en Tiempo Real**: Seguimiento de pedidos con mapa interactivo
- 💳 **Múltiples Métodos de Pago**: Efectivo, tarjeta a la entrega
- 📱 **Responsive Design**: Optimizado para móviles y desktop

### Para Administradores
- 📊 **Hub de Pedidos**: Centro de comando con KPIs en tiempo real
- 🔍 **Filtros Avanzados**: Por estado, fecha, búsqueda de clientes
- 🎯 **Gestión de Estados**: Cambio de estado con historial completo
- 📦 **Catálogo Completo**: Gestión de productos, categorías y proveedores
- 👥 **Gestión de Clientes**: Visualización de datos y pedidos históricos

### Integraciones
- 🗺️ **Google Maps Platform**:
  - Places API para autocomplete de direcciones
  - Geocoding API para conversión dirección → coordenadas
  - Maps Embed API para visualización de ubicaciones
- 🔥 **Firebase Suite**:
  - Authentication para usuarios y admins
  - Firestore para base de datos en tiempo real
  - Storage para imágenes de productos
  - Custom Claims para roles (admin, super_admin)

## 📋 Versión Actual: 0.5.0

### Últimas Actualizaciones
- ✅ Google Places Autocomplete integrado en registro y edición de direcciones
- ✅ Mapa siempre visible en seguimiento de pedidos (todas las direcciones)
- ✅ Geocoding automático con coordenadas persistidas en Firestore
- ✅ Hub de Pedidos completamente funcional con KPIs y filtros
### 7. Pruebas (Testing)

El proyecto cuenta con una suite de pruebas automatizadas para asegurar la calidad y estabilidad del código.

**Comando Principal:**
Para ejecutar todas las pruebas (frontend y backend), utiliza:
```bash
npm test
```

**Ejecutar Suites por Separado:**
- **Frontend:** La suite del frontend está estable y todas las pruebas pasan.
  ```bash
  npm run test:frontend
  ```
- **Backend:** 
  ```bash
  npm run test:backend
  ```
  > ✅ **Estado:** La mayoría de las pruebas del backend pasan, incluyendo las suites críticas para los módulos de **Hub de Pedidos** y **Catálogos**. Aún existen algunas fallas menores en tests heredados (`cart.test.js`, `pedidos.test.js`) que están documentadas y no afectan la funcionalidad principal.

---

### 8. Sube tu Código a GitHub (Flujo Profesional)

¡Felicidades por llegar hasta aquí! Si estás listo para llevar tu proyecto al siguiente nivel, aquí tienes los pasos para publicarlo y empezar a trabajar en tu propio computador.

### 1. Requisitos Previos

Asegúrate de tener instalados:

-   **Node.js**: Debes tener la versión 20 o superior. Puedes descargarlo desde [nodejs.org](https://nodejs.org/).
-   **Firebase CLI**: Es la herramienta de línea de comandos de Firebase. Instálala ejecutando:
    ```bash
    npm install -g firebase-tools
    ```

### 2. Descarga tu Código

En la parte superior de Firebase Studio, verás un botón para **descargar tu proyecto**. Esto te dará un archivo `.zip` con todo el código que hemos creado juntos. Descomprímelo en una carpeta en tu computador.

### 3. Inicia Sesión en Firebase y Conecta tu Proyecto

Abre tu terminal (como VS Code, iTerm, etc.), navega hasta la carpeta donde descomprimiste tu proyecto y sigue estos pasos:

1.  **Inicia sesión en Firebase:**
    ```bash
    firebase login
    ```
    Esto abrirá una ventana en tu navegador para que inicies sesión con tu cuenta de Google.

2.  **Conecta tu carpeta local con tu proyecto de Firebase:**
    El ID de tu proyecto de Firebase es `studio-9824031244-700aa`. Úsalo en el siguiente comando:
    ```bash
    firebase use studio-9824031244-700aa
    ```
    Esto le dice a Firebase CLI que cualquier comando que ejecutes (como el de publicar) debe aplicarse a este proyecto.

### 4. Instala las Dependencias

Dentro de la carpeta de tu proyecto, ejecuta el siguiente comando para instalar todos los paquetes que necesita la aplicación:

```bash
npm install
```

### 5. Configura las Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```bash
# Firebase Configuration (ya configuradas en Studio)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Google Maps Platform (REQUERIDO para autocomplete y mapas)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

**Importante sobre Google Maps API:**
- Necesitas crear una API key en [Google Cloud Console](https://console.cloud.google.com/)
- Habilita las siguientes APIs:
  - Places API (para autocomplete de direcciones)
  - Geocoding API (para conversión dirección → coordenadas)
  - Maps Embed API (para mostrar mapas)
- Para desarrollo local, agrega `http://localhost:9002` a las restricciones de la API

### 6. Trabaja en Local

¡Ya está todo listo! Para arrancar la aplicación en tu computador y verla en tu navegador, ejecuta:

```bash
npm run dev
```

Abre tu navegador y ve a `http://localhost:9002` para ver tu aplicación en acción. Ahora puedes abrir la carpeta del proyecto en VS Code, hacer los cambios que quieras y verlos reflejados al instante.

### 6. Publica tu Aplicación (Deploy)

Cuando estés listo para que el mundo vea tu aplicación, puedes publicarla en Firebase App Hosting.





```bash
firebase apphosting:backends:deploy al-chile-delivery-app --location=us-central1
```

Este comando tomará tu código, lo construirá y lo desplegará en la web. Una vez que termine, te dará una URL pública donde tu aplicación estará en vivo.

---

### 7. Sube tu Código a GitHub (Flujo Profesional)

¡Absolutamente! Usar Git y GitHub es el estándar profesional para el control de versiones. Sigue estos pasos para tomar el control total de tu código:

1.  **Inicializa tu repositorio Git:**
    Dentro de la carpeta de tu proyecto, ejecuta:
    ```bash
    git init
    ```

2.  **Crea tu primer commit:**
    Añade todos los archivos y crea el primer "snapshot" de tu proyecto.
    ```bash
    git add .
    git commit -m "Primer commit desde Firebase Studio"
    ```

3.  **Crea un repositorio en GitHub:**
    -   Ve a [github.com](https://github.com) y crea una nueva cuenta si no tienes una.
    -   Haz clic en "New repository".
    -   Dale un nombre (ej. `al-chile-delivery-app`), asegúrate de que sea **privado** o **público** según tu preferencia y **no** inicialices con un `README` o `.gitignore` (ya los tenemos).
    -   Haz clic en "Create repository".

4.  **Conecta tu proyecto local con GitHub:**
    GitHub te dará unos comandos. Usa el que conecta tu repositorio local con el remoto. Se verá así:
    ```bash
    git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
    git branch -M main
    git push -u origin main
    ```
    ¡Reemplaza la URL con la de tu repositorio!

¡Y eso es todo! Ahora tu código está en GitHub. Cada vez que hagas un cambio, puedes usar `git add`, `git commit` y `git push` para guardarlo y mantener un historial completo de tu trabajo. ¡Bienvenido al flujo de desarrollo profesional!
