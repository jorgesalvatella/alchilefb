# ⚙️ GitHub Actions - Referencia Técnica

**Fecha**: 2025-11-04
**Método de Autenticación**: Workload Identity Federation (WIF)
**Agente**: Aire (DevOps)

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Prerequisitos](#prerequisitos)
3. [Arquitectura de Workflows](#arquitectura-de-workflows)
4. [Configuración de Secrets](#configuración-de-secrets)
5. [Secret Manager en GCP](#secret-manager-en-gcp)
6. [Workflows Disponibles](#workflows-disponibles)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Visión General

Este documento es una **referencia técnica** de los workflows de GitHub Actions configurados en el proyecto.

> ⚠️ **IMPORTANTE**: Este NO es un tutorial paso a paso. Para deployment, sigue:
> 1. [04-workload-identity-setup.md](./04-workload-identity-setup.md) - Setup WIF
> 2. [05-deployment-checklist.md](./05-deployment-checklist.md) - Deployment completo

### Autenticación

Este proyecto usa **Workload Identity Federation (WIF)** para autenticación con GCP:

```yaml
- name: 🔐 Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
    service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}
```

**Ventajas de WIF:**
- ✅ No requiere JSON keys
- ✅ Tokens de corta duración (automáticos)
- ✅ Rotación automática
- ✅ Cumple políticas de seguridad corporativas
- ✅ Recomendado por Google

---

## ✅ Prerequisitos

Para que los workflows funcionen, debes tener:

1. **Workload Identity Federation configurado** (ver [04-workload-identity-setup.md](./04-workload-identity-setup.md))
   - Workload Identity Pool creado
   - Workload Identity Provider configurado
   - Service Account con permisos
   - Binding entre WIF y SA

2. **GitHub Secrets configurados** (10 total)
   - 2 secrets de WIF
   - 8 secrets de Firebase
   - 1 secret de BACKEND_URL (después del primer deploy)

3. **GCP Secret Manager configurado** (1 secret)
   - firebase-admin-key

---

## 🏗️ Arquitectura de Workflows

```
┌─────────────────────────────────────────────────────────┐
│                  GitHub Repository                      │
│                                                          │
│  .github/workflows/                                     │
│    ├── deploy-backend.yml   (Backend deployment)       │
│    ├── deploy-frontend.yml  (Frontend deployment)      │
│    └── test.yml             (Tests - opcional)         │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Push to main
                     │ (path filters activos)
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              GitHub Actions Runner                      │
│                                                          │
│  1. Checkout code                                       │
│  2. Authenticate with WIF (OIDC token)                  │
│  3. Setup gcloud CLI                                    │
│  4. Build Docker image                                  │
│  5. Push to GCR                                         │
│  6. Deploy to Cloud Run                                 │
│  7. Health check                                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Workload Identity Federation
                     │ (sin JSON keys)
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Google Cloud Platform                      │
│                                                          │
│  ├── Container Registry (GCR)                           │
│  ├── Cloud Run (Backend + Frontend)                     │
│  ├── Secret Manager                                     │
│  └── Workload Identity Pool                             │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Configuración de Secrets

### GitHub Secrets (10 requeridos)

#### 1. Workload Identity (2 secrets)

Obtenidos siguiendo [04-workload-identity-setup.md](./04-workload-identity-setup.md):

| Secret Name | Descripción | Ejemplo |
|-------------|-------------|---------|
| `WIF_PROVIDER` | Workload Identity Provider ID completo | `projects/123456789/locations/global/workloadIdentityPools/github-actions-pool/providers/github-actions-provider` |
| `WIF_SERVICE_ACCOUNT` | Service Account email | `github-actions-deployer@studio-9824031244-700aa.iam.gserviceaccount.com` |

**Cómo obtenerlos:**
```bash
PROJECT_ID="studio-9824031244-700aa"
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")

# WIF_PROVIDER
echo "projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-actions-pool/providers/github-actions-provider"

# WIF_SERVICE_ACCOUNT
echo "github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com"
```

#### 2. Firebase Configuration (8 secrets)

Variables públicas de Firebase (obtenidas de Firebase Console):

| Secret Name | Descripción | Dónde encontrarlo |
|-------------|-------------|-------------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | API Key pública de Firebase | Firebase Console → Settings → General |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth Domain | Firebase Console → Settings → General |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Project ID | Firebase Console → Settings → General |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage Bucket | Firebase Console → Settings → General |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM Sender ID | Firebase Console → Settings → General |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | App ID | Firebase Console → Settings → General |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API Key | GCP Console → APIs & Services → Credentials |
| `NEXT_PUBLIC_FCM_VAPID_KEY` | FCM VAPID Key | Firebase Console → Cloud Messaging → Web Push |

#### 3. Backend URL (1 secret - después del primer deploy)

| Secret Name | Descripción | Cuándo configurarlo |
|-------------|-------------|---------------------|
| `BACKEND_URL` | URL del backend en Cloud Run | Después del primer deploy manual del backend |

**Cómo obtenerlo:**
```bash
gcloud run services describe alchile-backend \
  --region us-central1 \
  --format 'value(status.url)'
```

### Agregar Secrets en GitHub

1. Ve a tu repositorio en GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Agregar cada secret con su Name y Value exactos

---

## 🔒 Secret Manager en GCP

Secrets privados del backend (NO van en GitHub):

### Firebase Admin SDK

```bash
# Descargar JSON desde Firebase Console:
# Settings → Service Accounts → Generate new private key

# Subir a Secret Manager
gcloud secrets create firebase-admin-key \
    --data-file=./firebase-admin-key.json \
    --replication-policy="automatic"

# Dar permisos al App Engine service account
gcloud secrets add-iam-policy-binding firebase-admin-key \
    --member="serviceAccount:studio-9824031244-700aa@appspot.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### Verificar Secret

```bash
# Listar el secret
gcloud secrets list

# Deberías ver:
# NAME                      CREATED              REPLICATION_POLICY  LOCATIONS
# firebase-admin-key        2025-11-04T...       automatic           -
```

---

## ⚡ Workflows Disponibles

### 1. Deploy Backend (deploy-backend.yml)

**Trigger:**
- Push a `main` con cambios en:
  - `backend/**`
  - `Dockerfile.backend`
  - `.dockerignore.backend`
  - `.github/workflows/deploy-backend.yml`
- Ejecución manual desde GitHub UI

**Pasos:**
1. Checkout code
2. Authenticate con WIF
3. Setup gcloud CLI
4. Configure Docker para GCR
5. Build Docker image
6. Push a GCR
7. Deploy a Cloud Run con:
   - Memory: 512Mi
   - CPU: 1
   - Min instances: 0
   - Max instances: 10
   - Secrets desde Secret Manager
8. Health check en `/health`

**Variables de entorno en runtime:**
```yaml
NODE_ENV=production
```

**Secrets montados (desde Secret Manager):**
```yaml
GOOGLE_APPLICATION_CREDENTIALS=firebase-admin-key:latest
```

**Service Account usado en Cloud Run:**
```yaml
--service-account "studio-9824031244-700aa@appspot.gserviceaccount.com"
```

---

### 2. Deploy Frontend (deploy-frontend.yml)

**Trigger:**
- Push a `main` con cambios en:
  - `src/**`
  - `public/**`
  - `next.config.ts`
  - `package.json`
  - `Dockerfile.frontend`
  - `.dockerignore.frontend`
  - `.github/workflows/deploy-frontend.yml`
- Ejecución manual desde GitHub UI

**Pasos:**
1. Checkout code
2. Authenticate con WIF
3. Setup gcloud CLI
4. Configure Docker para GCR
5. Build Docker image con 8 build args (Firebase config)
6. Push a GCR
7. Deploy a Cloud Run con:
   - Memory: 1Gi
   - CPU: 1
   - Min instances: 0
   - Max instances: 20
8. Health check en `/`

**Build Args (Firebase config):**
```yaml
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
NEXT_PUBLIC_FCM_VAPID_KEY
```

**Variables de entorno en runtime:**
```yaml
NODE_ENV=production
BACKEND_URL=${{ secrets.BACKEND_URL }}
```

---

### 3. Tests (test.yml) - Opcional

**Trigger:**
- Push a `main` o `develop`
- Pull Requests

**Pasos:**
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Run linting
5. Run tests
6. Upload coverage

---

## 🔄 Flujo de Deployment Automático

### Ejemplo: Cambiar Backend

```bash
# 1. Hacer cambios
vim backend/app.js

# 2. Commit y push
git add backend/app.js
git commit -m "Add new API endpoint"
git push origin main

# 3. GitHub Actions automáticamente:
#    ✓ Detecta cambios en backend/
#    ✓ Ejecuta deploy-backend.yml
#    ✓ Build Docker image
#    ✓ Push a GCR
#    ✓ Deploy a Cloud Run
#    ✓ Health check

# 4. Ver progreso
# GitHub → Actions → Deploy Backend to Cloud Run
```

### Ejemplo: Cambiar Frontend

```bash
# 1. Hacer cambios
vim src/app/menu/page.tsx

# 2. Commit y push
git add src/app/menu/page.tsx
git commit -m "Update menu UI"
git push origin main

# 3. GitHub Actions automáticamente:
#    ✓ Detecta cambios en src/
#    ✓ Ejecuta deploy-frontend.yml
#    ✓ Build Docker image con Firebase vars
#    ✓ Push a GCR
#    ✓ Deploy a Cloud Run
#    ✓ Health check

# 4. Ver progreso
# GitHub → Actions → Deploy Frontend to Cloud Run
```

---

## 🔍 Monitoring

### Ver Logs de Workflows

```bash
# En GitHub UI:
# Repository → Actions → Select workflow run → View logs

# Secciones del log:
# - Checkout code
# - Authenticate to Google Cloud
# - Build Docker Image
# - Push Docker Image to GCR
# - Deploy to Cloud Run
# - Get URL
# - Health Check
```

### Ver Logs de Cloud Run

```bash
# Backend
gcloud run services logs tail alchile-backend --region us-central1

# Frontend
gcloud run services logs tail alchile-frontend --region us-central1

# Últimos 100 logs
gcloud run services logs read alchile-backend --region us-central1 --limit 100
```

### Health Checks

```bash
# Backend
BACKEND_URL=$(gcloud run services describe alchile-backend --region us-central1 --format 'value(status.url)')

curl $BACKEND_URL/health
# Expected: {"status":"ok","timestamp":"...","uptime":123,"environment":"production","version":"1.0.0"}

curl $BACKEND_URL/readiness
# Expected: {"status":"ready","services":{"firestore":"connected"}}

# Frontend
FRONTEND_URL=$(gcloud run services describe alchile-frontend --region us-central1 --format 'value(status.url)')

curl -I $FRONTEND_URL
# Expected: HTTP/2 200
```

---

## 🛠️ Troubleshooting

### Error: "Failed to generate Google Cloud federated token"

**Causa:** WIF_PROVIDER o WIF_SERVICE_ACCOUNT incorrectos

**Solución:**
```bash
# Verificar WIF_PROVIDER
PROJECT_ID="studio-9824031244-700aa"
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")

echo "WIF_PROVIDER debe ser:"
echo "projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-actions-pool/providers/github-actions-provider"

# Verificar WIF_SERVICE_ACCOUNT
echo "WIF_SERVICE_ACCOUNT debe ser:"
echo "github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

# Actualizar secrets en GitHub si están incorrectos
```

### Error: "Permission denied"

**Causa:** Service Account no tiene permisos suficientes

**Solución:**
```bash
# Verificar roles del Service Account
gcloud projects get-iam-policy studio-9824031244-700aa \
    --flatten="bindings[].members" \
    --filter="bindings.members:github-actions-deployer@*"

# Debe tener:
# - roles/run.admin
# - roles/storage.admin
# - roles/iam.serviceAccountUser
# - roles/secretmanager.secretAccessor

# Si falta algún rol, agregarlo:
PROJECT_ID="studio-9824031244-700aa"
SA_EMAIL="github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/run.admin"
```

### Error: "Secret not found"

**Causa:** Secret no existe en Secret Manager o no tiene permisos

**Solución:**
```bash
# Listar secrets
gcloud secrets list

# Si falta firebase-admin-key
gcloud secrets create firebase-admin-key \
    --data-file=./firebase-admin-key.json \
    --replication-policy="automatic"

# Verificar permisos
gcloud secrets get-iam-policy firebase-admin-key

# Agregar permisos si faltan
gcloud secrets add-iam-policy-binding firebase-admin-key \
    --member="serviceAccount:studio-9824031244-700aa@appspot.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### Error: "Repository not allowed"

**Causa:** El repositorio en el binding no coincide con el actual

**Solución:**
```bash
# Verificar binding actual
PROJECT_ID="studio-9824031244-700aa"
SA_EMAIL="github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts get-iam-policy "${SA_EMAIL}"

# Debe mostrar principalSet con tu repositorio:
# principalSet://iam.googleapis.com/projects/123456789/locations/global/workloadIdentityPools/github-actions-pool/attribute.repository/tu-usuario/alchilefb

# Si es incorrecto, recrear binding (ver 04-workload-identity-setup.md)
```

### Workflow No se Ejecuta

**Causa:** Path filters no coinciden o workflow file mal ubicado

**Solución:**
```bash
# Verificar ubicación de workflows
ls -la .github/workflows/

# Debe mostrar:
# deploy-backend.yml
# deploy-frontend.yml
# test.yml (opcional)

# Verificar sintaxis YAML
# Usar: https://www.yamllint.com/

# Forzar ejecución manual:
# GitHub → Actions → Select workflow → Run workflow
```

### Build Fails con Firebase Vars

**Causa:** Secrets de Firebase faltantes o incorrectos en GitHub

**Solución:**
```bash
# Verificar que TODOS los 8 secrets de Firebase estén configurados:
# - NEXT_PUBLIC_FIREBASE_API_KEY
# - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
# - NEXT_PUBLIC_FIREBASE_PROJECT_ID
# - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
# - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
# - NEXT_PUBLIC_FIREBASE_APP_ID
# - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
# - NEXT_PUBLIC_FCM_VAPID_KEY

# GitHub → Settings → Secrets and variables → Actions
# Verificar que TODOS estén presentes
```

---

## 📊 Performance

### Tiempos de Ejecución

| Workflow | Tiempo Promedio |
|----------|-----------------|
| Backend Deploy | 4-6 minutos |
| Frontend Deploy | 6-8 minutos |
| Tests | 2-3 minutos |

### Optimizaciones Aplicadas

- ✅ Path filters: Solo deploya lo que cambió
- ✅ Docker layer caching: Reutiliza layers sin cambios
- ✅ Multi-stage builds: Reduce tamaño de imágenes
- ✅ Alpine base images: Imágenes más ligeras
- ✅ Parallel steps: Cuando es posible

---

## ✅ Checklist de Verificación

Antes de usar los workflows, asegúrate de tener:

- [ ] Workload Identity Federation configurado
- [ ] WIF_PROVIDER en GitHub Secrets
- [ ] WIF_SERVICE_ACCOUNT en GitHub Secrets
- [ ] 8 secrets de Firebase en GitHub
- [ ] BACKEND_URL en GitHub Secrets (después del primer deploy)
- [ ] 1 secret en GCP Secret Manager (firebase-admin-key)
- [ ] Service Account con 4 roles
- [ ] Workflows commiteados en `.github/workflows/`
- [ ] APIs habilitadas en GCP (run, containerregistry, secretmanager)

---

## 🎉 Referencias

**Documentación relacionada:**
- [04-workload-identity-setup.md](./04-workload-identity-setup.md) - Setup WIF paso a paso
- [05-deployment-checklist.md](./05-deployment-checklist.md) - Checklist completo de deployment
- [README-DEPLOYMENT.md](./README-DEPLOYMENT.md) - Overview ejecutivo

**Enlaces externos:**
- [GitHub Actions - google-github-actions/auth](https://github.com/google-github-actions/auth)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)

---

**Última actualización**: 2025-11-04
**Método de autenticación**: Workload Identity Federation ONLY
**Mantenido por**: Equipo Al Chile FB
