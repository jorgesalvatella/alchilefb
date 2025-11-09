#!/usr/bin/env python3
"""
Cloud Run Proxy con Routing Inteligente
Rutea dinámicamente entre Frontend y Backend según la URL
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.error
import sys

# URLs de Cloud Run
FRONTEND_URL = "https://alchile-frontend-ooexwakkyq-uc.a.run.app"
BACKEND_URL = "https://alchile-backend-ooexwakkyq-uc.a.run.app"

# Metadata server para obtener tokens
FRONTEND_METADATA_URL = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=" + FRONTEND_URL
BACKEND_METADATA_URL = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=" + BACKEND_URL

class ProxyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.proxy_request()

    def do_POST(self):
        self.proxy_request()

    def do_PUT(self):
        self.proxy_request()

    def do_DELETE(self):
        self.proxy_request()

    def do_PATCH(self):
        self.proxy_request()

    def do_OPTIONS(self):
        # Manejar CORS preflight
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Max-Age', '86400')
        self.end_headers()

    def proxy_request(self):
        try:
            # Determinar si la petición es para el backend o frontend
            if self.path.startswith('/api/'):
                target_url = BACKEND_URL
                metadata_url = BACKEND_METADATA_URL
                target_name = "BACKEND"
            else:
                target_url = FRONTEND_URL
                metadata_url = FRONTEND_METADATA_URL
                target_name = "FRONTEND"

            # Log de routing
            print(f"[{target_name}] {self.command} {self.path}", file=sys.stderr)

            # Obtener ID token del metadata server
            req_meta = urllib.request.Request(metadata_url)
            req_meta.add_header('Metadata-Flavor', 'Google')

            with urllib.request.urlopen(req_meta, timeout=5) as response:
                token = response.read().decode()

            # Construir URL completa
            url = target_url + self.path

            # Leer body si existe (para POST/PUT/PATCH)
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else None

            # Crear request con token
            req = urllib.request.Request(url, data=body, method=self.command)
            # Usar un header diferente para el token de IAP
            req.add_header('X-Serverless-Authorization', f'Bearer {token}')

            # Copiar headers del cliente (INCLUYENDO Authorization del usuario)
            for header, value in self.headers.items():
                if header.lower() not in ['host', 'connection']:
                    req.add_header(header, value)

            # Hacer request al servicio correspondiente
            with urllib.request.urlopen(req, timeout=60) as response:
                # Enviar respuesta al cliente
                self.send_response(response.status)

                # Copiar headers de respuesta
                for header, value in response.headers.items():
                    # Skip headers que pueden causar problemas
                    if header.lower() not in ['transfer-encoding', 'connection']:
                        self.send_header(header, value)

                self.end_headers()

                # Enviar body de respuesta
                self.wfile.write(response.read())

        except urllib.error.HTTPError as e:
            # Error HTTP del servicio
            print(f"[ERROR] HTTP {e.code} for {self.path}: {e.reason}", file=sys.stderr)
            self.send_response(e.code)

            # Copiar headers del error
            for header, value in e.headers.items():
                if header.lower() not in ['transfer-encoding', 'connection']:
                    self.send_header(header, value)

            self.end_headers()

            # Enviar body del error
            try:
                error_body = e.read()
                self.wfile.write(error_body)
            except:
                pass

        except urllib.error.URLError as e:
            # Error de red/timeout
            print(f"[ERROR] Network error for {self.path}: {e.reason}", file=sys.stderr)
            self.send_error(502, f"Bad Gateway: {str(e.reason)}")

        except Exception as e:
            # Error inesperado
            print(f"[ERROR] Unexpected error for {self.path}: {str(e)}", file=sys.stderr)
            self.send_error(500, f"Internal Server Error: {str(e)}")

    def log_message(self, format, *args):
        # Enviar logs a stderr para que systemd los capture
        sys.stderr.write(f"[ACCESS] {format % args}\n")
        sys.stderr.flush()


if __name__ == '__main__':
    PORT = 8080
    server = HTTPServer(('127.0.0.1', PORT), ProxyHandler)

    print(f"🚀 Cloud Run Proxy running on port {PORT}", file=sys.stderr)
    print(f"   Frontend: {FRONTEND_URL}", file=sys.stderr)
    print(f"   Backend:  {BACKEND_URL}", file=sys.stderr)
    print(f"   Routing:  /api/* → Backend, everything else → Frontend", file=sys.stderr)
    sys.stderr.flush()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Shutting down proxy...", file=sys.stderr)
        server.shutdown()
