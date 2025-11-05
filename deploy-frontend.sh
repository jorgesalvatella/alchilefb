#!/bin/bash

# ================================
# Script de Deploy - Frontend
# Cloud Run Service: alchile-frontend
# ================================

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}🎨 Al Chile FB - Frontend Deploy Script${NC}"
echo -e "${GREEN}================================================${NC}\n"

# ================================
# Configuración
# ================================

# Variables requeridas
PROJECT_ID="${PROJECT_ID:-studio-9824031244-700aa}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="alchile-frontend"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# IMPORTANTE: Configurar la URL del backend desplegado
BACKEND_URL="${BACKEND_URL}"

if [ -z "$BACKEND_URL" ]; then
    echo -e "${RED}❌ Error: BACKEND_URL no está configurada${NC}"
    echo ""
    echo "   Configura la variable antes de ejecutar:"
    echo "   export BACKEND_URL=https://alchile-backend-xxxxx.run.app"
    echo ""
    exit 1
fi

echo -e "${YELLOW}📋 Configuración:${NC}"
echo "   Project ID: ${PROJECT_ID}"
echo "   Region: ${REGION}"
echo "   Service: ${SERVICE_NAME}"
echo "   Image: ${IMAGE_NAME}"
echo "   Backend URL: ${BACKEND_URL}"
echo ""

# ================================
# 1. Verificar gcloud CLI
# ================================

echo -e "${YELLOW}🔍 Verificando gcloud CLI...${NC}"
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Error: gcloud CLI no está instalado${NC}"
    exit 1
fi

echo -e "${GREEN}✅ gcloud CLI instalado${NC}\n"

# ================================
# 2. Configurar proyecto
# ================================

echo -e "${YELLOW}📦 Configurando proyecto...${NC}"
gcloud config set project ${PROJECT_ID}
echo -e "${GREEN}✅ Proyecto configurado${NC}\n"

# ================================
# 3. Build de la imagen Docker
# ================================

echo -e "${YELLOW}🐳 Construyendo imagen Docker...${NC}"
echo "   Esto puede tomar 3-8 minutos..."

gcloud builds submit \
    --tag ${IMAGE_NAME}:latest \
    --file Dockerfile.frontend \
    --ignore-file .dockerignore.frontend \
    --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="${NEXT_PUBLIC_FIREBASE_API_KEY}" \
    --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}" \
    --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="${NEXT_PUBLIC_FIREBASE_PROJECT_ID}" \
    --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}" \
    --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}" \
    --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="${NEXT_PUBLIC_FIREBASE_APP_ID}" \
    --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}" \
    --build-arg NEXT_PUBLIC_FCM_VAPID_KEY="${NEXT_PUBLIC_FCM_VAPID_KEY}" \
    .

echo -e "${GREEN}✅ Imagen construida exitosamente${NC}\n"

# ================================
# 4. Deploy a Cloud Run
# ================================

echo -e "${YELLOW}🚀 Desplegando a Cloud Run...${NC}"

gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME}:latest \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --port 8080 \
    --memory 1Gi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 20 \
    --timeout 60 \
    --set-env-vars "NODE_ENV=production,BACKEND_URL=${BACKEND_URL}"

echo -e "${GREEN}✅ Deploy completado${NC}\n"

# ================================
# 5. Obtener URL del servicio
# ================================

FRONTEND_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --region ${REGION} \
    --format 'value(status.url)')

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Frontend desplegado exitosamente!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "${YELLOW}🌐 URL de la aplicación:${NC}"
echo "   ${FRONTEND_URL}"
echo ""
echo -e "${YELLOW}📝 Configuración del backend:${NC}"
echo "   Actualiza CORS en backend para permitir:"
echo "   export FRONTEND_URL=${FRONTEND_URL}"
echo "   Re-deploy del backend si es necesario"
echo ""
echo -e "${YELLOW}🎉 La aplicación está lista!${NC}"
echo "   Abre: ${FRONTEND_URL}"
echo ""
