# Categorías Automáticas para Paquetes y Promociones

**Fecha:** Enero 2025
**Estado:** ✅ Implementado

---

## Objetivo

Mostrar paquetes y promociones en el menú público agrupados en sus propias categorías:
- **Categoría "Paquetes"**: Para todos los paquetes (combos de productos)
- **Categoría "Promociones"**: Para todas las promociones (descuentos)

---

## Arquitectura Implementada

### Categorías Solo para Visualización

⚠️ **IMPORTANTE**: Las categorías "Paquetes" y "Promociones" son **SOLO para visualización** en el menú público.

**NO afectan el inventario:**
- Los paquetes referencian productos existentes mediante `packageItems[].productId`
- El inventario se descuenta de los productos originales, no del paquete
- Los productos mantienen sus categorías originales (Hamburguesas, Bebidas, etc.)

### Ejemplo de Flujo

```
1. Admin crea paquete "Paquete Familiar" con:
   - 3x Hamburguesa Clásica (productId: "prod_hamburguesa")
   - 2x Papas Grandes (productId: "prod_papas")

2. Sistema automáticamente:
   - Busca/crea categoría "Paquetes"
   - Asigna categoryId al paquete

3. En el menú público se muestra:
   ┌─ Hamburguesas
   │  └─ Hamburguesa Clásica ($80)
   ├─ Papas
   │  └─ Papas Grandes ($45)
   └─ Paquetes ← Nueva categoría
      └─ Paquete Familiar ($250)

4. Cliente ordena "Paquete Familiar":
   - Inventario descontado:
     * productosDeVenta/prod_hamburguesa: stock -= 3
     * productosDeVenta/prod_papas: stock -= 2
```

---

## Implementación Técnica

### 1. Función Helper `getOrCreatePromotionCategory()`

**Ubicación:** `/backend/app.js` (líneas 85-151)

**Responsabilidades:**
- Busca si ya existe la categoría "Paquetes" o "Promociones"
- Si no existe, la crea automáticamente
- Asigna la categoría a la primera unidad de negocio y departamento disponibles
- Retorna el `categoryId` para asignarlo a la promoción/paquete

**Código:**
```javascript
async function getOrCreatePromotionCategory(type) {
  const categoryName = type === 'package' ? 'Paquetes' : 'Promociones';

  // Buscar si ya existe
  const existingSnapshot = await db.collection('categoriasDeVenta')
    .where('name', '==', categoryName)
    .where('deletedAt', '==', null)
    .limit(1)
    .get();

  if (!existingSnapshot.empty) {
    return existingSnapshot.docs[0].id;
  }

  // Crear automáticamente si no existe
  const businessUnitsSnapshot = await db.collection('businessUnits')
    .where('deletedAt', '==', null)
    .limit(1)
    .get();

  const businessUnitId = businessUnitsSnapshot.docs[0].id;

  const departmentSnapshot = await db.collection('departamentos')
    .where('businessUnitId', '==', businessUnitId)
    .where('deletedAt', '==', null)
    .limit(1)
    .get();

  const departmentId = departmentSnapshot.docs[0].id;

  const newCategory = {
    name: categoryName,
    description: `Categoría automática para ${categoryName.toLowerCase()}`,
    businessUnitId,
    departmentId,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const docRef = await db.collection('categoriasDeVenta').add(newCategory);
  console.log(`[AUTO-CREATE] Categoría "${categoryName}" creada automáticamente`);

  return docRef.id;
}
```

### 2. Integración en Endpoint POST

**Ubicación:** `/backend/app.js` (líneas 2832-2836)

Cuando se crea una nueva promoción o paquete:

```javascript
// Obtener o crear la categoría automáticamente
const categoryId = await getOrCreatePromotionCategory(type);
if (categoryId) {
  newPromotion.categoryId = categoryId;
}
```

### 3. Schema Actualizado

**Campo agregado a `promotions`:**
```typescript
interface Promotion {
  // ... otros campos ...
  categoryId?: string;  // ID de la categoría "Paquetes" o "Promociones"
}
```

### 4. Endpoints Actualizados

Todos los endpoints ahora incluyen `categoryId`:

✅ `GET /api/promotions` (público)
✅ `GET /api/control/promotions` (admin - lista)
✅ `GET /api/control/promotions/:id` (admin - individual)
✅ `POST /api/control/promotions` (admin - crear)

---

## Ventajas de Esta Arquitectura

### ✅ Gestión Automática
- No requiere intervención del admin
- Categorías se crean solo cuando se necesitan
- Si ya existen, se reutilizan

### ✅ Inventario Centralizado
- Los productos mantienen su inventario original
- No hay duplicación de productos
- Control de stock simplificado

### ✅ Flexibilidad en el Menú
- Fácil visualizar paquetes y promociones separados
- Se integran naturalmente con otras categorías
- Frontend puede agrupar por `categoryId`

