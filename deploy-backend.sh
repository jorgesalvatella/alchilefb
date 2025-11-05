#!/bin/bash

# ================================
# Script de Deploy - Backend
# Cloud Run Service: alchile-backend
# ================================

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}🚀 Al Chile FB - Backend Deploy Script${NC}"
echo -e "${GREEN}================================================${NC}\n"

# ================================
# Configuración
# ================================

# Variables requeridas (configurar antes de ejecutar)
PROJECT_ID="${PROJECT_ID:-studio-9824031244-700aa}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="alchile-backend"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo -e "${YELLOW}📋 Configuración:${NC}"
echo "   Project ID: ${PROJECT_ID}"
echo "   Region: ${REGION}"
echo "   Service: ${SERVICE_NAME}"
echo "   Image: ${IMAGE_NAME}"
echo ""

# ================================
# 1. Verificar gcloud CLI
# ================================

echo -e "${YELLOW}🔍 Verificando gcloud CLI...${NC}"
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Error: gcloud CLI no está instalado${NC}"
    echo "   Instala desde: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo -e "${GREEN}✅ gcloud CLI instalado${NC}\n"

# ================================
# 2. Verificar autenticación
# ================================

echo -e "${YELLOW}🔐 Verificando autenticación...${NC}"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo -e "${RED}❌ No estás autenticado en gcloud${NC}"
    echo "   Ejecuta: gcloud auth login"
    exit 1
fi

echo -e "${GREEN}✅ Autenticado correctamente${NC}\n"

# ================================
# 3. Configurar proyecto
# ================================

echo -e "${YELLOW}📦 Configurando proyecto...${NC}"
gcloud config set project ${PROJECT_ID}
echo -e "${GREEN}✅ Proyecto configurado${NC}\n"

# ================================
# 4. Habilitar APIs necesarias
# ================================

echo -e "${YELLOW}🔧 Habilitando APIs de GCP...${NC}"
gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    containerregistry.googleapis.com \
    secretmanager.googleapis.com

echo -e "${GREEN}✅ APIs habilitadas${NC}\n"

# ================================
# 5. Build de la imagen Docker
# ================================

echo -e "${YELLOW}🐳 Construyendo imagen Docker...${NC}"
echo "   Esto puede tomar 2-5 minutos..."

gcloud builds submit \
    --tag ${IMAGE_NAME}:latest \
    --file Dockerfile.backend \
    --ignore-file .dockerignore.backend \
    .

echo -e "${GREEN}✅ Imagen construida exitosamente${NC}\n"

# ================================
# 6. Deploy a Cloud Run
# ================================

echo -e "${YELLOW}🚀 Desplegando a Cloud Run...${NC}"

gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME}:latest \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --timeout 60 \
    --set-env-vars "NODE_ENV=production" \
    --service-account "${PROJECT_ID}@appspot.gserviceaccount.com" \
    --set-secrets "GOOGLE_APPLICATION_CREDENTIALS=firebase-admin-key:latest,TWILIO_ACCOUNT_SID=twilio-account-sid:latest,TWILIO_AUTH_TOKEN=twilio-auth-token:latest,TWILIO_WHATSAPP_NUMBER=twilio-whatsapp-number:latest"

echo -e "${GREEN}✅ Deploy completado${NC}\n"

# ================================
# 7. Obtener URL del servicio
# ================================

BACKEND_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --region ${REGION} \
    --format 'value(status.url)')

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Backend desplegado exitosamente!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "${YELLOW}🌐 URL del backend:${NC}"
echo "   ${BACKEND_URL}"
echo ""
echo -e "${YELLOW}📝 Siguiente paso:${NC}"
echo "   1. Copia la URL del backend"
echo "   2. Configura BACKEND_URL en el deploy del frontend"
echo "   3. Ejecuta: ./deploy-frontend.sh"
echo ""
echo -e "${YELLOW}🧪 Test de health check:${NC}"
echo "   curl ${BACKEND_URL}/health"
echo ""
