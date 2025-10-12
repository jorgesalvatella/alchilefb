# Archivo de Estado: Módulo de URLs Públicas con Tokens de Firebase Storage

**Fecha:** 11 de Octubre, 2025

**Propósito:** Documentar la implementación completa del módulo de URLs públicas con tokens de Firebase Storage, necesario para servir imágenes desde un bucket privado sin usar autenticación con JSON de service account.

**Estado General:** ✅ **COMPLETADO Y FUNCIONANDO**

---

## ✅ Fase 1: Backend - Endpoint de URLs Públicas con Tokens

**Objetivo:** Crear un endpoint que genere URLs públicas con tokens de Firebase Storage para acceso permanente a archivos.

**Estado:** ✅ **IMPLEMENTADO Y PROBADO**

### Implementación Final (`backend/app.js` línea ~1992):

```javascript
app.get('/api/generate-signed-url', async (req, res) => {
  const { filePath } = req.query;
  if (!filePath) {
    return res.status(400).send('Missing required query parameter: filePath');
  }
  try {
    const bucket = getStorage().bucket();
    const file = bucket.file(filePath);

    // Verificar que el archivo existe
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).send('File not found');
    }

    // Obtener o crear token de descarga
    const [metadata] = await file.getMetadata();
    let token = metadata.metadata?.firebaseStorageDownloadTokens;

    if (!token) {
      const crypto = require('crypto');
      token = crypto.randomUUID();
      await file.setMetadata({
        metadata: { firebaseStorageDownloadTokens: token }
      });
    }

    // Generar URL pública con token
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;

    res.status(200).json({ signedUrl: publicUrl });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).send('Internal Server Error');
  }
});
```

### ✅ Pruebas (`backend/index.test.js`):

**Estado:** ✅ **TODAS LAS PRUEBAS PASANDO (80 tests totales)**

Mock configurado correctamente:
```javascript
const mockFileExists = jest.fn();
const mockGetMetadata = jest.fn();
const mockSetMetadata = jest.fn();

const mockFileMethods = {
  exists: mockFileExists,
  getMetadata: mockGetMetadata,
  setMetadata: mockSetMetadata,
};

const mockFile = jest.fn(() => mockFileMethods);
const mockBucket = jest.fn(() => ({
  name: 'test-bucket.appspot.com',
  file: mockFile,
}));

const storageMock = {
  bucket: mockBucket,
};

// Mock principal para firebase-admin
jest.mock('firebase-admin', () => ({
  storage: {
    getStorage: () => storageMock,
  },
  initializeApp: jest.fn(),
  credential: {
    applicationDefault: jest.fn(),
  },
}));

// Mock para firebase-admin/storage
jest.mock('firebase-admin/storage', () => ({
  getStorage: () => {
    const admin = require('firebase-admin');
    return admin.storage.getStorage();
  },
}));
```

---

## ✅ Fase 2: Frontend - Hook de Abstracción

**Objetivo:** Hook reutilizable para obtener URLs de imágenes desde el backend.

**Estado:** ✅ **IMPLEMENTADO**

### Implementación (`src/hooks/use-signed-url.tsx`):

```typescript
import { useState, useEffect } from 'react';

export function useSignedUrl(filePath: string | null | undefined) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!filePath) {
      setSignedUrl(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    fetch(`/api/generate-signed-url?filePath=${encodeURIComponent(filePath)}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setSignedUrl(data.signedUrl);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err);
        setIsLoading(false);
      });
  }, [filePath]);

  return { signedUrl, isLoading, error };
}
```

---

## ✅ Fase 3: Frontend - Integración en la UI

**Objetivo:** Componente reutilizable que muestra imágenes desde Firebase Storage.

**Estado:** ✅ **IMPLEMENTADO Y FUNCIONANDO**

### Implementación (`src/components/StorageImage.tsx`):

```typescript
import Image from 'next/image';
import { useSignedUrl } from '@/hooks/use-signed-url';

interface StorageImageProps {
  storagePath: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
}

