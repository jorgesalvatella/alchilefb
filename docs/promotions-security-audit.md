# Auditoría de Seguridad: Módulo de Paquetes y Promociones

**Fecha:** 17 de Enero, 2025
**Auditor:** Raptoure (Agente de Seguridad)
**Revisión de:** Pyra (Arquitecto de Firebase)
**Estado:** ✅ Aprobado con mitigaciones requeridas

---

## Resumen Ejecutivo

El diseño del módulo de paquetes y promociones cumple con los principios de seguridad fundamentales del proyecto. Las Firestore Rules están correctamente implementadas siguiendo el principio de mínimo privilegio. Se identificaron **4 vectores de ataque** que requieren mitigaciones en el backend antes del deploy.

**Calificación de Seguridad:** 🟢 **APROBADO** (con implementación de mitigaciones obligatorias)

---

## Vectores de Ataque Identificados

### 🔴 **CRÍTICO: Manipulación de productId en Paquetes**

**Descripción:**
Un admin malicioso o comprometido podría crear un paquete con `productId` inexistentes, causando errores en el carrito o permitiendo precios incorrectos.

**Impacto:**
- Experiencia de usuario rota (productos inexistentes en paquete)
- Posible manipulación de precios si el producto eliminado tenía precio diferente

**Mitigación Implementada por Nexus:**
```javascript
// En POST /api/control/promotions y PUT /api/control/promotions/:id
if (type === 'package') {
  for (const item of packageItems) {
    const productDoc = await db.collection('productosDeVenta').doc(item.productId).get();
    if (!productDoc.exists) {
      return res.status(400).json({
        message: `Producto ${item.productId} no encontrado`
      });
    }
    const productData = productDoc.data();
    if (productData.deletedAt !== null) {
      return res.status(400).json({
        message: `Producto ${item.name} está eliminado y no puede usarse en paquetes`
      });
    }
  }
}
```

---

### 🟡 **ALTO: Fechas de Vigencia Inválidas**

**Descripción:**
Promoción con `endDate` anterior a `startDate` podría causar comportamiento inesperado en la lógica de validación.

**Impacto:**
- Promociones que nunca se activan
- Confusión en reportes de promociones vigentes

**Mitigación:**
```javascript
if (startDate && endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end <= start) {
    return res.status(400).json({
      message: 'La fecha de fin debe ser posterior a la fecha de inicio'
    });
  }
}
```

---

### 🟡 **ALTO: Descuentos Porcentuales > 100%**

**Descripción:**
`promoValue: 150` con `promoType: 'percentage'` resultaría en precios negativos.

**Impacto:**
- Precios finales negativos (dinero "regalado" al cliente)
- Posible explotación financiera

**Mitigación:**
```javascript
if (type === 'promotion') {
  if (promoType === 'percentage') {
    if (promoValue < 0 || promoValue > 100) {
      return res.status(400).json({
        message: 'El descuento porcentual debe estar entre 0 y 100'
      });
    }
  }
  if (promoType === 'fixed_amount') {
    if (promoValue < 0) {
      return res.status(400).json({
        message: 'El descuento fijo no puede ser negativo'
      });
    }
  }
}
```

---

### 🟡 **MEDIO: targetIds Vacío en Promociones Específicas**

**Descripción:**
Promoción con `appliesTo: 'product'` pero `targetIds: []` no aplicaría a nada.

**Impacto:**
- Promoción inútil que confunde a admins y usuarios
- Posible error de lógica en backend

**Mitigación:**
```javascript
if (type === 'promotion' && appliesTo !== 'total_order') {
  if (!targetIds || targetIds.length === 0) {
    return res.status(400).json({
      message: 'targetIds es requerido cuando appliesTo es "product" o "category"'
    });
  }

  // Validar que las categorías/productos existan
  if (appliesTo === 'category') {
    for (const catId of targetIds) {
      const catDoc = await db.collection('categoriasDeVenta').doc(catId).get();
      if (!catDoc.exists || catDoc.data().deletedAt !== null) {
        return res.status(400).json({
          message: `Categoría ${catId} no existe o está eliminada`
        });
      }
    }
  }

  if (appliesTo === 'product') {
    for (const prodId of targetIds) {
      const prodDoc = await db.collection('productosDeVenta').doc(prodId).get();
      if (!prodDoc.exists || prodDoc.data().deletedAt !== null) {
        return res.status(400).json({
          message: `Producto ${prodId} no existe o está eliminado`
        });
      }
    }
  }
}
```

---

## Firestore Security Rules - Análisis

### ✅ **Aprobado: Lectura Pública Restringida**

```javascript
// Public can read only active and non-deleted promotions
allow get: if resource.data.isActive == true && resource.data.deletedAt == null;
allow list: if resource.data.isActive == true && resource.data.deletedAt == null;
```

**Justificación:**
- Usuarios solo ven promociones activas y válidas
- Promociones inactivas o eliminadas quedan ocultas del público
- Previene exposición de información de negocio sensible

### ✅ **Aprobado: Escritura Restringida a Admins**

```javascript
allow create: if isAdmin() || isSuperAdmin();
allow update: if isAdmin() || isSuperAdmin();
allow delete: if isAdmin() || isSuperAdmin();
```

**Justificación:**
- Solo personal autorizado puede manipular promociones
- Previene manipulación de precios por usuarios regulares
- Cumple con principio de mínimo privilegio

### ✅ **Aprobado: Admins Tienen Acceso Completo**

```javascript
allow read: if isAdmin() || isSuperAdmin();
```

