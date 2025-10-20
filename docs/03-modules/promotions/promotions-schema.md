# Esquema de Datos: Colección `promotions`

**Última actualización:** Enero 2025
**Responsable:** Pyra (Arquitecto de Firebase)
**Revisado por:** Raptoure (Seguridad)

---

## Estructura General

```typescript
interface Promotion {
  // === Campos Comunes (Todos los tipos) ===
  name: string;
  description: string;
  type: 'package' | 'promotion';
  isActive: boolean;
  categoryId?: string;            // Opcional: ID de categoría para mostrar en menú (auto-asignado)
  startDate?: Timestamp;          // Opcional: fecha de inicio
  endDate?: Timestamp;            // Opcional: fecha de fin
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;    // Soft delete

  // === Campos Condicionales ===
  // Si type === 'package':
  packagePrice?: number;          // Precio fijo del paquete
  packageItems?: PackageItem[];   // Array de productos incluidos
  imagePath?: string;             // Ruta en Firebase Storage (ej: "paquetes/123456-imagen.jpg")

  // Si type === 'promotion':
  promoType?: 'percentage' | 'fixed_amount';
  promoValue?: number;            // Valor del descuento
  appliesTo?: 'product' | 'category' | 'total_order';
  targetIds?: string[];           // IDs de productos/categorías afectadas
  // Las promociones usan la imagen del producto, no necesitan imagePath propia
}

interface PackageItem {
  productId: string;              // ⚠️ IMPORTANTE: Referencia a productosDeVenta existente
  name: string;                   // Denormalizado para performance
  quantity: number;               // Cantidad de este producto en el paquete
  // NOTA: El inventario se descuenta del producto original (productId),
  // NO se crea un nuevo producto. Los paquetes son solo "combos" virtuales.
}
```

---

## Ejemplos de Documentos

### Ejemplo 1: Paquete (Package)

```json
{
  "name": "Paquete Familiar",
  "description": "3 hamburguesas + 2 papas grandes + 4 refrescos",
  "type": "package",
  "isActive": true,
  "startDate": null,
  "endDate": null,
  "packagePrice": 350.00,
  "packageItems": [
    {
      "productId": "prod_hamburguesa_clasica",
      "name": "Hamburguesa Clásica",
      "quantity": 3
    },
    {
      "productId": "prod_papas_grandes",
      "name": "Papas Grandes",
      "quantity": 2
    },
    {
      "productId": "prod_refresco_500ml",
      "name": "Refresco 500ml",
      "quantity": 4
    }
  ],
  "createdAt": "2025-01-17T10:00:00Z",
  "updatedAt": "2025-01-17T10:00:00Z",
  "deletedAt": null
}
```

### Ejemplo 2: Promoción de Porcentaje en Categoría

```json
{
  "name": "20% OFF en Bebidas",
  "description": "Descuento del 20% en todas las bebidas durante enero",
  "type": "promotion",
  "isActive": true,
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-01-31T23:59:59Z",
  "promoType": "percentage",
  "promoValue": 20,
  "appliesTo": "category",
  "targetIds": ["cat_bebidas"],
  "createdAt": "2025-01-01T10:00:00Z",
  "updatedAt": "2025-01-01T10:00:00Z",
  "deletedAt": null
}
```

### Ejemplo 3: Promoción de Monto Fijo en Producto Específico

```json
{
  "name": "$50 de descuento en Pizza Grande",
  "description": "Ahorra $50 pesos en cualquier pizza grande",
  "type": "promotion",
  "isActive": true,
  "promoType": "fixed_amount",
  "promoValue": 50,
  "appliesTo": "product",
  "targetIds": ["prod_pizza_grande_pepperoni", "prod_pizza_grande_hawaiana"],
  "createdAt": "2025-01-10T10:00:00Z",
  "updatedAt": "2025-01-10T10:00:00Z",
  "deletedAt": null
}
```

### Ejemplo 4: Promoción de Descuento en Total del Pedido

```json
{
  "name": "10% OFF en compras mayores a $500",
  "description": "Descuento del 10% en el total de tu pedido si supera los $500",
  "type": "promotion",
  "isActive": true,
  "promoType": "percentage",
  "promoValue": 10,
  "appliesTo": "total_order",
  "targetIds": [],
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z",
  "deletedAt": null
}
```

---

## Reglas de Negocio

### Para Paquetes (`type: 'package'`)

1. **Personalización de Productos**:
   - Los clientes pueden agregar/quitar extras de los productos incluidos en el paquete
   - El `packagePrice` es fijo, pero los extras se cobran aparte
   - Ejemplo: Paquete $250 + Extra queso $15 = Total $265

2. **Cálculo de Precio**:
   ```
   Total del Paquete = packagePrice + Σ(precio de extras agregados)
   ```

3. **Validaciones**:
   - Todos los `productId` en `packageItems` deben existir en `productosDeVenta`
   - Los productos no deben estar eliminados (`deletedAt === null`)
   - `packagePrice` debe ser mayor a 0

### Para Promociones (`type: 'promotion'`)

1. **Aplicación de Descuentos**:
   - `promoType: 'percentage'`: Descuento del X% sobre el precio base
   - `promoType: 'fixed_amount'`: Descuento de $X pesos

