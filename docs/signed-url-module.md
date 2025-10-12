# Archivo de Estado: Módulo de URLs Firmadas

**Fecha:** 11 de Octubre, 2025

**Propósito:** Documentar el plan de implementación y el estado actual del módulo de URLs firmadas, necesario para servir imágenes desde un bucket de Cloud Storage privado debido a las políticas de seguridad de la organización `nobbora.com`.

**Estado General:** **En Progreso.** Fase 1 (Backend) casi completa.

---
## Fase 1: Backend - Endpoint de URLs Firmadas (Rol: Nexus)

*   **Objetivo:** Crear un endpoint público que convierta una ruta de archivo en una URL de acceso temporal y segura.
*   **Estado:** **Implementado, pero las pruebas están fallando.**

### Implementación (`backend/app.js`):
```javascript
app.get('/api/generate-signed-url', async (req, res) => {
  const { filePath } = req.query;
  if (!filePath) {
    return res.status(400).send('Missing required query parameter: filePath');
  }
  try {
    const bucket = getStorage().bucket();
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).send('File not found');
    }
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: expiresAt,
    });
    res.status(200).json({ signedUrl });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).send('Internal Server Error');
  }
});
```

### Pruebas (`backend/index.test.js`):
*   **Estado:** La prueba para el caso de éxito (`should return 200...`) está fallando inesperadamente con un `404 Not Found`.
*   **Causa Raíz:** Se sospecha de una fuga de estado en la configuración del mock de Jest, donde el estado de la prueba "404" afecta a la prueba "200".

### Próxima Acción Inmediata:
*   **Vanguard:** Debe depurar y corregir la prueba fallida en `backend/index.test.js` para asegurar que el mock de `admin.storage()` funcione de forma aislada para cada test.

---
## Fase 2: Frontend - Hook de Abstracción (Rol: Aether)

*   **Objetivo:** Crear un hook reutilizable para encapsular la lógica de `fetch` de las URLs firmadas.
*   **Estado:** **No Iniciado.**
*   **Plan:**
    1.  Crear `src/hooks/use-signed-url.tsx`.
    2.  El hook `useSignedUrl(filePath)` recibirá una ruta de archivo.
    3.  Hará un `fetch` a `/api/generate-signed-url`.
    4.  Devolverá `{ signedUrl, isLoading, error }`.

---
## Fase 3: Frontend - Integración en la UI (Rol: Aether)

*   **Objetivo:** Reemplazar el uso directo de URLs de Storage con un componente que utilice el nuevo hook.
*   **Estado:** **No Iniciado.**
*   **Plan:**
    1.  Crear un componente `StorageImage.tsx`.
    2.  Este componente usará el hook `useSignedUrl`.
    3.  Mostrará un esqueleto de carga mientras se obtiene la URL.
    4.  Renderizará el componente `<Image>` de Next.js con la URL firmada.
    5.  Reemplazar todos los usos de `<Image>` para imágenes de productos con este nuevo componente.