**Justificación:**
- Admins necesitan ver todas las promociones (incluso inactivas/eliminadas)
- Permite gestión completa desde el panel de administración

---

## Recomendaciones de Hardening

### 1. Rate Limiting en Endpoint Público

**Implementar en:** `GET /api/promotions`

```javascript
const rateLimit = require('express-rate-limit');

const promotionsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // 100 requests por minuto por IP
  message: 'Demasiadas solicitudes, intenta de nuevo más tarde'
});

app.get('/api/promotions', promotionsLimiter, async (req, res) => {
  // ...
});
```

**Justificación:**
Previene ataques de DoS en el endpoint público de promociones.

---

### 2. Logging de Auditoría

**Implementar en:** Todos los endpoints de escritura

```javascript
app.post('/api/control/promotions', authMiddleware, requireAdmin, async (req, res) => {
  console.log(`[AUDIT] Admin ${req.user.uid} (${req.user.email}) creó promoción:`, {
    name: req.body.name,
    type: req.body.type,
    timestamp: new Date().toISOString()
  });
  // ... lógica del endpoint
});

app.put('/api/control/promotions/:id', authMiddleware, requireAdmin, async (req, res) => {
  console.log(`[AUDIT] Admin ${req.user.uid} actualizó promoción ${req.params.id}`);
  // ...
});

app.delete('/api/control/promotions/:id', authMiddleware, requireAdmin, async (req, res) => {
  console.log(`[AUDIT] Admin ${req.user.uid} eliminó promoción ${req.params.id}`);
  // ...
});
```

**Justificación:**
- Trazabilidad de cambios en promociones
- Detección de actividad sospechosa
- Cumplimiento con mejores prácticas de auditoría

---

### 3. Validación en Doble Capa

**Frontend (UX - feedback inmediato):**
```typescript
import { z } from 'zod';

const packageSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  packagePrice: z.number().min(0.01, 'Precio debe ser mayor a 0'),
  packageItems: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1)
  })).min(1, 'Debe incluir al menos un producto')
});
```

**Backend (CRÍTICO - seguridad):**
```javascript
if (!name || name.trim().length === 0) {
  return res.status(400).json({ message: 'Nombre requerido' });
}
if (type === 'package' && (!packagePrice || packagePrice <= 0)) {
  return res.status(400).json({ message: 'packagePrice debe ser mayor a 0' });
}
```

**Justificación:**
- Frontend: Mejora UX con feedback instantáneo
- Backend: Seguridad real (NUNCA confiar en el cliente)

---

### 4. Soft Delete Obligatorio

**NUNCA hacer:**
```javascript
await db.collection('promotions').doc(id).delete(); // ❌ PROHIBIDO
```

**SIEMPRE hacer:**
```javascript
await db.collection('promotions').doc(id).update({
  deletedAt: new Date(),
  isActive: false // También desactivar
}); // ✅ CORRECTO
```

**Justificación:**
- Permite recuperar promociones eliminadas accidentalmente
- Mantiene historial para auditorías
- Previene pérdida de datos

---

## Checklist de Implementación para Nexus

Al implementar los endpoints, **Nexus DEBE** completar este checklist:

### POST /api/control/promotions
- [ ] `authMiddleware` aplicado
- [ ] `requireAdmin` aplicado
- [ ] Validar campos requeridos (`name`, `type`)
- [ ] Validar `packagePrice > 0` si `type === 'package'`
- [ ] Validar existencia de `productId` en `packageItems`
- [ ] Validar `promoValue` según `promoType`
- [ ] Validar `targetIds` si `appliesTo !== 'total_order'`
- [ ] Validar `endDate > startDate` si ambos existen
- [ ] Logging de auditoría
- [ ] Retornar 201 con ID del documento creado

### GET /api/control/promotions
- [ ] `authMiddleware` aplicado
- [ ] `requireAdmin` aplicado
- [ ] Filtrar por `deletedAt === null`
- [ ] Ordenar por `createdAt desc`
- [ ] Retornar 200 con array de promociones

### GET /api/promotions (público)
- [ ] Rate limiting aplicado
- [ ] Filtrar por `isActive === true && deletedAt === null`
- [ ] Validar vigencia de fechas en el servidor
- [ ] Retornar 200 con array de promociones activas

### PUT /api/control/promotions/:id
- [ ] `authMiddleware` aplicado
- [ ] `requireAdmin` aplicado
- [ ] Todas las validaciones del POST
- [ ] Verificar que el documento existe
- [ ] Actualizar `updatedAt: new Date()`
- [ ] Logging de auditoría
- [ ] Retornar 200 con documento actualizado

### DELETE /api/control/promotions/:id (soft delete)
- [ ] `authMiddleware` aplicado
- [ ] `requireAdmin` aplicado
- [ ] Soft delete (`deletedAt: new Date()`)
- [ ] Desactivar (`isActive: false`)
- [ ] Logging de auditoría
- [ ] Retornar 200 con mensaje de confirmación

---

## Conclusión

El diseño de seguridad del módulo de promociones es **sólido** y cumple con los estándares del proyecto. Las Firestore Rules están correctamente implementadas. Las mitigaciones identificadas son **obligatorias** antes del deploy y deben ser implementadas por **Nexus** durante la Fase 2.

**Aprobación:** ✅ **PROCEDER A FASE 2** (Desarrollo de Backend)

**Firmado:**
🛡️ Raptoure - Agente de Seguridad
Fecha: 17 de Enero, 2025
