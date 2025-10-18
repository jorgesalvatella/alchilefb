# TODO: Tests Pendientes para Al Chile FB

**Última actualización:** 18 de Enero, 2025
**Estado:** 📋 Backlog de Testing

---

## 📊 Resumen de Cobertura Actual

### Tests Existentes ✅
- `/backend/promotions.test.js` - Tests de endpoints de promociones (parcial)
- `/backend/cart-promotions.test.js` - Tests de carrito con promociones (fallando)
- `/backend/cart.test.js` - Tests básicos de carrito
- `/backend/pedidos.test.js` - Tests de pedidos
- `/backend/categorias-venta.test.js` - Tests de categorías
- `/backend/productos-venta.test.js` - Tests de productos
- `/backend/pedidos-control.test.js` - Tests de control de pedidos
- `/src/app/carrito/page.test.tsx` - Tests de página de carrito (frontend)
- `/src/app/menu/page.test.tsx` - Tests de página de menú (frontend)
- `/src/context/cart-context.test.tsx` - Tests de contexto de carrito

### Estado Actual
- **Backend Tests:** 12 tests fallando (de 64 totales)
- **Frontend Tests:** No ejecutados recientemente
- **Cobertura estimada:** ~60%

---

## 🔴 CRÍTICO: Tests Fallando que Deben Arreglarse

### 1. Backend - promotions.test.js

**Problema:** Mock de Firestore desactualizado
```
TypeError: snapshot.forEach is not a function
```

**Tests Fallando:**
- ✗ GET /api/promotions - should return only active and valid promotions
- ✗ GET /api/promotions - should return promotion data with correct structure
- ✗ GET /api/promotions - should handle database errors gracefully

**Acción Requerida:**
- Actualizar mocks de Firebase Admin SDK
- Asegurar que `snapshot.forEach` esté mockeado correctamente
- Validar estructura de respuesta del endpoint

**Archivo:** `/backend/promotions.test.js`
**Prioridad:** 🔴 ALTA

---

### 2. Backend - cart-promotions.test.js

**Problema:** Descuentos aplicándose incorrectamente (10% extra)
```
Expected: 200
Received: 180
Expected difference: < 0.005
Received difference: 20
```

**Tests Fallando (12 tests):**
- ✗ Normal products - should calculate totals correctly without promotions
- ✗ Normal products - should calculate with customizations correctly
- ✗ Category-based percentage discount (20% on bebidas)
- ✗ Product-based fixed discount ($50 on pizza)
- ✗ Discount with extras added
- ✗ Should NOT apply inactive promotions
- ✗ Should NOT apply expired promotions
- ✗ Should NOT apply future promotions
- ✗ Multiple promotions on same product (should use best)
- ✗ Packages - should calculate package price correctly
- ✗ Packages - should add package customization costs
- ✗ Packages - should reject invalid package ID

**Causa Sospechada:**
El backend está aplicando un descuento automático del 10% que no debería aplicarse.

**Acción Requerida:**
- Revisar lógica de aplicación de promociones en `/backend/cart.js`
- Verificar que las promociones solo se apliquen cuando corresponda
- Ajustar los valores esperados en los tests si el descuento es intencional
- Documentar política de descuentos si existe un "descuento base"

**Archivo:** `/backend/cart-promotions.test.js`
**Prioridad:** 🔴 CRÍTICA (bloquea funcionalidad de carrito)

---

## 🟡 ALTA PRIORIDAD: Tests Faltantes para Funcionalidad Nueva

### 3. Frontend - Paquetes en Menú

**Descripción:**
Tests para verificar que los paquetes se muestren correctamente en la página del menú.

**Tests Requeridos:**
```typescript
describe('Menu Page - Packages', () => {
  it('should display packages in the menu', async () => {
    // Mock GET /api/promotions con paquetes
    // Verificar que PackageCard se renderiza
  });

  it('should show package price and items', () => {
    // Verificar que se muestra packagePrice
    // Verificar que se listan packageItems
  });

  it('should display package image with correct sizes', () => {
    // Verificar sizes="(max-width: 768px) 100vw, ..."
    // Verificar aspect-square
  });

  it('should add package to cart when clicking "Añadir al Carrito"', () => {
    // Simular click
    // Verificar que addItem se llama con isPackage: true
  });

  it('should not display expired packages', () => {
    // Mock paquete con endDate pasado
    // Verificar que no se renderiza
  });

  it('should not display inactive packages', () => {
    // Mock paquete con isActive: false
    // Verificar que no se renderiza
  });
});
```

