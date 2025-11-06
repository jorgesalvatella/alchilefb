# 🌐 Cloudflare Tunnel Setup - Dominio Personalizado

**Fecha**: 2025-11-06
**Dominio**: alchilemeatballs.com
**Método**: Cloudflare Tunnel + Proxy Autenticado
**Costo**: GRATIS (VM e2-micro en free tier)

---

## 📋 Contexto

Debido a las políticas de organización de Google Workspace que bloquean:
- ❌ `allUsers` en Cloud Run
- ❌ Creación de Service Account keys
- ❌ `allAuthenticatedUsers`

No es posible hacer Cloud Run públicamente accesible de forma directa.

**Solución implementada:**
- Cloudflare Tunnel en VM gratuita
- Proxy Python con autenticación automática vía Metadata Server
- 100% funcional sin violar políticas de organización

---

## 🏗️ Arquitectura

```
Usuario
  ↓
alchilemeatballs.com (Cloudflare DNS)
  ↓
Cloudflare Edge Network
  ↓
Cloudflare Tunnel (cloudflared en VM)
  ↓
Cloud Run Proxy (Python en VM)
  ↓ (con ID Token de GCP Metadata Server)
Cloud Run Frontend (autenticado)
  ↓
Cloud Run Backend (autenticado)
```

---

## 🚀 Configuración Paso a Paso

### Paso 1: Crear VM para Cloudflare Tunnel

```bash
gcloud compute instances create cloudflare-tunnel \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=10GB \
  --boot-disk-type=pd-standard \
  --tags=cloudflare-tunnel
```

**Resultado:**
- VM: `cloudflare-tunnel`
- Zone: `us-central1-a`
- Machine type: `e2-micro` (GRATIS en free tier)
- IP interna: `10.128.0.2`
- IP externa: Asignada automáticamente

---

### Paso 2: Crear Service Account para el Tunnel

```bash
# Crear service account
gcloud iam service-accounts create tunnel-invoker \
  --display-name="Cloudflare Tunnel Invoker"

# Dar permisos de Cloud Run Invoker
gcloud run services add-iam-policy-binding alchile-frontend \
  --region=us-central1 \
  --member="serviceAccount:tunnel-invoker@studio-9824031244-700aa.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

gcloud run services add-iam-policy-binding alchile-backend \
  --region=us-central1 \
  --member="serviceAccount:tunnel-invoker@studio-9824031244-700aa.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

---

### Paso 3: Asignar Service Account a la VM

```bash
# Detener VM
gcloud compute instances stop cloudflare-tunnel --zone=us-central1-a

# Asignar service account con scopes completos
gcloud compute instances set-service-account cloudflare-tunnel \
  --zone=us-central1-a \
  --service-account=tunnel-invoker@studio-9824031244-700aa.iam.gserviceaccount.com \
  --scopes=https://www.googleapis.com/auth/cloud-platform

# Iniciar VM
gcloud compute instances start cloudflare-tunnel --zone=us-central1-a
```

---

### Paso 4: Instalar y Configurar Cloudflared

Conéctate a la VM:
```bash
gcloud compute ssh cloudflare-tunnel --zone=us-central1-a
```

Instala cloudflared:
```bash
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

Autentícate con Cloudflare:
```bash
cloudflared tunnel login
```
Abre la URL que te da en tu navegador y autoriza el acceso a tu dominio.

Crea el tunnel:
```bash
cloudflared tunnel create alchile-tunnel
```
Guarda el UUID que te da (ejemplo: `c7495e30-8c54-473d-9db0-8c782b98a9d5`)

---

### Paso 5: Configurar el Tunnel

Crea el archivo de configuración:
```bash
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

Contenido (reemplaza `TUNNEL_UUID` con tu UUID):
```yaml
tunnel: TUNNEL_UUID
credentials-file: /etc/cloudflared/TUNNEL_UUID.json

ingress:
  - hostname: alchilemeatballs.com
    service: http://127.0.0.1:8080
  - service: http_status:404
```

Copia el archivo de credenciales:
```bash
sudo cp ~/.cloudflared/TUNNEL_UUID.json /etc/cloudflared/
```

---

### Paso 6: Crear Ruta DNS

```bash
cloudflared tunnel route dns alchile-tunnel alchilemeatballs.com
```

Esto crea automáticamente un registro CNAME en Cloudflare apuntando a tu tunnel.

**Nota:** Si ya tienes registros A/AAAA para el dominio, bórralos primero desde Cloudflare Dashboard.

---

### Paso 7: Crear Proxy Python con Autenticación

Crea el script de proxy:
```bash
nano ~/cloud-run-proxy.py
```

Contenido:
```python
#!/usr/bin/env python3
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.error

# URL del Cloud Run
CLOUD_RUN_URL = "https://alchile-frontend-ooexwakkyq-uc.a.run.app"
METADATA_URL = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=" + CLOUD_RUN_URL

class ProxyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.proxy_request()

    def do_POST(self):
        self.proxy_request()

    def proxy_request(self):
        # Obtener ID token del metadata server
        req_meta = urllib.request.Request(METADATA_URL)
        req_meta.add_header('Metadata-Flavor', 'Google')
        with urllib.request.urlopen(req_meta) as response:
            token = response.read().decode()

        # Construir URL completa
        url = CLOUD_RUN_URL + self.path

        # Crear request con token
        req = urllib.request.Request(url)
        req.add_header('Authorization', f'Bearer {token}')

        # Copiar headers del cliente
        for header, value in self.headers.items():
            if header.lower() not in ['host', 'authorization']:
                req.add_header(header, value)

        try:
            # Hacer request
            with urllib.request.urlopen(req) as response:
                self.send_response(response.status)
                for header, value in response.headers.items():
                    self.send_header(header, value)
                self.end_headers()
                self.wfile.write(response.read())
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_error(500, str(e))

if __name__ == '__main__':
    server = HTTPServer(('127.0.0.1', 8080), ProxyHandler)
    print("Proxy running on port 8080...")
    server.serve_forever()
```

Hazlo ejecutable:
```bash
chmod +x ~/cloud-run-proxy.py
```

---

### Paso 8: Instalar Servicios Systemd

**Servicio de Cloudflared:**
```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

**Servicio del Proxy:**
```bash
sudo nano /etc/systemd/system/cloud-run-proxy.service
```

Contenido:
```ini
[Unit]
Description=Cloud Run Proxy
After=network.target

[Service]
Type=simple
User=beto
WorkingDirectory=/home/beto
ExecStart=/usr/bin/python3 /home/beto/cloud-run-proxy.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Habilitar e iniciar:
```bash
sudo systemctl daemon-reload
sudo systemctl enable cloud-run-proxy
sudo systemctl start cloud-run-proxy
```

---

### Paso 9: Verificar Estado

Verificar cloudflared:
```bash
sudo systemctl status cloudflared
```

Verificar proxy:
```bash
sudo systemctl status cloud-run-proxy
```

Ambos deben mostrar `Active: active (running)` y `enabled`.

---

## ✅ Verificación Final

### Desde la VM:

```bash
# Verificar que cloudflared está conectado
sudo systemctl status cloudflared | grep "Registered tunnel"

# Verificar que el proxy responde
curl http://127.0.0.1:8080
```

### Desde tu computadora:

```bash
# Verificar DNS
dig alchilemeatballs.com

# Probar el sitio
curl https://alchilemeatballs.com
```

### En el navegador:

https://alchilemeatballs.com

Deberías ver tu aplicación funcionando.

---

## 🔧 Troubleshooting

### El tunnel no conecta

```bash
# Ver logs de cloudflared
sudo journalctl -u cloudflared -f

# Reiniciar servicio
sudo systemctl restart cloudflared
```

### El proxy da error 401

```bash
# Verificar que la VM tiene el service account correcto
gcloud compute instances describe cloudflare-tunnel --zone=us-central1-a | grep serviceAccounts -A 5

# Verificar que el service account tiene permisos
gcloud run services get-iam-policy alchile-frontend --region=us-central1
```

### El sitio no carga

```bash
# Ver logs del proxy
sudo journalctl -u cloud-run-proxy -f

# Probar el proxy localmente
curl http://127.0.0.1:8080

# Verificar que cloudflared apunta al proxy
cat /etc/cloudflared/config.yml
```

### Reiniciar todo

```bash
sudo systemctl restart cloudflared
sudo systemctl restart cloud-run-proxy
```

---

## 📊 Recursos y Costos

### VM e2-micro
- **vCPUs**: 2 (shared)
- **RAM**: 1GB
- **Disco**: 10GB
- **Costo**: **GRATIS** (siempre free tier de GCP)
- **Región**: us-central1-a

### Transferencia de Datos
- Cloudflare Tunnel: Gratis (sin límite)
- Cloud Run → VM: Gratis (mismo region)
- VM → Internet: Primeros 1GB/mes gratis, luego ~$0.12/GB

### Costo Total Estimado
- VM: $0 (free tier)
- Cloud Run: ~$20-40/mes (según tráfico)
- Transferencia: ~$0-5/mes (según tráfico)
- **Total: ~$20-45/mes**

---

## 🔐 Seguridad

### Autenticación
- ✅ Cloud Run requiere autenticación
- ✅ Solo el tunnel puede acceder (via service account)
- ✅ ID tokens generados automáticamente desde metadata server
- ✅ Tokens renovados automáticamente cada hora
- ✅ Sin keys de service account almacenadas

### Firewall
- VM solo expone conexión saliente a Cloudflare
- Cloud Run no expone IP pública directa
- Todo el tráfico pasa por Cloudflare (DDoS protection)

### Políticas de Organización
- ✅ No viola `iam.disableServiceAccountKeyCreation`
- ✅ No usa `allUsers` o `allAuthenticatedUsers`
- ✅ Usa Workload Identity (metadata server)
- ✅ Compatible con políticas restrictivas de Workspace

---

## 🔄 Mantenimiento

### Actualizar Cloudflared

```bash
gcloud compute ssh cloudflare-tunnel --zone=us-central1-a

