/**
 * Campos que no deben ser sanitizados (técnicos, no visibles al usuario)
 */
const SKIP_SANITIZATION_FIELDS = new Set([
  'token',
  'fcmToken',
  'refreshToken',
  'accessToken',
  'idToken',
  'userAgent',
  'deviceInfo',
  'password',
  'passwordHash',
  'salt',
  'hash',
  'signature',
  'authorization',
  'bearer',
  'jwt',
]);

/**
 * Middleware de sanitización para prevenir XSS
 * Limpia todos los strings en req.body, req.query y req.params
 */
const sanitizeInput = (req, res, next) => {
  try {
    // Sanitizar req.body
    if (req.body && typeof req.body === 'object') {
      sanitizeObjectInPlace(req.body);
    }

    // Sanitizar req.query - crear una copia porque query puede tener getters
    if (req.query && typeof req.query === 'object') {
      const sanitizedQuery = sanitizeObject(req.query);
      // Limpiar el objeto original y copiar las propiedades sanitizadas
      Object.keys(req.query).forEach(key => delete req.query[key]);
      Object.assign(req.query, sanitizedQuery);
    }

    // Sanitizar req.params
    if (req.params && typeof req.params === 'object') {
      sanitizeObjectInPlace(req.params);
    }

    next();
  } catch (error) {
    console.error('Error en sanitización:', error);
    return res.status(500).json({
      message: 'Error procesando la solicitud',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Sanitiza recursivamente un objeto (retorna nueva copia)
 * @param {*} obj - Objeto a sanitizar
 * @returns {*} - Objeto sanitizado
 */
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Si es un array, sanitizar cada elemento
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  // Si es un objeto, sanitizar cada propiedad
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  // Si es un string, sanitizar
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  // Para otros tipos (number, boolean, etc.), devolver tal cual
  return obj;
}

/**
 * Sanitiza un objeto in-place (modifica el objeto original)
 * @param {*} obj - Objeto a sanitizar
 * @param {string} parentKey - Clave del padre (para detectar campos técnicos)
 */
function sanitizeObjectInPlace(obj, parentKey = '') {
  if (obj === null || obj === undefined) {
    return;
  }

  // Si es un array, sanitizar cada elemento
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'string') {
        obj[i] = sanitizeString(obj[i]);
      } else if (typeof obj[i] === 'object') {
        sanitizeObjectInPlace(obj[i], parentKey);
      }
    }
    return;
  }

  // Si es un objeto, sanitizar cada propiedad
  if (typeof obj === 'object') {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Saltar campos técnicos
        if (SKIP_SANITIZATION_FIELDS.has(key) || SKIP_SANITIZATION_FIELDS.has(parentKey)) {
          continue;
        }

        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeString(obj[key]);
        } else if (typeof obj[key] === 'object') {
          sanitizeObjectInPlace(obj[key], key);
        }
      }
    }
  }
}

/**
 * Sanitiza un string escapando caracteres peligrosos
 * @param {string} str - String a sanitizar
 * @returns {string} - String sanitizado
 */
function sanitizeString(str) {
  if (typeof str !== 'string') {
    return str;
  }

  // Escapar caracteres HTML peligrosos
  let sanitized = str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  // Eliminar scripts inline y otros patrones peligrosos
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,  // onclick, onerror, etc.
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];

  dangerousPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  return sanitized;
}

/**
 * Middleware de sanitización más permisivo para campos específicos
 * Permite HTML básico pero sanitizado (útil para descripciones, etc.)
 */
const sanitizeInputPermissive = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObjectPermissive(req.body);
    }

    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObjectPermissive(req.query);
    }

    next();
  } catch (error) {
    console.error('Error en sanitización permisiva:', error);
    return res.status(500).json({
      message: 'Error procesando la solicitud',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

function sanitizeObjectPermissive(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObjectPermissive(item));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObjectPermissive(obj[key]);
      }
    }
    return sanitized;
  }

  if (typeof obj === 'string') {
    return sanitizeStringPermissive(obj);
  }

  return obj;
}

function sanitizeStringPermissive(str) {
  if (typeof str !== 'string') {
    return str;
  }

  // Escapar caracteres HTML pero permitir algunos tags básicos
  let sanitized = str;

  // Eliminar scripts y patrones peligrosos
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];

  dangerousPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  return sanitized;
}

module.exports = {
  sanitizeInput,
  sanitizeInputPermissive,
  sanitizeString,
  sanitizeObject,
};
