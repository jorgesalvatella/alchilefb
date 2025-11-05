# 🔐 Setup Workload Identity Federation para GitHub Actions

**Fecha**: 2025-11-04
**Método**: Workload Identity Federation (sin JSON keys)
**Ventaja**: Más seguro, cumple con políticas corporativas de GCP

---

## 📋 ¿Qué es Workload Identity Federation?

Es un método de autenticación que permite a GitHub Actions acceder a GCP **sin necesidad de crear/almacenar JSON keys**.

**Flujo:**
```
GitHub Actions → OIDC Token → Google verifica → Acceso temporal a GCP
```

**Ventajas vs JSON Keys:**
- ✅ No hay secrets que rotar
- ✅ No hay risk de filtración de keys
- ✅ Tokens de corta duración (automáticos)
- ✅ Cumple políticas corporativas estrictas

---

## 🚀 Setup Paso a Paso

### Paso 1: Crear Workload Identity Pool

```bash
# Autenticarse
gcloud auth login

# Configurar proyecto
PROJECT_ID="studio-9824031244-700aa"
gcloud config set project ${PROJECT_ID}

# Crear Workload Identity Pool
gcloud iam workload-identity-pools create "github-actions-pool" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --display-name="GitHub Actions Pool"

# Verificar
gcloud iam workload-identity-pools describe "github-actions-pool" \
    --project="${PROJECT_ID}" \
    --location="global"
```

---

### Paso 2: Crear Workload Identity Provider

```bash
# Configurar variables
PROJECT_ID="studio-9824031244-700aa"
POOL_NAME="github-actions-pool"
PROVIDER_NAME="github-actions-provider"

# Tu usuario/organización de GitHub
GITHUB_REPO="tu-usuario/alchilefb"  # ⚠️ CAMBIAR POR TU REPO

# Crear provider
gcloud iam workload-identity-pools providers create-oidc "${PROVIDER_NAME}" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --workload-identity-pool="${POOL_NAME}" \
    --display-name="GitHub Actions Provider" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
    --issuer-uri="https://token.actions.githubusercontent.com"

# Verificar
gcloud iam workload-identity-pools providers describe "${PROVIDER_NAME}" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --workload-identity-pool="${POOL_NAME}"
```

---

### Paso 3: Crear Service Account

```bash
PROJECT_ID="studio-9824031244-700aa"

# Crear Service Account
gcloud iam service-accounts create github-actions-deployer \
    --display-name="GitHub Actions Deployer" \
    --description="Service Account para GitHub Actions CI/CD"

SA_EMAIL="github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

# Asignar roles necesarios
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor"
```

---

### Paso 4: Conectar Workload Identity con Service Account

```bash
PROJECT_ID="studio-9824031244-700aa"
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")
POOL_NAME="github-actions-pool"
PROVIDER_NAME="github-actions-provider"
SA_EMAIL="github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

# ⚠️ IMPORTANTE: Cambiar por tu repositorio de GitHub
GITHUB_REPO="tu-usuario/alchilefb"

# Dar permisos al Workload Identity para impersonar el Service Account
gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
    --project="${PROJECT_ID}" \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/attribute.repository/${GITHUB_REPO}"
```

---

### Paso 5: Obtener Workload Identity Provider ID

```bash
PROJECT_ID="studio-9824031244-700aa"
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")
POOL_NAME="github-actions-pool"
PROVIDER_NAME="github-actions-provider"

# Construir el Workload Identity Provider ID
GCP_WORKLOAD_IDENTITY_PROVIDER="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/providers/${PROVIDER_NAME}"
GCP_SERVICE_ACCOUNT="github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

echo "================================================================"
echo "📋 GUARDAR ESTOS 3 VALORES PARA GITHUB SECRETS:"
echo "================================================================"
echo ""
echo "GCP_PROJECT_ID:"
echo "${PROJECT_ID}"
echo ""
echo "GCP_WORKLOAD_IDENTITY_PROVIDER:"
echo "${GCP_WORKLOAD_IDENTITY_PROVIDER}"
echo ""
echo "GCP_SERVICE_ACCOUNT:"
echo "${GCP_SERVICE_ACCOUNT}"
echo ""
echo "================================================================"
```

**⚠️ COPIAR ESTOS 3 VALORES** - Los necesitarás para GitHub Secrets en el Paso 6

---

### Paso 6: Configurar Secrets en GitHub

Ve a tu repositorio en GitHub:
1. **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**

**Agregar estos 3 secrets de GCP (SOLO estos en GitHub):**

```
Name: GCP_PROJECT_ID
Value: studio-9824031244-700aa

Name: GCP_WORKLOAD_IDENTITY_PROVIDER
Value: projects/123456789/locations/global/workloadIdentityPools/github-actions-pool/providers/github-actions-provider

Name: GCP_SERVICE_ACCOUNT
Value: github-actions-deployer@studio-9824031244-700aa.iam.gserviceaccount.com
```

**⚠️ IMPORTANTE: Credenciales de Firebase y API Keys**

**NO agregues credenciales de Firebase en GitHub Secrets.** Estas ya están almacenadas de forma segura en **GCP Secret Manager**.

Tu workflow de GitHub Actions:
1. Se autentica con GCP usando Workload Identity (sin credenciales)
2. Accede a Secret Manager para obtener las credenciales de Firebase
3. Las inyecta en el build de forma segura

**Secrets que ya están en GCP Secret Manager (NO agregar en GitHub):**
- `firebase-api-key`
- `firebase-auth-domain`
- `firebase-project-id`
- `firebase-storage-bucket`
- `firebase-messaging-sender-id`
- `firebase-app-id`
- `google-maps-api-key`
- `fcm-vapid-key`
- `backend-url` (después del primer deploy)

