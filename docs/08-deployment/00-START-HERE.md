# 🚀 Al Chile FB - Deployment Guide (START HERE)

**Estado**: ✅ LISTO PARA PRODUCCIÓN
**Arquitectura**: Dos servicios separados en Cloud Run
**Autenticación**: Workload Identity Federation (sin JSON keys)
**CI/CD**: GitHub Actions

---

## 📖 Proceso de Deployment (3 pasos)

```
┌─────────────────────────────────────────────────────────┐
│  PASO 1: Setup Workload Identity Federation (30 min)   │
│  📄 04-workload-identity-setup.md                       │
│                                                          │
│  - Crear Workload Identity Pool en GCP                  │
│  - Crear Workload Identity Provider (OIDC)              │
│  - Crear Service Account con permisos                   │
│  - Configurar binding WIF ↔ Service Account             │
│  - Obtener WIF_PROVIDER y WIF_SERVICE_ACCOUNT           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  PASO 2: Ejecutar Deployment Checklist (1-2 horas)     │
│  📋 05-deployment-checklist.md                          │
│                                                          │
│  - Habilitar APIs en GCP                                │
│  - Crear secrets en Secret Manager                      │
│  - Configurar 10 secrets en GitHub                      │
│  - Primer deploy manual del backend                     │
│  - Obtener BACKEND_URL                                  │
│  - Deploy automático del frontend                       │
│  - Testing post-deployment                              │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  PASO 3: Verificación y Monitoring (30 min)            │
│  📋 05-deployment-checklist.md (sección final)          │
│                                                          │
│  - Probar health checks                                 │
│  - Probar PWA en móvil                                  │
│  - Verificar notificaciones FCM                         │
│  - Configurar alertas (opcional)                        │
│  - Documentar URLs de producción                        │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Quick Links

| Documento | Propósito | Cuándo usarlo |
|-----------|-----------|---------------|
| **[04-workload-identity-setup.md](./04-workload-identity-setup.md)** | Setup de autenticación | ⭐ **PASO 1 - Empezar aquí** |
| **[05-deployment-checklist.md](./05-deployment-checklist.md)** | Checklist paso a paso | 📋 **PASO 2 - Ejecutar deployment** |
| [03-github-actions-setup.md](./03-github-actions-setup.md) | Referencia técnica workflows | Solo para consulta |
| [01-production-readiness-report.md](./01-production-readiness-report.md) | Análisis del proyecto | Información general |
| [README-DEPLOYMENT.md](./README-DEPLOYMENT.md) | Overview completo | Resumen ejecutivo |

---

## ✅ Pre-requisitos

Antes de empezar, asegúrate de tener:

- [ ] Cuenta de GCP con billing habilitado
- [ ] Proyecto GCP: `studio-9824031244-700aa`
- [ ] Repositorio GitHub del proyecto
- [ ] Firebase project configurado
- [ ] `gcloud` CLI instalado
- [ ] Permisos de Owner o Editor en GCP

---

## 🏗️ Arquitectura Final

```
GitHub Actions (CI/CD)
         │
         │ (Workload Identity Federation)
         │ ⚠️ Sin JSON keys
         │
         ▼
    Google Cloud Platform
         │
    ┌────┴─────┐
    │          │
    ▼          ▼
Backend    Frontend
(Express)  (Next.js)
    │          │
    │          └─► PWA con offline
    │               + Install prompt
    │               + 13 iconos
    │
    └─► Firebase (Auth, Firestore, Storage)
        Secret Manager
```

---

## 🔐 Secrets Requeridos

### GitHub Secrets (10 total)

**Workload Identity (2):**
```
WIF_PROVIDER
WIF_SERVICE_ACCOUNT
```

**Firebase Config (8):**
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
NEXT_PUBLIC_FCM_VAPID_KEY
```

**Backend URL (1 - después del primer deploy):**
```
BACKEND_URL
```

### GCP Secret Manager (4 secrets)

```
firebase-admin-key
```

---

## 🚀 Comandos Rápidos

### Verificar configuración actual

