# Módulo de Logo desde Firebase Storage

**Fecha:** 27 de Octubre, 2025
**Estado:** ✅ **IMPLEMENTADO**

---

## 📋 Descripción

Sistema dinámico para cargar el logo del header desde Firebase Storage utilizando configuración en Firestore. Permite cambiar el logo sin modificar código ni hacer redeploy.

---

## 🏗️ Arquitectura

### Componentes

1. **Backend**: Endpoint `/api/generate-signed-url` (ya existente del módulo signed-url)
2. **Firestore**: Colección `config` → documento `site` → campo `logoPath`
3. **Frontend Hook**: `useLogoUrl()` que consulta Firestore y obtiene la signed URL
4. **Header**: Componente que usa el hook para mostrar el logo dinámicamente

### Flujo de Datos

```
Firestore (config/site)
    ↓
useLogoUrl() lee logoPath
    ↓
useSignedUrl(logoPath) obtiene URL pública con token
    ↓
Header muestra el logo
```

---

## 📦 Archivos Implementados

- **Hook principal**: `src/hooks/use-logo-url.tsx`
- **Componente**: `src/components/layout/header.tsx` (modificado)
- **Backend endpoint**: `backend/app.js` - `/api/config/init-logo` (nuevo)
- **Documentación**: Este archivo

---

## 🚀 INSTRUCCIONES PARA SUBIR EL LOGO

### Paso 1: Subir el Logo a Firebase Storage

1. Abre la [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **studio-9824031244-700aa**
3. Ve a **Storage** en el menú lateral
4. Haz clic en el bucket: `studio-9824031244-700aa.firebasestorage.app`
5. Crea la carpeta `logos/` (si no existe):
   - Haz clic en "Create folder"
   - Nombre: `logos`
6. Dentro de la carpeta `logos/`, sube tu archivo:
   - Haz clic en "Upload file"
   - Selecciona tu logo final
   - **Importante**: Renombra el archivo a `header-logo.png` (o el nombre que prefieras)
7. Verifica que la ruta completa sea: `logos/header-logo.png`

### Paso 2: Inicializar la Configuración en Firestore

Ejecuta la siguiente petición API (usa Postman, curl, o tu herramienta favorita):

**Endpoint:** `POST http://localhost:8080/api/config/init-logo`

**Headers:**
```
Authorization: Bearer <tu-firebase-id-token>
Content-Type: application/json
```

**Respuesta esperada:**
```json
{
  "message": "Configuración del logo inicializada correctamente",
  "logoPath": "logos/header-logo.png"
}
```

> **Nota**: Este endpoint requiere autenticación como `admin` o `super_admin`.

#### Alternativa: Crear el documento manualmente en Firestore

1. Ve a **Firestore Database** en Firebase Console
2. Crea la colección `config` (si no existe)
3. Dentro de `config`, crea el documento `site`
4. Agrega el campo:
   - **Campo**: `logoPath`
   - **Tipo**: `string`
   - **Valor**: `logos/header-logo.png`

### Paso 3: Verificar en la Aplicación

1. Recarga tu aplicación en el navegador
2. El logo debería aparecer en el header
3. Si ves un estado de carga (skeleton) que no desaparece, revisa la consola del navegador

---

## 🔧 CAMBIAR EL LOGO EN EL FUTURO

### Opción 1: Subir Nuevo Archivo con el Mismo Nombre

1. Sube el nuevo logo a Firebase Storage en `logos/header-logo.png` (reemplazando el archivo existente)
2. **Importante**: Debes actualizar el token del archivo para que se refresque:
   - En Firebase Console, selecciona el archivo
   - Haz clic en los 3 puntos → "Edit metadata"
   - Agrega o modifica cualquier metadato (ej: `updated: true`)
   - Guarda
3. Recarga la aplicación (puede tomar unos segundos por caché del navegador)

### Opción 2: Cambiar el Path en Firestore

1. Sube el nuevo logo a Firebase Storage con un nombre diferente (ej: `logos/logo-v2.png`)
2. Actualiza el documento en Firestore:
   - Ve a `config/site`
   - Cambia el campo `logoPath` a `logos/logo-v2.png`
3. La aplicación se actualizará automáticamente sin redeploy

---

## 🧪 Testing

El hook `useLogoUrl()` maneja estos casos:

- ✅ **Documento existe**: Lee `logoPath` de Firestore
- ✅ **Documento no existe**: Usa fallback `logos/header-logo.png`
- ✅ **Error de Firestore**: Usa fallback y muestra error en consola
- ✅ **Archivo no existe en Storage**: Muestra placeholder "AC"

---

## 🔍 Troubleshooting

### El logo no aparece

1. **Verifica que el archivo existe en Storage:**
   ```
   Ruta: logos/header-logo.png
   Bucket: studio-9824031244-700aa.firebasestorage.app
   ```

2. **Verifica la configuración en Firestore:**
   ```
   Colección: config
   Documento: site
   Campo: logoPath = "logos/header-logo.png"
   ```

3. **Revisa la consola del navegador:**
   - Busca errores relacionados con Firestore o Firebase Storage
   - Verifica que el endpoint `/api/generate-signed-url` responda correctamente

4. **Verifica las Storage Rules:**
   - El backend usa Firebase Admin SDK, no necesita reglas especiales
   - Pero asegúrate de que el archivo sea accesible via signed URLs

### El logo tarda mucho en cargar

- Primera carga: Es normal, se consulta Firestore + se genera la signed URL
- Cargas subsecuentes: El navegador cachea la imagen
- Para optimizar: Considera implementar caché en localStorage del `logoPath`

---

## 🎨 FORMATOS RECOMENDADOS PARA EL LOGO

- **Formato**: PNG con transparencia (para fondos variables)
- **Dimensiones**: 192x192px o 256x256px (cuadrado)
- **Peso**: < 50 KB (para carga rápida)
- **Alternativas**: SVG (mejor escalabilidad), WebP (menor peso)

---

## 📚 REFERENCIAS

- [Módulo Signed URL](../products/signed-url-module.md) - Base del sistema
- Hook base: `src/hooks/use-signed-url.tsx`
- Endpoint backend: `/api/generate-signed-url` (línea ~1992 en `backend/app.js`)

---

**Implementado por**: Claude Code
**Última actualización**: 2025-10-27
