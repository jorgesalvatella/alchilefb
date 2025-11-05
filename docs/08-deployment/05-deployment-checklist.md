# ✅ Al Chile FB - Deployment Checklist

**Estado**: Listo para ejecutar deployment
**Fecha**: 2025-11-04
**Método**: GitHub Actions + Workload Identity Federation

---

## 📋 Pre-Deployment Checklist

### 1. GCP Project Setup

- [ ] Proyecto GCP creado: `studio-9824031244-700aa`
- [ ] Billing habilitado
- [ ] APIs habilitadas:
  ```bash
  gcloud services enable run.googleapis.com \
    containerregistry.googleapis.com \
    secretmanager.googleapis.com \
    iam.googleapis.com \
    iamcredentials.googleapis.com \
    cloudresourcemanager.googleapis.com
  ```

### 2. Workload Identity Federation Setup

Seguir guía: [04-workload-identity-setup.md](./04-workload-identity-setup.md)

- [ ] Workload Identity Pool creado: `github-actions-pool`
- [ ] Workload Identity Provider creado: `github-actions-provider`
- [ ] Service Account creado: `github-actions-deployer@studio-9824031244-700aa.iam.gserviceaccount.com`
- [ ] Service Account tiene roles:
  - [ ] `roles/run.admin`
  - [ ] `roles/storage.admin`
  - [ ] `roles/iam.serviceAccountUser`
  - [ ] `roles/secretmanager.secretAccessor`
- [ ] Binding configurado entre WIF y Service Account
- [ ] WIF_PROVIDER obtenido y guardado
- [ ] WIF_SERVICE_ACCOUNT obtenido y guardado

### 3. GCP Secret Manager Setup

- [ ] Firebase Admin SDK JSON descargado
- [ ] Secret creado en Secret Manager:
  ```bash
  # Firebase Admin Key
  gcloud secrets create firebase-admin-key \
    --data-file=path/to/firebase-admin-key.json \
    --replication-policy="automatic"
  ```

- [ ] App Engine Default Service Account tiene acceso:
  ```bash
  PROJECT_ID="studio-9824031244-700aa"

  gcloud secrets add-iam-policy-binding firebase-admin-key \
    --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
  ```

### 4. Firebase Configuration

- [ ] Firebase project configurado: `studio-9824031244-700aa`
- [ ] Firebase Admin SDK JSON disponible
- [ ] FCM VAPID key generado
- [ ] Valores obtenidos de Firebase Console:
  - [ ] API Key
  - [ ] Auth Domain
  - [ ] Project ID
  - [ ] Storage Bucket
  - [ ] Messaging Sender ID
  - [ ] App ID

### 5. GitHub Repository Setup

- [ ] Repositorio creado en GitHub
- [ ] Branch `main` creado
- [ ] Código commiteado y pusheado
- [ ] GitHub Secrets configurados (10 secrets):

#### Workload Identity (2 secrets)
```
WIF_PROVIDER=projects/123456789/locations/global/workloadIdentityPools/github-actions-pool/providers/github-actions-provider
WIF_SERVICE_ACCOUNT=github-actions-deployer@studio-9824031244-700aa.iam.gserviceaccount.com
```

#### Firebase Configuration (8 secrets)
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=studio-9824031244-700aa.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=studio-9824031244-700aa
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=studio-9824031244-700aa.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
NEXT_PUBLIC_FCM_VAPID_KEY=BM4dG5W...
```

#### Backend URL (configurar después del primer deploy)
```
BACKEND_URL=https://alchile-backend-xxxxx-uc.a.run.app
```

---

## 🚀 Deployment Steps

### Step 1: Primer Deploy del Backend (Manual)

```bash
# 1. Autenticarse
gcloud auth login
gcloud config set project studio-9824031244-700aa

# 2. Build imagen backend
docker build \
  -t gcr.io/studio-9824031244-700aa/alchile-backend:v1 \
  -f Dockerfile.backend \
  .

# 3. Push a GCR
docker push gcr.io/studio-9824031244-700aa/alchile-backend:v1

# 4. Deploy a Cloud Run
gcloud run deploy alchile-backend \
  --image gcr.io/studio-9824031244-700aa/alchile-backend:v1 \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 60 \
  --set-env-vars "NODE_ENV=production" \
  --service-account "studio-9824031244-700aa@appspot.gserviceaccount.com" \
  --set-secrets "GOOGLE_APPLICATION_CREDENTIALS=firebase-admin-key:latest"

