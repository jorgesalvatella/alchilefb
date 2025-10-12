# Guía de Testing: Cobertura Total con Jest y Playwright

## 🎯 Estrategia: Cobertura Total

Nuestra estrategia de calidad se basa en usar la herramienta adecuada para cada tarea, combinando tests de integración con Jest y tests E2E con Playwright para alcanzar una cobertura del 100%.

### Tests de Integración (Jest)
Cubren la **lógica de negocio crítica** y el renderizado de componentes de forma aislada.

**Ejecutar:**
```bash
npm test
```

**Qué prueban:**
- ✅ Lógica de negocio (parsing, validación, cálculos)
- ✅ Renderizado de componentes
- ✅ Estados de carga y errores
- ✅ APIs con mocks

### Tests E2E (Playwright)
Cubren los **flujos de usuario completos** en un navegador real, probando interacciones complejas de UI que son imposibles de verificar en JSDOM.

**Instalar (primera vez):**
```bash
npm install -D @playwright/test
npx playwright install
```

**Ejecutar:**
```bash
# Con interfaz visual (RECOMENDADO)
npx playwright test --ui
```

**Qué prueban:**
- ✅ Dropdowns en cascada (Radix UI)
- ✅ Portals y animaciones
- ✅ Navegación entre páginas
- ✅ Upload de archivos real
- ✅ Flujos completos de usuario

**Ejemplo:** `e2e/sale-product-form.spec.ts`
- Selecciona Unidad de Negocio → Departamento → Categoría
- Llena todos los campos del formulario
- Sube una imagen
- Verifica cálculos de rentabilidad
- Crea el producto y redirige

---

## 📊 ¿Cuándo usar cada tipo?

| Escenario | Jest | Playwright |
|-----------|:----:|:----------:|
| Parsing de datos | ✅ | ❌ |
| Validación de formularios | ✅ | ❌ |
| Cálculos (rentabilidad) | ✅ | ❌ |
| API responses mockadas | ✅ | ❌ |
| **Radix UI Select cascadas** | ❌ | ✅ |
| Navegación completa | ❌ | ✅ |
| Upload de archivos real | ❌ | ✅ |
| Autenticación Firebase | ❌ | ✅ |

---

## 🚀 Flujo de Desarrollo

### 1. Desarrollar Feature Nueva

```bash
# 1. Escribir código
# 2. Escribir tests de integración (Jest)
npm test -- --watch

# 3. Verificar cobertura
npm test -- --coverage
```

### 2. Antes de Hacer PR

```bash
# Ejecutar TODOS los tests Jest
npm test

# Ejecutar tests E2E críticos
npx playwright test e2e/sale-product-form.spec.ts
```

### 3. Antes de Deploy a Producción

```bash
# Todos los tests Jest
npm test

# Todos los tests E2E en 3 navegadores
npx playwright test

# Ver reporte
npx playwright show-report
```

---

## 🎓 Ejemplos de Tests

### Jest - Test de Integración

```typescript
// sale-product-form.integration.test.tsx
describe('SaleProductForm - Integration Tests', () => {
  it('parses ingredientesBase string into array', async () => {
    const user = userEvent.setup();
    render(<SaleProductForm product={mockProduct} />);

    const input = screen.getByLabelText(/Ingredientes Base/i);
    await user.type(input, 'Carne, Cebolla, Cilantro');

    await user.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => {
      const postCall = mockFetch.mock.calls.find(call =>
        call[1]?.method === 'PUT'
      );
      const data = JSON.parse(postCall[1].body);
      expect(data.ingredientesBase).toEqual(['Carne', 'Cebolla', 'Cilantro']);
    });
  });
});
```

### Playwright - Test E2E

```typescript
// e2e/sale-product-form.spec.ts
test('should select hierarchical dropdowns and create product', async ({ page }) => {
  await page.goto('/control/productos-venta/nuevo');

  // 1. Seleccionar Unidad de Negocio
  await page.click('button[role="combobox"]').first();
  await page.waitForSelector('[role="option"]', { state: 'visible' });
  await page.locator('[role="option"]').first().click();

  // 2. Seleccionar Departamento
  const departmentCombobox = page.locator('button[role="combobox"]').nth(1);
  await expect(departmentCombobox).toBeEnabled({ timeout: 5000 });
  await departmentCombobox.click();
  await page.locator('[role="option"]').first().click();

  // 3. Seleccionar Categoría
  const categoryCombobox = page.locator('button[role="combobox"]').nth(2);
  await expect(categoryCombobox).toBeEnabled({ timeout: 5000 });
  await categoryCombobox.click();
  await page.locator('[role="option"]').first().click();

  // 4. Llenar campos y submit
  await page.fill('input[name="name"]', 'Test Product');
  await page.fill('input[name="price"]', '99.99');
  await page.click('button[type="submit"]');

  // 5. Verificar redirección
  await expect(page).toHaveURL(/\/control\/productos-venta/, { timeout: 10000 });
});
```

---

## 🐛 Troubleshooting