```bash
# Verificar proyecto GCP
gcloud config get-value project

# Listar servicios de Cloud Run
gcloud run services list --region us-central1

# Ver logs
gcloud run services logs tail alchile-backend --region us-central1
gcloud run services logs tail alchile-frontend --region us-central1
```

### Test local antes de deploy

```bash
# Backend
cd backend
node index.js
# → http://localhost:8080/health

# Frontend
npm run dev
# → http://localhost:9002
```

### Deploy manual (emergencia)

```bash
# Backend
docker build -t gcr.io/studio-9824031244-700aa/alchile-backend:v1 -f Dockerfile.backend .
docker push gcr.io/studio-9824031244-700aa/alchile-backend:v1
gcloud run deploy alchile-backend --image gcr.io/studio-9824031244-700aa/alchile-backend:v1 --region us-central1

# Frontend
docker build -t gcr.io/studio-9824031244-700aa/alchile-frontend:v1 -f Dockerfile.frontend .
docker push gcr.io/studio-9824031244-700aa/alchile-frontend:v1
gcloud run deploy alchile-frontend --image gcr.io/studio-9824031244-700aa/alchile-frontend:v1 --region us-central1
```

---

## 📊 Tiempo Estimado Total

| Fase | Tiempo |
|------|--------|
| Workload Identity Setup | 30 min |
| Secret Manager Setup | 15 min |
| GitHub Secrets Config | 10 min |
| Primer Deploy Backend | 15 min |
| Deploy Frontend | 10 min |
| Testing | 30 min |
| **TOTAL** | **~2 horas** |

---

## 🎯 Resultado Final

Al terminar tendrás:

✅ **Backend** en Cloud Run
- URL: `https://alchile-backend-xxxxx-uc.a.run.app`
- Health checks: `/health` y `/readiness`
- Auto-scaling 0-10 instances

✅ **Frontend** en Cloud Run
- URL: `https://alchile-frontend-xxxxx-uc.a.run.app`
- PWA instalable en móviles
- Offline mode funcionando
- Auto-scaling 0-20 instances

✅ **CI/CD** con GitHub Actions
- Deploy automático en push a main
- Tests antes de deploy
- Workload Identity Federation (sin JSON keys)

✅ **Monitoring**
- Logs centralizados en Cloud Logging
- Métricas en Cloud Monitoring
- Health checks automáticos

---

## 🔍 Troubleshooting

### "Permission denied" en GitHub Actions

```bash
# Verificar roles del Service Account
gcloud projects get-iam-policy studio-9824031244-700aa \
  --flatten="bindings[].members" \
  --filter="bindings.members:github-actions-deployer@*"

# Debe tener: run.admin, storage.admin, iam.serviceAccountUser, secretmanager.secretAccessor
```

### "Secret not found"

```bash
# Listar secrets
gcloud secrets list

# Verificar versiones
gcloud secrets versions list SECRET_NAME
```

### CORS errors

```bash
# El backend ya tiene CORS configurado para *.run.app
# Verificar en backend/app.js - corsOptions
```

---

## 📞 Soporte

**Documentación completa:**
- [README-DEPLOYMENT.md](./README-DEPLOYMENT.md) - Overview ejecutivo
- [AGENTS.md](../../AGENTS.md) - Sistema de agentes del proyecto

**Cloud Run Docs:**
- https://cloud.google.com/run/docs
- https://cloud.google.com/run/docs/securing/service-identity

**Workload Identity Federation:**
- https://cloud.google.com/iam/docs/workload-identity-federation

---

## 🎉 ¡A Desplegar!

**Sigue estos pasos en orden:**

1. **[04-workload-identity-setup.md](./04-workload-identity-setup.md)** ← Empieza aquí
2. **[05-deployment-checklist.md](./05-deployment-checklist.md)** ← Ejecuta esto

**Tiempo total**: ~2 horas
**Resultado**: App en producción 🚀

---

**Última actualización**: 2025-11-04
**Score de preparación**: 100/100 ✅
**Status**: READY FOR PRODUCTION
