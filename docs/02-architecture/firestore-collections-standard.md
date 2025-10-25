# Estándar de Nomenclatura de Colecciones Firestore

**Fecha**: Enero 2025
**Versión**: 1.0
**Mantenido por**: Pyra (Arquitecto Firebase)

---

## 📋 Objetivo

Este documento establece el estándar oficial de nomenclatura para todas las colecciones de Firestore en el proyecto **Al Chile FB**, con el fin de:

1. **Mantener consistencia** entre frontend, backend y documentación
2. **Prevenir errores** de referencias incorrectas a colecciones
3. **Facilitar el mantenimiento** y onboarding de nuevos desarrolladores
4. **Documentar decisiones** de arquitectura de datos

---

## 🗂️ Colecciones Oficiales

### Tabla de Referencia Rápida

| Colección Firestore | Descripción | Endpoints API | Documentación |
|---------------------|-------------|---------------|---------------|
| `users` | Usuarios del sistema | `/api/usuarios/*` | [usuarios.js](../../backend/usuarios.js) |
| `pedidos` | Pedidos/Órdenes | `/api/pedidos/*` | [pedidos.js](../../backend/pedidos.js) |
| `repartidores` | Repartidores/Drivers | `/api/control/drivers/*` | [app.js](../../backend/app.js) |
| `categoriasDeVenta` | Categorías de productos | `/api/catalogo/categorias/*` | [app.js](../../backend/app.js) |
| `productos` | Productos del catálogo | `/api/catalogo/productos/*` | [app.js](../../backend/app.js) |
| `paquetes` | Paquetes/Combos | `/api/catalogo/paquetes/*` | [app.js](../../backend/app.js) |
| `promociones` | Promociones especiales | `/api/catalogo/promociones/*` | [app.js](../../backend/app.js) |

---

## ⚠️ IMPORTANTE: Colección de Repartidores

### Nombre Correcto: `repartidores`

**✅ USAR:**
```javascript
db.collection('repartidores')
```

**❌ NO USAR:**
```javascript
db.collection('drivers')  // ❌ INCORRECTO
```

### Razón Histórica

- El nombre de la ruta del API es `/api/control/drivers` (para consistencia con el dominio en inglés)
- Sin embargo, la colección Firestore usa el nombre en español: `repartidores`
- Esta decisión se tomó para mantener consistencia con otras colecciones en español (`pedidos`, `usuarios`, `productos`, etc.)

### Caso de Uso Corregido

**Problema Original** (Bug fix Enero 2025):
```javascript
// ❌ INCORRECTO - Causaba "Repartidor no encontrado"
const driverRef = db.collection('drivers').doc(driverId);
```

**Solución Correcta**:
```javascript
// ✅ CORRECTO
const driverRef = db.collection('repartidores').doc(driverId);
```

---

## 🔍 Convenciones de Nomenclatura

### 1. Idioma: Español

**Razón**: Mantener consistencia con el dominio del negocio y facilitar la comprensión del equipo.

**Ejemplos**:
- ✅ `pedidos` (no `orders`)
- ✅ `usuarios` (no `users` - excepción histórica)
- ✅ `repartidores` (no `drivers`)
- ✅ `productos` (no `products`)

**Excepciones aceptadas**:
- `users` - Colección histórica, mantener por compatibilidad

### 2. Plural

**Razón**: Las colecciones contienen múltiples documentos.

**Ejemplos**:
- ✅ `repartidores` (no `repartidor`)
- ✅ `productos` (no `producto`)
- ✅ `pedidos` (no `pedido`)

### 3. CamelCase cuando sea necesario

**Para nombres compuestos**:
- ✅ `categoriasDeVenta`
- ✅ `areasLaborales`

### 4. Sin guiones ni underscores

**Razón**: Simplificar el acceso en código.

**Ejemplos**:
- ✅ `categoriasDeVenta` (no `categorias_de_venta` ni `categorias-de-venta`)

---

## 🛡️ Soft Deletes

**Todas las colecciones principales deben implementar soft deletes.**

### Campo Requerido

```typescript
interface FirestoreDocument {
  // ... otros campos
  deleted?: boolean;  // true si está eliminado, false o undefined si está activo
}
```

### Queries Estándar

**Al leer documentos, SIEMPRE filtrar por `deleted`:**

```javascript
// ✅ CORRECTO
const snapshot = await db.collection('repartidores')
  .where('deleted', '==', false)
  .get();

// ✅ CORRECTO (verificar en código)
const driverData = driverDoc.data();
if (driverData.deleted === true) {
  throw new Error('Repartidor no encontrado');
}

// ❌ INCORRECTO (no verifica soft delete)
const snapshot = await db.collection('repartidores').get();
```

---

## 📝 Proceso de Verificación

### Antes de Crear una Nueva Colección

1. **Consultar este documento** para verificar que no exista ya
2. **Seguir las convenciones** de nomenclatura establecidas
3. **Actualizar esta documentación** con la nueva colección
4. **Implementar soft deletes** si es una colección principal
5. **Escribir tests** que verifiquen el nombre correcto

### Auditoría de Código

**Para verificar uso correcto de colecciones:**

```bash
# Buscar todas las referencias a colecciones
grep -r "\.collection\(" backend/

# Verificar que no existan referencias a 'drivers'
grep -r "collection('drivers')" backend/
```

---

## 🧪 Testing

### Verificar Nombres de Colecciones en Tests

**Ejemplo de test que verifica la colección correcta:**

```javascript
it('should return 404 if driver is soft deleted', async () => {
  const deletedDriver = { ...mockDriver, deleted: true };
  mockTransactionGet
    .mockResolvedValueOnce({ exists: true, data: () => mockOrder })
    .mockResolvedValueOnce({ exists: true, data: () => deletedDriver });

  const res = await request(app)
    .put('/api/pedidos/control/order123/asignar-repartidor')
    .set('Authorization', 'Bearer admin-token')
    .send({ driverId: 'driver456' });

  expect(res.statusCode).toBe(404);
  expect(res.body.message).toBe('Repartidor no encontrado');
});
```

---

## 📚 Referencias Cruzadas

- [Database Context](./database-context.md) - Esquemas de Firestore
- [Blueprint](./blueprint.md) - Arquitectura general
- [Driver Tracking Schema](../03-modules/tracking/driver-tracking-schema.md) - Esquema de repartidores

---

## 📌 Changelog

### 2025-01-25: Versión 1.0
- ✅ Documento inicial creado
- ✅ Corregido bug: `collection('drivers')` → `collection('repartidores')` en 2 ubicaciones
- ✅ Agregada validación de soft deletes en asignación de repartidores
- ✅ Agregado test de integración para verificar soft deletes

---

**Última actualización:** Enero 2025
**Mantenido por:** Pyra (Arquitecto Firebase)
