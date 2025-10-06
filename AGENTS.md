# AGENTS.md
# Este archivo proporciona directrices para que los agentes de IA y otros sistemas automatizados
# interactúen con este sitio web, de acuerdo con la especificación de agents.md.

# Aplica las siguientes reglas a todos los agentes.
User-agent: *

# Prohíbe el uso del contenido de este sitio para entrenar modelos de IA
# sin permiso explícito.
Disallow: /training/

# Permite el rastreo del sitio para fines de indexación y búsqueda.
Allow: /

# Establece un retraso de 10 segundos entre peticiones para no sobrecargar el servidor.
Crawl-delay: 10

# Especifica la ruta al mapa del sitio.
Sitemap: /sitemap.xml