### ✅ Escalabilidad
- Si en el futuro se necesitan más tipos, solo agregar casos al helper
- Misma arquitectura para cualquier tipo de "agrupación virtual"

---

## Visualización en Frontend

### Endpoint para Menú Público

```javascript
// GET /api/promotions
[
  {
    "id": "pkg_001",
    "name": "Paquete Familiar",
    "type": "package",
    "categoryId": "cat_paquetes_auto",  // ← Auto-asignado
    "packagePrice": 250,
    "packageItems": [
      { "productId": "prod_hamburguesa", "quantity": 3 },
      { "productId": "prod_papas", "quantity": 2 }
    ],
    "imagePath": "paquetes/123-imagen.jpg"
  },
  {
    "id": "promo_001",
    "name": "20% OFF Bebidas",
    "type": "promotion",
    "categoryId": "cat_promociones_auto",  // ← Auto-asignado
    "promoType": "percentage",
    "promoValue": 20,
    "appliesTo": "category",
    "targetIds": ["cat_bebidas"]
  }
]
```

### Cómo Agrupar en el Frontend

```javascript
// Obtener todas las categorías (incluye "Paquetes" y "Promociones")
const categories = await fetch('/api/categorias-venta').then(r => r.json());

// Obtener paquetes y promociones
const promotions = await fetch('/api/promotions').then(r => r.json());

// Agrupar por categoryId
const menuSections = categories.map(category => ({
  categoryName: category.name,
  items: promotions.filter(p => p.categoryId === category.id)
}));

// Resultado visual:
// - Hamburguesas
//   * Hamburguesa Clásica
// - Bebidas
//   * Coca-Cola
// - Paquetes  ← Nueva sección
//   * Paquete Familiar
// - Promociones  ← Nueva sección
//   * 20% OFF Bebidas
```

---

## Logs y Auditoría

Cuando se crea una categoría automáticamente:

```
[AUTO-CREATE] Categoría "Paquetes" creada automáticamente con ID: cat_abc123
```

Cuando se crea un paquete:

```
[AUDIT] Admin uid123 creó promoción: {
  id: "pkg_001",
  name: "Paquete Familiar",
  type: "package"
}
```

---

## Consideraciones para el Inventario

### ⚠️ Importante: Descuento de Stock en Paquetes

Cuando se vende un paquete, el sistema debe:

1. **Leer `packageItems`** del paquete vendido
2. **Recorrer cada item** y descontar del producto original:

```javascript
// Ejemplo: Venta de "Paquete Familiar"
const package = {
  packageItems: [
    { productId: "prod_hamburguesa", quantity: 3 },
    { productId: "prod_papas", quantity: 2 }
  ]
};

// Para cada item del paquete:
for (const item of package.packageItems) {
  const productRef = db.collection('productosDeVenta').doc(item.productId);

  await productRef.update({
    stock: FieldValue.increment(-item.quantity)
  });
}

// Resultado:
// productosDeVenta/prod_hamburguesa: stock = 100 - 3 = 97
// productosDeVenta/prod_papas: stock = 50 - 2 = 48
```

### Validación de Stock

Antes de confirmar la venta de un paquete:

```javascript
// Verificar que hay suficiente stock de TODOS los productos
for (const item of package.packageItems) {
  const productSnap = await db.collection('productosDeVenta')
    .doc(item.productId)
    .get();

  const productData = productSnap.data();

  if (productData.stock < item.quantity) {
    throw new Error(`Stock insuficiente para ${productData.name}`);
  }
}
```

---

## Testing

### Probar Creación Automática de Categorías

1. Crear un paquete:
```bash
curl -X POST http://localhost:8080/api/control/promotions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Paquete Test",
    "type": "package",
    "packagePrice": 100,
    "packageItems": [{"productId": "prod_001", "name": "Test", "quantity": 1}]
  }'
```

2. Verificar en logs:
```
[AUTO-CREATE] Categoría "Paquetes" creada automáticamente con ID: xyz
```

3. Verificar en respuesta:
```json
{
  "id": "promo_abc",
  "name": "Paquete Test",
  "type": "package",
  "categoryId": "xyz"  // ← Debe tener categoryId
}
```

4. Verificar en Firestore:
   - Colección `categoriasDeVenta` debe tener documento "Paquetes"
   - Colección `promotions` debe tener `categoryId` apuntando a esa categoría

---

## Próximos Pasos

1. ✅ Backend implementado
2. ⏳ Frontend: Integrar paquetes/promociones en menú público
3. ⏳ Frontend: Mostrar categorías "Paquetes" y "Promociones" en el menú
4. ⏳ Backend: Implementar descuento de inventario al vender paquetes
5. ⏳ Frontend: Validar stock antes de permitir agregar paquete al carrito

---

**Última Actualización:** Enero 2025
**Estado:** ✅ Backend Completo - Frontend Pendiente