# 5. Obtener URL del backend
gcloud run services describe alchile-backend \
  --region us-central1 \
  --format 'value(status.url)'
```

- [ ] Backend desplegado exitosamente
- [ ] Backend URL obtenida: `https://alchile-backend-xxxxx-uc.a.run.app`
- [ ] Health check funcionando:
  ```bash
  curl https://alchile-backend-xxxxx-uc.a.run.app/health
  curl https://alchile-backend-xxxxx-uc.a.run.app/readiness
  ```

### Step 2: Configurar BACKEND_URL en GitHub Secrets

```bash
# Ve a GitHub → Settings → Secrets → Actions
# Agregar nuevo secret:
Name: BACKEND_URL
Value: https://alchile-backend-xxxxx-uc.a.run.app
```

- [ ] BACKEND_URL agregado a GitHub Secrets

### Step 3: Deploy Frontend (Automático via GitHub Actions)

```bash
# Trigger workflow manualmente o hacer push a main
git add .
git commit -m "Trigger frontend deployment"
git push origin main

# O desde GitHub UI:
# Actions → Deploy Frontend to Cloud Run → Run workflow
```

- [ ] Frontend desplegado exitosamente
- [ ] Frontend URL obtenida: `https://alchile-frontend-xxxxx-uc.a.run.app`
- [ ] Health check funcionando:
  ```bash
  curl https://alchile-frontend-xxxxx-uc.a.run.app/
  ```

### Step 4: Actualizar CORS en Backend

```bash
# Verificar que el backend acepta requests del frontend
# El backend ya tiene configuración dinámica de CORS para *.run.app

# Probar conexión:
curl -H "Origin: https://alchile-frontend-xxxxx-uc.a.run.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  https://alchile-backend-xxxxx-uc.a.run.app/api/health
```

- [ ] CORS configurado correctamente
- [ ] Frontend puede comunicarse con backend

---

## 🧪 Testing Post-Deployment

### Backend Tests

```bash
BACKEND_URL="https://alchile-backend-xxxxx-uc.a.run.app"

# 1. Health check
curl $BACKEND_URL/health
# Expected: {"status":"ok","timestamp":"...","uptime":...}

# 2. Readiness check
curl $BACKEND_URL/readiness
# Expected: {"status":"ready","services":{"firestore":"connected"}}

# 3. API endpoint (example)
curl $BACKEND_URL/api/menu
# Expected: Menu items JSON
```

- [ ] Health check pasa
- [ ] Readiness check pasa
- [ ] API endpoints responden correctamente

### Frontend Tests

```bash
FRONTEND_URL="https://alchile-frontend-xxxxx-uc.a.run.app"

# 1. Homepage
curl -I $FRONTEND_URL
# Expected: 200 OK

# 2. PWA Manifest
curl $FRONTEND_URL/manifest.json
# Expected: PWA manifest JSON

# 3. Service Worker
curl $FRONTEND_URL/sw.js
# Expected: Service Worker code
```

- [ ] Homepage carga
- [ ] PWA manifest disponible
- [ ] Service Worker disponible
- [ ] Iconos PWA disponibles

### PWA Tests (Manual)

- [ ] Abrir en Chrome móvil: `https://alchile-frontend-xxxxx-uc.a.run.app`
- [ ] Verificar que aparece install prompt
- [ ] Instalar PWA
- [ ] Probar funcionalidad offline:
  - [ ] Desactivar WiFi/datos
  - [ ] Navegar en la app
  - [ ] Verificar que muestra contenido cacheado
  - [ ] Verificar que muestra página offline para rutas no cacheadas

### Integration Tests

- [ ] Login de usuario funciona
- [ ] Ver menú funciona
- [ ] Hacer pedido funciona
- [ ] Notificaciones FCM funcionan
- [ ] Firebase Auth funciona
- [ ] Firestore lee/escribe correctamente
- [ ] Storage subida/descarga funciona

---

## 📊 Monitoring Setup

### Cloud Run Metrics

```bash
# Ver servicios
gcloud run services list --region us-central1

# Ver logs backend
gcloud run services logs tail alchile-backend --region us-central1

# Ver logs frontend
gcloud run services logs tail alchile-frontend --region us-central1

# Ver métricas
gcloud run services describe alchile-backend --region us-central1
gcloud run services describe alchile-frontend --region us-central1
```