### Tests de Jest fallan

```bash
# Limpiar caché
npm test -- --clearCache

# Ver salida completa
npm test -- --verbose

# Test específico
npm test -- --testNamePattern="nombre del test"
```

### Tests de Playwright fallan

```bash
# Reinstalar navegadores
npx playwright install --force

# Modo debug (paso a paso)
npx playwright test --debug

# Ver screenshots de fallos
ls playwright-report/
```

### "Unable to find element"

**Jest**: Usa `screen.debug()` para ver el DOM actual
```typescript
await waitFor(() => {
  screen.debug(); // Ver qué hay en el DOM
  expect(screen.getByText('Expected')).toBeInTheDocument();
});
```

**Playwright**: Usa `page.screenshot()` para capturar el estado
```typescript
await page.screenshot({ path: 'debug.png', fullPage: true });
```

---

## 🔥 Lecciones Aprendidas: Playwright con Firebase Auth

### Problema #1: Login con Firebase Auth

**NO usar** `storageState` con Firebase Auth:
```typescript
// ❌ NO FUNCIONA - Firebase usa IndexedDB que storageState no captura
setup('auth', async ({ page }) => {
  await page.goto('/login');
  await page.fill('email', 'test@test.com');
  await page.click('submit');
  await page.context().storageState({ path: 'auth.json' });
});
```

**✅ SOLUCIÓN**: Login en cada test
```typescript
async function loginAsTestUser(page) {
  await page.goto('/ingresar');
  await page.fill('input[name="email"]', 'test@test.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/', { timeout: 30000 });

  // Esperar a Firebase IndexedDB
  await page.waitForFunction(() => {
    return new Promise((resolve) => {
      const request = indexedDB.open('firebaseLocalStorageDb');
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
          resolve(false);
          return;
        }
        const tx = db.transaction(['firebaseLocalStorage'], 'readonly');
        const store = tx.objectStore('firebaseLocalStorage');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result && req.result.length > 0);
        req.onerror = () => resolve(false);
      };
      request.onerror = () => resolve(false);
    });
  }, { timeout: 15000 });

  await page.waitForTimeout(1000);
}

test.beforeEach(async ({ page }) => {
  await loginAsTestUser(page);
});
```

### Problema #2: Radix UI Select (Dropdowns en cascada)

**Los portals necesitan tiempo para cerrar** antes de abrir el siguiente:

```typescript
// ✅ Patrón correcto
await combobox.click();
await page.waitForSelector('[role="option"]', { state: 'visible' });
await page.locator('[role="option"]').first().click();
await page.waitForSelector('[role="option"]', { state: 'hidden' }); // Esperar cierre

await page.waitForTimeout(500); // Delay para Radix UI

await nextCombobox.click();
await page.waitForSelector('[role="option"]', { state: 'visible' });
```

### Problema #3: Datos de prueba

Los tests E2E dependen de **datos reales**. Asegúrate de:

1. Tener datos seed en tu base de datos
2. Seleccionar IDs/nombres conocidos que tienen relaciones:

```typescript
// ❌ Puede fallar si el primero no tiene departamentos
await page.locator('[role="option"]').first().click();

// ✅ Seleccionar uno que SABEMOS que funciona
await page.locator('[role="option"]:has-text("logiav1-2")').click();
```

### Problema #4: Timeouts generosos

E2E involucra red, Firebase Auth, rendering. Usa timeouts grandes:

```typescript
// Login redirect
await expect(page).toHaveURL('/', { timeout: 30000 }); // 30s

// Dropdowns cargando datos de API
await expect(combobox).toBeEnabled({ timeout: 10000 }); // 10s

// Opciones apareciendo
await page.waitForSelector('[role="option"]', {
  state: 'visible',
  timeout: 5000
}); // 5s
```

### Navegadores soportados

**Estado actual del proyecto**:
- ✅ **Chromium**: 6/6 tests pasan (25.7s)
- ⏸️ **Firefox**: Deshabilitado (problema con Firebase Auth redirect)
- ⏸️ **WebKit**: Deshabilitado (dependencias del sistema en WSL)

Safari en iOS/iPadOS **SÍ funcionará** en producción. Los problemas son solo del entorno de testing.

---

## 📈 Métricas de Éxito

### Jest (CI - cada commit)
- ✅ 0 tests fallidos
- ✅ Cobertura > 80% en código crítico
- ✅ Tiempo < 5 segundos por suite

### Playwright (Pre-deploy)
- ✅ Tests E2E pasan en Chromium (mínimo requerido)
- ✅ Capturas de pantalla en fallos guardadas
- ✅ Tiempo ~25 segundos para 6 tests completos
- ℹ️ Firefox/WebKit: En investigación (opcional)

---

## 📚 Recursos

- **AGENTS.md**: Documentación completa de Vanguard (agente de testing)
- **Jest docs**: https://jestjs.io/
- **React Testing Library**: https://testing-library.com/react
- **Playwright docs**: https://playwright.dev/

---

**Última actualización**: Enero 2025