2. **Alcance del Descuento**:
   - `appliesTo: 'product'`: Se aplica solo a productos específicos en `targetIds`
   - `appliesTo: 'category'`: Se aplica a todos los productos de categorías en `targetIds`
   - `appliesTo: 'total_order'`: Se aplica al total del pedido (sin necesidad de `targetIds`)

3. **Validaciones**:
   - Si `appliesTo !== 'total_order'`, `targetIds` no puede estar vacío
   - `promoValue` debe ser > 0
   - Si `promoType === 'percentage'`, `promoValue` debe ser <= 100
   - `startDate` y `endDate` son opcionales pero si existen, `endDate > startDate`

### Reglas Generales

1. **Soft Deletes**:
   - Nunca eliminar documentos físicamente
   - Usar `deletedAt: Timestamp` para marcar como eliminado
   - Queries deben filtrar por `deletedAt === null`

2. **Fechas de Vigencia**:
   - Si `startDate` o `endDate` son `null`, la promoción no tiene límite temporal
   - El backend debe validar que `Date.now()` esté entre `startDate` y `endDate`

3. **Estado Activo/Inactivo**:
   - `isActive: false` desactiva temporalmente la oferta
   - Solo ofertas con `isActive === true` y `deletedAt === null` se muestran públicamente

4. **Categorías y Visualización en Menú**:
   - Se crean automáticamente dos categorías especiales: "Paquetes" y "Promociones"
   - Cada paquete/promoción se auto-asigna a su categoría correspondiente vía `categoryId`
   - Estas categorías solo sirven para **visualización** en el menú público
   - **NO afectan el inventario** (ver sección de Inventario abajo)

### Gestión de Inventario

⚠️ **MUY IMPORTANTE**: Los paquetes y promociones **NO crean nuevos productos**

**Cómo funciona:**

1. **Productos Base**:
   - Los productos (hamburguesas, bebidas, etc.) ya existen en `productosDeVenta`
   - Cada producto tiene su propia categoría original (ej: "Hamburguesas", "Bebidas")
   - El inventario vive en los productos originales

2. **Paquetes**:
   - Un paquete referencia productos existentes mediante `packageItems[].productId`
   - Cuando se vende un paquete, el inventario se descuenta de los productos originales
   - Ejemplo: "Paquete Familiar" con 3 hamburguesas → descuenta 3 unidades del producto "Hamburguesa Clásica"

3. **Promociones**:
   - Las promociones no son productos, son descuentos que se aplican automáticamente
   - Se aplican sobre productos existentes vía `targetIds`
   - No afectan el inventario directamente, solo el precio

**Flujo de Venta de Paquete:**
```javascript
// Paquete vendido:
{
  type: "package",
  packageItems: [
    { productId: "prod_hamburguesa", quantity: 3 },
    { productId: "prod_papas", quantity: 2 }
  ]
}

// Inventario descontado:
productosDeVenta/prod_hamburguesa: stock -= 3
productosDeVenta/prod_papas: stock -= 2
```

**Por qué esta arquitectura:**
- ✅ Inventario centralizado y consistente
- ✅ Evita duplicación de productos
- ✅ Facilita control de stock
- ✅ Los productos en paquetes comparten el mismo inventario que productos unitarios

---

## Índices Recomendados en Firestore

Para optimizar las queries:

```javascript
// Índice compuesto para listar ofertas activas
promotions.where('isActive', '==', true)
  .where('deletedAt', '==', null)
  .orderBy('createdAt', 'desc')

// Índice: isActive ASC, deletedAt ASC, createdAt DESC

// Índice para filtrar por tipo
promotions.where('type', '==', 'package')
  .where('deletedAt', '==', null)

// Índice: type ASC, deletedAt ASC
```

---

## Queries Comunes

### Backend (Admin)

```javascript
// Listar todas las promociones activas (admin)
const snapshot = await db.collection('promotions')
  .where('deletedAt', '==', null)
  .orderBy('createdAt', 'desc')
  .get();

// Listar solo paquetes
const packages = await db.collection('promotions')
  .where('type', '==', 'package')
  .where('deletedAt', '==', null)
  .get();
```

### Frontend (Público)

```javascript
// Obtener ofertas activas para mostrar en el menú
const activeOffers = await db.collection('promotions')
  .where('isActive', '==', true)
  .where('deletedAt', '==', null)
  .get();

// Filtrar por vigencia en el cliente
const now = new Date();
const validOffers = activeOffers.docs.filter(doc => {
  const data = doc.data();
  if (!data.startDate && !data.endDate) return true;
  if (data.startDate && now < data.startDate.toDate()) return false;
  if (data.endDate && now > data.endDate.toDate()) return false;
  return true;
});
```

---

## Consideraciones de Seguridad (Revisado por Raptoure)

✅ **Validaciones Backend**:
- Todos los campos deben validarse en el servidor antes de guardar
- Nunca confiar en datos del cliente para cálculos de precios
- Verificar que `productId` existan y no estén eliminados

✅ **Firestore Rules** (ver siguiente sección):
- Solo admins pueden crear/editar/eliminar
- Usuarios pueden leer solo ofertas activas y no eliminadas

✅ **Cálculos de Precio**:
- Siempre re-verificar precios en el backend durante checkout
- Nunca aceptar totales calculados por el cliente

---

## Próximos Pasos

1. ✅ Esquema definido
2. ⏳ Actualizar `firestore.rules` con Pyra
3. ⏳ Auditoría de seguridad con Raptoure
4. ⏳ Implementar endpoints CRUD con Nexus