export default function StorageImage({
  storagePath,
  alt,
  fill,
  width,
  height,
  className
}: StorageImageProps) {
  const { signedUrl, isLoading, error } = useSignedUrl(storagePath);

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 rounded" />;
  }

  if (error || !signedUrl) {
    return <div className="bg-gray-100 flex items-center justify-center">Error</div>;
  }

  return (
    <Image
      src={signedUrl}
      alt={alt}
      fill={fill}
      width={width}
      height={height}
      className={className}
    />
  );
}
```

---

## ✅ Configuración de Next.js

**Archivo:** `next.config.ts`

**Cambio Necesario:** Agregar `firebasestorage.googleapis.com` a los dominios permitidos para imágenes:

```typescript
images: {
  remotePatterns: [
    // ... otros dominios
    {
      protocol: 'https',
      hostname: 'firebasestorage.googleapis.com',
      port: '',
      pathname: '/**',
    },
  ],
},
```

---

## 🔧 INSTRUCCIONES PARA REPLICAR LA SOLUCIÓN

### 1. **Backend: Implementar el Endpoint**

En `backend/app.js`, agregar el endpoint `/api/generate-signed-url`:

```javascript
const { getStorage } = require('firebase-admin/storage');

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

    const [metadata] = await file.getMetadata();
    let token = metadata.metadata?.firebaseStorageDownloadTokens;

    if (!token) {
      const crypto = require('crypto');
      token = crypto.randomUUID();
      await file.setMetadata({
        metadata: { firebaseStorageDownloadTokens: token }
      });
    }

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
    res.status(200).json({ signedUrl: publicUrl });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).send('Internal Server Error');
  }
});
```

### 2. **Backend: Configurar Mocks de Jest**

En `backend/index.test.js`, configurar los mocks ANTES de importar el app:

```javascript
const mockFileExists = jest.fn();
const mockGetMetadata = jest.fn();
const mockSetMetadata = jest.fn();

const mockFileMethods = {
  exists: mockFileExists,
  getMetadata: mockGetMetadata,
  setMetadata: mockSetMetadata,
};

const mockFile = jest.fn(() => mockFileMethods);
const mockBucket = jest.fn(() => ({
  name: 'test-bucket.appspot.com',
  file: mockFile,
}));

const storageMock = { bucket: mockBucket };

jest.mock('firebase-admin', () => ({
  storage: { getStorage: () => storageMock },
  initializeApp: jest.fn(),
  credential: { applicationDefault: jest.fn() },
}));

jest.mock('firebase-admin/storage', () => ({
  getStorage: () => require('firebase-admin').storage.getStorage(),
}));
```

### 3. **Frontend: Crear el Hook**

Crear `src/hooks/use-signed-url.tsx` (código completo arriba).

### 4. **Frontend: Crear el Componente**

Crear `src/components/StorageImage.tsx` (código completo arriba).

### 5. **Configurar Next.js**

En `next.config.ts`, agregar `firebasestorage.googleapis.com` a `images.remotePatterns`.

### 6. **Usar el Componente**

```tsx
<StorageImage
  storagePath="productos/imagen.png"
  alt="Producto"
  width={200}
  height={200}
/>
```

---

## 🐛 PROBLEMAS RESUELTOS

### Problema 1: Mock de Jest no funcionaba

**Síntoma:** Tests fallaban con 404 aunque el mock retornaba `[true]`.

**Causa:** El endpoint usa `getStorage()` de `firebase-admin/storage`, pero solo se mockeó `firebase-admin`.

**Solución:** Mockear AMBOS módulos con referencias compartidas al mismo objeto `storageMock`.

### Problema 2: `getSignedUrl()` falla con "Cannot sign data without client_email"

**Síntoma:** Error al generar URLs firmadas usando `applicationDefault()`.

**Causa:** Las URLs firmadas requieren `client_email` que solo viene en el JSON de service account.

**Solución:** Cambiar a URLs públicas con tokens de Firebase Storage usando `getMetadata()` y `setMetadata()`.

### Problema 3: Backend no cargaba código actualizado

**Síntoma:** Endpoint retorna 404 desde el frontend.

**Causa:** Proceso Node.js antiguo corriendo con código desactualizado.

**Solución:**
```bash
# Encontrar y matar el proceso
lsof -i :8080  # Ver PID del proceso
kill <PID>     # Matar el proceso

# Reiniciar backend
cd backend && node index.js
```

### Problema 4: Next.js rechaza imágenes de firebasestorage.googleapis.com

**Síntoma:** Error "hostname not configured under images in next.config.js".

**Solución:** Agregar el hostname a `remotePatterns` en `next.config.ts`.

---

## 📊 RESULTADO FINAL

✅ **Backend:** Endpoint funcionando con URLs públicas + tokens
✅ **Tests:** 80/80 tests pasando
✅ **Frontend:** Hook y componente implementados
✅ **Next.js:** Configuración actualizada
✅ **Producción:** Imágenes cargando correctamente en la app

**URLs generadas:**
```
https://firebasestorage.googleapis.com/v0/b/studio-9824031244-700aa.firebasestorage.app/o/productos%2F1760207646886-Gemini_Generated_Image_ic2eg4ic2eg4ic2e.png?alt=media&token=a6965c09-ac60-4525-9908-e7cc58ad2e90
```