**Archivo a crear:** `/src/app/menu/packages.test.tsx`
**Prioridad:** 🟡 ALTA

---

### 4. Frontend - Carrito con Paquetes

**Descripción:**
Tests para verificar que el carrito maneja correctamente tanto productos como paquetes.

**Tests Requeridos:**
```typescript
describe('Cart Page - Packages Support', () => {
  it('should display package items in cart with correct image', () => {
    // Mock cartItems con paquete
    // Verificar que la imagen se muestra (imageUrl no undefined)
    // Verificar sizes="80px"
  });

  it('should send packageId to verify-totals endpoint', async () => {
    // Mock cartItems con paquete
    // Interceptar POST /api/cart/verify-totals
    // Verificar que el body contiene { packageId, quantity, packageCustomizations }
  });

  it('should send productId for normal products to verify-totals', async () => {
    // Mock cartItems con producto normal
    // Verificar que el body contiene { productId, quantity, customizations }
  });

  it('should handle mixed cart (products + packages)', async () => {
    // Mock cartItems con ambos tipos
    // Verificar que ambos formatos se envían correctamente
  });

  it('should calculate package total correctly with customizations', () => {
    // Mock paquete con customizaciones
    // Verificar que el precio incluye extras
  });

  it('should update package quantity correctly', () => {
    // Simular incrementar/decrementar cantidad
    // Verificar que se actualiza correctamente
  });

  it('should remove package from cart', () => {
    // Simular click en botón eliminar
    // Verificar que el paquete se elimina
  });
});
```

**Archivo a modificar:** `/src/app/carrito/page.test.tsx`
**Prioridad:** 🟡 ALTA

---

### 5. Backend - Pedidos con Paquetes

**Descripción:**
Tests para verificar que los pedidos se crean correctamente con paquetes.

**Tests Requeridos:**
```javascript
describe('POST /api/pedidos - Packages Support', () => {
  it('should create order with only packages', async () => {
    const orderData = {
      items: [
        { id: 'pkg-1', isPackage: true, quantity: 2, price: 150, customizations: {} }
      ],
      shippingAddress: { /* ... */ },
      paymentMethod: 'cash'
    };

    const response = await request(app)
      .post('/api/pedidos')
      .set('Authorization', 'Bearer valid-token')
      .send(orderData);

    expect(response.status).toBe(201);
    expect(response.body.items).toHaveLength(1);
  });

  it('should create order with products and packages', async () => {
    const orderData = {
      items: [
        { id: 'prod-1', quantity: 1, price: 50, customizations: { added: [], removed: [] } },
        { id: 'pkg-1', isPackage: true, quantity: 1, price: 150, customizations: {} }
      ],
      shippingAddress: { /* ... */ },
      paymentMethod: 'card'
    };

    const response = await request(app)
      .post('/api/pedidos')
      .set('Authorization', 'Bearer valid-token')
      .send(orderData);

    expect(response.status).toBe(201);
    expect(response.body.items).toHaveLength(2);
  });

  it('should verify package totals before creating order', async () => {
    // Mock verifyCartTotals
    // Verificar que se llama con packageId
    // Verificar que el total verificado se guarda en el pedido
  });

  it('should reject order with invalid packageId', async () => {
    const orderData = {
      items: [
        { id: 'invalid-pkg', isPackage: true, quantity: 1, price: 150 }
      ],
      shippingAddress: { /* ... */ },
      paymentMethod: 'cash'
    };

    const response = await request(app)
      .post('/api/pedidos')
      .set('Authorization', 'Bearer valid-token')
      .send(orderData);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('no encontrado');
  });
});
```

**Archivo a modificar:** `/backend/pedidos.test.js`
**Prioridad:** 🟡 ALTA

---

### 6. Frontend - Formulario de Promociones (Editar)

**Descripción:**
Tests para verificar que el formulario de edición de promociones funciona correctamente.