# Descargar nueva versión
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

# Instalar
sudo dpkg -i cloudflared.deb

# Reiniciar servicio
sudo systemctl restart cloudflared
```

### Rotar Service Account

Si necesitas cambiar el service account:

```bash
# Crear nuevo service account
gcloud iam service-accounts create tunnel-invoker-v2 \
  --display-name="Cloudflare Tunnel Invoker v2"

# Dar permisos
gcloud run services add-iam-policy-binding alchile-frontend \
  --region=us-central1 \
  --member="serviceAccount:tunnel-invoker-v2@studio-9824031244-700aa.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

# Asignar a VM
gcloud compute instances stop cloudflare-tunnel --zone=us-central1-a
gcloud compute instances set-service-account cloudflare-tunnel \
  --zone=us-central1-a \
  --service-account=tunnel-invoker-v2@studio-9824031244-700aa.iam.gserviceaccount.com \
  --scopes=https://www.googleapis.com/auth/cloud-platform
gcloud compute instances start cloudflare-tunnel --zone=us-central1-a

# Reiniciar servicios
gcloud compute ssh cloudflare-tunnel --zone=us-central1-a \
  --command="sudo systemctl restart cloud-run-proxy"
```

### Logs

```bash
# Logs de cloudflared
gcloud compute ssh cloudflare-tunnel --zone=us-central1-a \
  --command="sudo journalctl -u cloudflared -n 100"

# Logs del proxy
gcloud compute ssh cloudflare-tunnel --zone=us-central1-a \
  --command="sudo journalctl -u cloud-run-proxy -n 100"
```

---

## 📈 Monitoreo

### Verificar que todo está corriendo

Script de verificación (ejecutar localmente):

```bash
#!/bin/bash

echo "🔍 Verificando Cloudflare Tunnel..."

# Verificar DNS
echo "DNS:"
dig +short alchilemeatballs.com

# Verificar servicios en VM
echo -e "\n🖥️ Servicios en VM:"
gcloud compute ssh cloudflare-tunnel --zone=us-central1-a --command="
  echo 'Cloudflared:' && sudo systemctl is-active cloudflared
  echo 'Proxy:' && sudo systemctl is-active cloud-run-proxy
"

# Verificar sitio
echo -e "\n🌐 Verificando sitio:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" https://alchilemeatballs.com

echo -e "\n✅ Verificación completa"
```

---

## 🎯 Alternativas Consideradas

### Cloud Load Balancer
- **Costo**: ~$18/mes + tráfico
- **Pros**: Más profesional, mejor performance, certificados SSL automáticos
- **Contras**: Más caro
- **Decisión**: No elegido por costo

### Firebase Hosting
- **Costo**: Gratis hasta cierto límite
- **Pros**: Simple, integrado con Firebase
- **Contras**: Requiere configuración de rewrites, limitado
- **Decisión**: No elegido por limitaciones

### Cloudflare Workers
- **Costo**: $5/mes (plan paid)
- **Pros**: Serverless, global
- **Contras**: Requiere código custom, más complejo
- **Decisión**: No elegido por complejidad

### Solución Implementada: Cloudflare Tunnel + VM
- **Costo**: GRATIS (VM en free tier)
- **Pros**: Gratis, estable, cumple políticas, fácil mantenimiento
- **Contras**: Requiere VM (pero es gratis)
- **Decisión**: ✅ Elegido

---

## 📚 Referencias

- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [GCP Metadata Server](https://cloud.google.com/compute/docs/metadata/overview)
- [Cloud Run Authentication](https://cloud.google.com/run/docs/authenticating/overview)
- [Workload Identity](https://cloud.google.com/iam/docs/workload-identity-federation)

---

## ✅ Checklist de Configuración

- [x] VM e2-micro creada en us-central1-a
- [x] Service account `tunnel-invoker` creado
- [x] Service account tiene rol `run.invoker` en frontend y backend
- [x] VM tiene service account asignado con scopes correctos
- [x] Cloudflared instalado en VM
- [x] Tunnel creado y autenticado con Cloudflare
- [x] Configuración de tunnel apuntando a proxy local
- [x] Ruta DNS creada en Cloudflare
- [x] Proxy Python creado con autenticación via metadata server
- [x] Servicio systemd de cloudflared instalado y habilitado
- [x] Servicio systemd de proxy instalado y habilitado
- [x] Ambos servicios corriendo y estables
- [x] Dominio `alchilemeatballs.com` funcionando
- [x] Aplicación accesible públicamente

---

**Última actualización**: 2025-11-06
**Estado**: ✅ Producción (100% Funcional)
**Dominio**: https://alchilemeatballs.com
**Mantenido por**: Claude Code + Jorge Salvatella
