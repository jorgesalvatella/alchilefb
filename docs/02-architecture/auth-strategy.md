# Arquitectura de Seguridad y Permisos: Enfoque API-First

Este documento presenta el plan arquitectónico definitivo para el manejo de la aplicación, basado en un enfoque "API-First" que centraliza la lógica de negocio y seguridad en un backend dedicado.

---

### Capa 1: Frontend (La Interfaz de Usuario)

- **Tecnología:** **Next.js**.
- **Responsabilidad:** Renderizar la interfaz de usuario y gestionar la experiencia del cliente. **No tiene acceso directo a la base de datos.**
- **Comunicación:** Todas las peticiones de datos (lectura o escritura) se realizan a la API de Backend.

---

### Capa 2: Autenticación (La Identidad)

- **Tecnología:** **Firebase Authentication**.
- **Responsabilidad:** Es la única fuente de verdad para saber **quién** es un usuario. Provee un `idToken` que se adjunta a cada petición a la API de Backend.

---

### Capa 3: Autorización (Los Roles)

- **Tecnología:** **Firebase Custom Claims**.
- **Fuente de Verdad:** El `idToken` del usuario contiene los roles (ej. `super_admin: true`). La API de Backend decodifica y verifica este token en cada petición para decidir si el usuario tiene permiso para realizar una acción.

---

### Capa 4: API de Backend (El Intermediario y Cerebro)

- **Tecnología:** Una aplicación única construida con **Express.js** y desplegada en **Cloud Run**.
- **Responsabilidad:** Es el **único punto de entrada** para todas las operaciones de datos. Centraliza toda la lógica de negocio y de permisos.
- **Flujo de Petición:**
    1. Recibe una petición del frontend (ej. `GET /departments`).
    2. Verifica el `idToken` de Firebase que viene con la petición.
    3. Revisa los "Custom Claims" dentro del token para autorizar la acción (ej. ¿es admin?).
    4. Si está autorizado, usa el SDK de Admin para comunicarse con Firestore.
    5. Devuelve los datos solicitados (o un resultado) al frontend.

---

### Capa 5: Acceso a Datos y Reglas de Seguridad (La Bóveda)

- **Tecnología:** **Firestore**.
- **Acceso:** Solo la API de Backend (a través del SDK de Admin) puede leer o escribir en la base de datos.
- **Archivo:** `firestore.rules`.
- **Lógica de Reglas:** Las reglas de seguridad se simplifican al máximo. Se configurarán para **denegar todas las lecturas y escrituras** provenientes directamente de los clientes (navegadores), forzando a que todo el tráfico pase por nuestra API segura.
    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        // Denegar todo el acceso desde el cliente.
        match /{document=**} {
          allow read, write: if false;
        }
      }
    }
    ```