**Tests Requeridos:**
```typescript
describe('Promotion Form - Edit Mode', () => {
  it('should load existing promotion data correctly', () => {
    // Mock promoción existente
    // Verificar que los campos se llenan correctamente
  });

  it('should convert ISO dates to yyyy-MM-dd format', () => {
    const promotion = {
      startDate: '2025-10-18T00:00:00.000Z',
      endDate: '2025-12-31T00:00:00.000Z'
    };

    // Renderizar formulario
    // Verificar que los inputs muestran '2025-10-18' y '2025-12-31'
  });

  it('should handle promotions without dates', () => {
    const promotion = {
      name: 'Promo sin fechas',
      startDate: null,
      endDate: null
    };

    // Verificar que no hay errores
    // Verificar que los inputs están vacíos
  });

  it('should update promotion on submit', async () => {
    // Mock PUT /api/control/promotions/:id
    // Simular cambios en el formulario
    // Simular submit
    // Verificar que se envía PUT con datos correctos
  });

  it('should upload and display package image', async () => {
    // Mock upload de imagen
    // Verificar que StorageImage se muestra
    // Verificar preview de imagen
  });
});
```

**Archivo a crear:** `/src/components/control/promotion-form.test.tsx`
**Prioridad:** 🟡 ALTA

---

## 🟢 MEDIA PRIORIDAD: Tests de Optimizaciones

### 7. Frontend - Performance de Imágenes

**Descripción:**
Tests para verificar que las imágenes usan los `sizes` correctos.

**Tests Requeridos:**
```typescript
describe('StorageImage - Sizes Optimization', () => {
  it('should use custom sizes prop when provided', () => {
    const { container } = render(
      <StorageImage
        filePath="test.jpg"
        alt="Test"
        fill
        sizes="80px"
      />
    );

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('sizes', '80px');
  });

  it('should use default 100vw when sizes not provided', () => {
    const { container } = render(
      <StorageImage
        filePath="test.jpg"
        alt="Test"
        fill
      />
    );

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('sizes', '100vw');
  });

  it('should use responsive sizes in menu cards', () => {
    // Verificar ProductCard usa sizes responsivo
    // Verificar PackageCard usa sizes responsivo
  });

  it('should use fixed sizes in cart thumbnails', () => {
    // Verificar que carrito usa sizes="80px"
  });
});
```

**Archivo a crear:** `/src/components/StorageImage.test.tsx`
**Prioridad:** 🟢 MEDIA

---

### 8. Frontend - Formato Cuadrado de Imágenes

**Descripción:**
Tests para verificar que todas las imágenes usan `aspect-square`.

**Tests Requeridos:**
```typescript
describe('Image Consistency - Square Format', () => {
  it('ProductCard should render images with aspect-square', () => {
    // Verificar clase aspect-square en ProductCard
  });

  it('PackageCard should render images with aspect-square', () => {
    // Verificar clase aspect-square en PackageCard
  });

  it('Cart thumbnails should be square (h-20 w-20)', () => {
    // Verificar dimensiones en carrito
  });

  it('ProductSkeleton should use aspect-square', () => {
    // Verificar skeleton loader
  });

  it('Images should use objectFit contain to avoid cropping', () => {
    // Verificar objectFit="contain" en todos los lugares
  });
});
```

**Archivo a crear:** `/src/components/__tests__/image-consistency.test.tsx`
**Prioridad:** 🟢 MEDIA

---

## 🔵 BAJA PRIORIDAD: Tests de Edge Cases

### 9. Backend - Validaciones de Seguridad de Raptoure

**Descripción:**
Tests completos para todas las validaciones de seguridad del módulo de promociones.

**Tests Requeridos:**
```javascript
describe('Promotions Security - Raptoure Validations', () => {
  describe('Package productId Validation', () => {
    it('should reject package with non-existent productId', async () => {
      // Test validación CRÍTICA de Raptoure
    });

    it('should reject package with deleted product', async () => {
      // Test producto con deletedAt !== null
    });
  });

  describe('Date Validation', () => {
    it('should reject endDate before startDate', async () => {
      // Test validación ALTA de Raptoure
    });

    it('should allow promotions without dates', async () => {
      // Promociones permanentes
    });
  });

  describe('Discount Validation', () => {
    it('should reject percentage discount > 100%', async () => {
      // Test validación ALTA de Raptoure
    });

    it('should reject percentage discount < 0%', async () => {
      // Descuentos negativos
    });

    it('should reject negative fixed discount', async () => {
      // Test validación ALTA de Raptoure
    });
  });

  describe('TargetIds Validation', () => {
    it('should reject product promotion with empty targetIds', async () => {
      // Test validación MEDIO de Raptoure
    });

    it('should reject category promotion with non-existent category', async () => {
      // Test validación MEDIO de Raptoure
    });

    it('should reject product promotion with deleted product', async () => {
      // Test validación MEDIO de Raptoure
    });

    it('should allow total_order promotion without targetIds', async () => {
      // Caso válido
    });
  });
});
```