---

### Paso 7: Actualizar GitHub Actions Workflow

Tu workflow debe obtener los secrets de Firebase desde GCP Secret Manager. Ejemplo:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      id-token: write  # Necesario para OIDC

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      # Autenticación con Workload Identity
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}

      # Obtener secrets de Secret Manager
      - name: Get Firebase secrets from Secret Manager
        id: secrets
        run: |
          echo "FIREBASE_API_KEY=$(gcloud secrets versions access latest --secret=firebase-api-key)" >> $GITHUB_OUTPUT
          echo "FIREBASE_AUTH_DOMAIN=$(gcloud secrets versions access latest --secret=firebase-auth-domain)" >> $GITHUB_OUTPUT
          echo "FIREBASE_PROJECT_ID=$(gcloud secrets versions access latest --secret=firebase-project-id)" >> $GITHUB_OUTPUT
          echo "FIREBASE_STORAGE_BUCKET=$(gcloud secrets versions access latest --secret=firebase-storage-bucket)" >> $GITHUB_OUTPUT
          echo "FIREBASE_MESSAGING_SENDER_ID=$(gcloud secrets versions access latest --secret=firebase-messaging-sender-id)" >> $GITHUB_OUTPUT
          echo "FIREBASE_APP_ID=$(gcloud secrets versions access latest --secret=firebase-app-id)" >> $GITHUB_OUTPUT
          echo "GOOGLE_MAPS_API_KEY=$(gcloud secrets versions access latest --secret=google-maps-api-key)" >> $GITHUB_OUTPUT
          echo "FCM_VAPID_KEY=$(gcloud secrets versions access latest --secret=fcm-vapid-key)" >> $GITHUB_OUTPUT

      # Build y Deploy (usando los secrets obtenidos)
      - name: Build and Deploy
        run: |
          # Los secrets están disponibles como ${{ steps.secrets.outputs.FIREBASE_API_KEY }}
          # etc...
```

**Ventajas de este enfoque:**
- ✅ Cero credenciales en GitHub
- ✅ Rotación centralizada en GCP
- ✅ Auditoría completa en GCP Secret Manager
- ✅ Una sola fuente de verdad para secrets

---

## ✅ Verificación

### Probar que funciona:

```bash
# 1. Hacer un cambio pequeño
echo "// Test WIF" >> backend/app.js

# 2. Commit y push
git add backend/app.js
git commit -m "Test Workload Identity Federation"
git push origin main

# 3. Ver en GitHub Actions
# Ve a: https://github.com/tu-usuario/tu-repo/actions
# Debería ejecutarse sin errores de autenticación
```

---

## 🔧 Troubleshooting

### Error: "Permission denied"

**Solución:**
```bash
# Verificar que el Service Account tiene los roles
gcloud projects get-iam-policy studio-9824031244-700aa \
    --flatten="bindings[].members" \
    --filter="bindings.members:github-actions-deployer@*"

# Debería mostrar: run.admin, storage.admin, iam.serviceAccountUser, secretmanager.secretAccessor
```

### Error: "Failed to generate Google Cloud federated token"

**Solución:**
- Verificar que `WIF_PROVIDER` está correcto
- Verificar que `WIF_SERVICE_ACCOUNT` está correcto
- Verificar que el repositorio de GitHub coincide con el configurado en el binding

### Error: "Repository not allowed"

**Solución:**
```bash
# El repositorio debe coincidir EXACTAMENTE
# Ejemplo: "usuario/repo" (sin https://, sin .git)

# Verificar binding actual
gcloud iam service-accounts get-iam-policy \
    github-actions-deployer@studio-9824031244-700aa.iam.gserviceaccount.com
```

---

## 📊 Comparación: JSON Key vs Workload Identity

| Aspecto | JSON Key | Workload Identity |
|---------|----------|-------------------|
| **Seguridad** | 🟡 Media (key puede filtrarse) | ✅ Alta (sin keys) |
| **Rotación** | ⚠️ Manual (cada 90 días) | ✅ Automática |
| **Políticas Corp** | ❌ Puede violar políticas | ✅ Cumple políticas |
| **Setup** | 🟢 Simple (5 min) | 🟡 Moderado (15 min) |
| **Mantenimiento** | ⚠️ Requiere rotación | ✅ Cero mantenimiento |
| **Recomendado por Google** | ❌ No | ✅ Sí |

---

## ✅ Checklist Final

- [ ] Workload Identity Pool creado
- [ ] Workload Identity Provider creado (OIDC)
- [ ] Service Account creado
- [ ] Service Account tiene 4 roles (run.admin, storage.admin, iam.serviceAccountUser, secretmanager.secretAccessor)
- [ ] Binding entre WIF y SA configurado
- [ ] Secrets configurados en GitHub (SOLO 3: GCP_PROJECT_ID, GCP_WORKLOAD_IDENTITY_PROVIDER, GCP_SERVICE_ACCOUNT)
- [ ] Credenciales de Firebase verificadas en GCP Secret Manager (NO en GitHub)
- [ ] Test push ejecuta workflow correctamente

---

## 🎉 ¡Listo!

Ahora GitHub Actions se autentica con GCP usando **Workload Identity Federation** sin necesidad de JSON keys.

**Próximo paso:**
- Primer deploy manual del backend
- Obtener BACKEND_URL
- Configurar secret en GitHub
- Deploy automático funcionando

---

**Última actualización**: 2025-11-04
**Método**: Workload Identity Federation (Recommended)
