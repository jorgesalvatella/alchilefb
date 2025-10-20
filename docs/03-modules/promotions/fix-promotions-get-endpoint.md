# Fix: Endpoint GET para Promoción Individual

**Fecha:** Enero 2025
**Problema Reportado:** Error 404 al intentar editar una promoción

---

## Problema

Cuando el usuario intentaba editar una promoción existente, la página de edición hacía una petición a:
```
GET /api/control/promotions/{id}
```

Pero este endpoint **no existía**, causando un error 404:
```
:9002/api/control/promotions/C0UzwUl6aOjRr9jA8hEI:1
Failed to load resource: the server responded with a status of 404 (Not Found)
```

## Causa

Durante la implementación inicial del módulo de promociones, se crearon estos endpoints:
- ✅ `GET /api/control/promotions` - Listar todas las promociones
- ✅ `POST /api/control/promotions` - Crear promoción
- ✅ `PUT /api/control/promotions/:id` - Actualizar promoción
- ✅ `DELETE /api/control/promotions/:id` - Eliminar promoción
- ❌ `GET /api/control/promotions/:id` - **FALTABA** obtener una promoción específica

## Solución Implementada

Se agregó el endpoint faltante en `/backend/app.js` (líneas 2807-2852):

```javascript
/**
 * @swagger
 * /api/control/promotions/{id}:
 *   get:
 *     summary: Obtiene una promoción específica por ID (admin)
 *     tags: [Promociones]
 *     security:
 *       - bearerAuth: []
 */
app.get('/api/control/promotions/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`[AUDIT] Admin ${req.user.uid} consultó promoción: ${id}`);

    const docRef = db.collection('promotions').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ message: 'Promoción no encontrada' });
    }

    const data = docSnap.data();

    // Verificar que no esté eliminada (soft delete)
    if (data.deletedAt !== null) {
      return res.status(404).json({ message: 'Promoción no encontrada' });
    }

    const promotion = {
      id: docSnap.id,
      name: data.name,
      description: data.description,
      type: data.type,
      isActive: data.isActive,
      startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : null,
      endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : null,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      packagePrice: data.packagePrice,
      packageItems: data.packageItems,
      imagePath: data.imagePath,
      imageUrl: data.imageUrl,
      promoType: data.promoType,
      promoValue: data.promoValue,
      appliesTo: data.appliesTo,
      targetIds: data.targetIds,
    };

    res.status(200).json(promotion);
  } catch (error) {
    console.error(`[GET /api/control/promotions/:id] ERROR:`, error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});
```

### Características del Endpoint

✅ **Seguridad:**
- Requiere autenticación (`authMiddleware`)
- Requiere rol admin (`requireAdmin`)
- Verifica que el documento exista
- Respeta soft deletes (no devuelve documentos marcados como eliminados)

✅ **Auditoría:**
- Registra en logs cada consulta de promoción con el UID del admin

✅ **Formato de Respuesta:**
- Convierte Timestamps de Firestore a ISO strings
- Incluye todos los campos necesarios para edición
- Incluye `imagePath` e `imageUrl` para paquetes

## Cambios Adicionales

También se agregaron los campos `imagePath` e `imageUrl` a:

1. **POST `/api/control/promotions`** - Para guardar la imagen al crear
2. **PUT `/api/control/promotions/:id`** - Para actualizar la imagen al editar
3. **GET `/api/control/promotions`** - Para listar con imágenes

## Testing

Para probar el endpoint:

```bash
# Obtener token de admin
TOKEN="your-admin-token"

# Obtener promoción por ID
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/control/promotions/C0UzwUl6aOjRr9jA8hEI
```

Respuesta esperada (200 OK):
```json
{
  "id": "C0UzwUl6aOjRr9jA8hEI",
  "name": "Paquete Familiar",
  "description": "3 hamburguesas + 2 papas",
  "type": "package",
  "isActive": true,
  "packagePrice": 350,
  "packageItems": [...],
  "imagePath": "paquetes/123456-imagen.jpg",
  "imageUrl": "https://...",
  "createdAt": "2025-01-18T...",
  "updatedAt": "2025-01-18T..."
}
```

## Estado

✅ **Resuelto** - El endpoint ahora funciona correctamente y la página de edición puede cargar los datos de la promoción.

---

**Próximos Pasos:**
- Reiniciar el servidor backend para aplicar los cambios
- Probar la edición de promociones desde el panel de control
- Verificar que las imágenes se carguen correctamente en el formulario de edición