- [ ] Logs configurados y accesibles
- [ ] Métricas visibles en Cloud Console

### Alerting (Opcional)

```bash
# Configurar alertas en Cloud Monitoring
# - Request latency > 1s
# - Error rate > 5%
# - Instance count > 8
```

- [ ] Alertas configuradas (opcional)

---

## 🔄 CI/CD Verification

### GitHub Actions Workflows

- [ ] `.github/workflows/deploy-backend.yml` configurado
- [ ] `.github/workflows/deploy-frontend.yml` configurado
- [ ] `.github/workflows/test.yml` configurado

### Test Automated Deployment

```bash
# 1. Hacer un cambio menor
echo "// CI/CD test" >> backend/app.js

# 2. Commit y push
git add backend/app.js
git commit -m "Test CI/CD pipeline"
git push origin main

# 3. Verificar en GitHub Actions
# Ve a: https://github.com/YOUR_USER/alchilefb/actions
```

- [ ] Backend workflow ejecuta correctamente
- [ ] Frontend workflow ejecuta correctamente (si hay cambios en frontend)
- [ ] Tests workflow ejecuta correctamente
- [ ] Deployments exitosos

---

## 🎉 Post-Deployment Checklist

### URLs Finales

```
Frontend: https://alchile-frontend-xxxxx-uc.a.run.app
Backend:  https://alchile-backend-xxxxx-uc.a.run.app
```

- [ ] URLs documentadas
- [ ] URLs agregadas a Firebase Auth (Authorized domains)
- [ ] URLs agregadas a Google Maps API (Allowed referrers)

### Documentation

- [ ] README actualizado con URLs de producción
- [ ] AGENTS.md actualizado con status de deployment
- [ ] Credenciales y secrets documentados en lugar seguro

### Team Communication

- [ ] Equipo notificado del deployment
- [ ] URLs compartidas con stakeholders
- [ ] Credenciales de producción compartidas (de forma segura)

---

## 🔒 Security Review

- [ ] Secrets NO están en código
- [ ] Service Accounts tienen permisos mínimos necesarios
- [ ] CORS configurado correctamente
- [ ] HTTPS habilitado (automático en Cloud Run)
- [ ] Firestore Rules revisadas
- [ ] Storage Rules revisadas
- [ ] Rate limiting configurado (si aplica)

---

## 💰 Cost Optimization

### Free Tier Limits

```
Cloud Run Free Tier:
- 2M requests/mes
- 360,000 GB-seconds
- 180,000 vCPU-seconds
```

- [ ] Monitorear uso mensual
- [ ] Configurar budget alerts
- [ ] Revisar min-instances (actualmente 0)

### Recommendations

- [ ] Mantener min-instances en 0 para ahorro
- [ ] Aumentar solo si cold starts son problema
- [ ] Monitorear costos semanalmente

---

## 📞 Support & Troubleshooting

### Common Issues

**1. Permission denied**
```bash
# Verificar roles del Service Account
gcloud projects get-iam-policy studio-9824031244-700aa \
  --flatten="bindings[].members" \
  --filter="bindings.members:github-actions-deployer@*"
```

**2. Secret not found**
```bash
# Listar secrets
gcloud secrets list

# Ver secret
gcloud secrets versions access latest --secret="SECRET_NAME"
```

**3. CORS errors**
```bash
# Verificar CORS en backend
# Ver backend/app.js - corsOptions
```

**4. Service Worker not updating**
```bash
# Clear cache del navegador
# O incrementar versión en sw.js: CACHE_NAME = 'alchile-pwa-v2'
```

### Documentation Links

- [Workload Identity Setup](./04-workload-identity-setup.md)
- [GitHub Actions Setup](./03-github-actions-setup.md)
- [Production Readiness Report](./01-production-readiness-report.md)
- [Main Deployment Guide](./README-DEPLOYMENT.md)

---

## ✅ Final Status

Una vez completado este checklist:

- ✅ Backend desplegado en Cloud Run
- ✅ Frontend desplegado en Cloud Run
- ✅ PWA funcionando profesionalmente
- ✅ CI/CD automatizado con GitHub Actions
- ✅ Workload Identity Federation configurado
- ✅ Monitoring y logs activos
- ✅ Security best practices aplicadas

**Score Final**: 100/100 🎉

---

**Última actualización**: 2025-11-04
**Ejecutado por**: [Tu nombre]
**Status**: Ready for Production ✅