**Archivo a crear:** `/backend/promotions-security.test.js`
**Prioridad:** 🔵 BAJA (ya validado manualmente)

---

### 10. Backend - Soft Delete

**Descripción:**
Tests para verificar que el soft delete funciona correctamente.

**Tests Requeridos:**
```javascript
describe('Promotions - Soft Delete', () => {
  it('should set deletedAt instead of actually deleting', async () => {
    // DELETE /api/control/promotions/:id
    // Verificar que el documento sigue existiendo
    // Verificar que deletedAt !== null
  });

  it('should also set isActive to false on delete', async () => {
    // Verificar que isActive: false después de delete
  });

  it('should not show deleted promotions in public endpoint', async () => {
    // GET /api/promotions
    // Verificar que promociones con deletedAt !== null no aparecen
  });

  it('should show deleted promotions in admin endpoint', async () => {
    // GET /api/control/promotions
    // Verificar que admins ven promociones eliminadas
  });
});
```

**Archivo a crear:** `/backend/promotions-soft-delete.test.js`
**Prioridad:** 🔵 BAJA

---

### 11. Frontend - Contexto de Carrito con Paquetes

**Descripción:**
Tests del contexto de carrito para verificar manejo de paquetes.

**Tests Requeridos:**
```typescript
describe('CartContext - Packages', () => {
  it('should add package to cart with isPackage flag', () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: CartProvider
    });

    act(() => {
      result.current.addItem({
        id: 'pkg-1',
        name: 'Paquete Familiar',
        price: 150,
        quantity: 1,
        isPackage: true,
        packageItems: [/* ... */]
      });
    });

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].isPackage).toBe(true);
  });

  it('should persist packages to localStorage', () => {
    // Verificar que paquetes se guardan en localStorage
    // Verificar que se cargan correctamente al recargar
  });

  it('should not merge packages with different customizations', () => {
    // Agregar mismo paquete con diferentes customizaciones
    // Verificar que se agregan como items separados
  });
});
```

**Archivo a modificar:** `/src/context/cart-context.test.tsx`
**Prioridad:** 🔵 BAJA

---

## 📋 Plan de Acción Sugerido

### Sprint 1: Arreglar Tests Fallando (Semana 1)
1. ✅ Arreglar mocks de Firebase en `promotions.test.js`
2. ✅ Investigar y arreglar descuentos del 10% en `cart-promotions.test.js`
3. ✅ Verificar que todos los tests existentes pasen

### Sprint 2: Tests de Funcionalidad Nueva (Semana 2)
4. ✅ Tests de paquetes en menú
5. ✅ Tests de carrito con paquetes
6. ✅ Tests de pedidos con paquetes
7. ✅ Tests de formulario de promociones

### Sprint 3: Tests de Optimizaciones (Semana 3)
8. ✅ Tests de performance de imágenes
9. ✅ Tests de formato cuadrado
10. ✅ Tests de componente StorageImage

### Sprint 4: Tests de Edge Cases (Semana 4)
11. ✅ Tests de validaciones de seguridad
12. ✅ Tests de soft delete
13. ✅ Tests de contexto de carrito

---

## 🎯 Métricas de Éxito

### Objetivo de Cobertura
- **Backend:** 90% de cobertura
- **Frontend:** 85% de cobertura
- **Crítico:** 100% de tests pasando

### KPIs
- 0 tests fallando
- Tiempo de ejecución < 30 segundos
- Tests estables (no flaky)

---

## 📚 Recursos

### Herramientas
- Jest (backend y frontend)
- React Testing Library (frontend)
- Supertest (backend API testing)
- Firebase Emulator Suite (para tests de integración)

### Documentación
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Supertest](https://github.com/ladjs/supertest)
- [Firebase Emulator](https://firebase.google.com/docs/emulator-suite)

---

**Última revisión:** 18 de Enero, 2025
**Próxima revisión:** Después de Sprint 1
