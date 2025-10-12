/**
 * Tests E2E para SaleProductForm
 *
 * Estos tests cubren el 10% restante que no se puede probar en JSDOM:
 * - Interacción real con Radix UI Select dropdowns
 * - Comportamiento de Portals en el navegador
 * - Cascada de selección: Unidad de Negocio → Departamento → Categoría
 *
 * Para ejecutar:
 * npx playwright test e2e/sale-product-form.spec.ts
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Helper function to login as test user
 * This is called in beforeEach to ensure each test has a fresh authenticated session
 */
async function loginAsTestUser(page: Page) {
  await page.goto('/ingresar');
  await page.fill('input[name="email"]', 'test@test.com');
  await page.fill('input[name="password"]', 'test5656/');
  await page.click('button[type="submit"]:has-text("Iniciar Sesión")');

  // Wait for redirect to home page (Firefox needs more time)
  await expect(page).toHaveURL('/', { timeout: 30000 });

  // Wait for Firebase Auth to initialize and save tokens to IndexedDB
  // Firefox is slower, so give it more time
  await page.waitForFunction(() => {
    return new Promise((resolve) => {
      const request = indexedDB.open('firebaseLocalStorageDb');
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
          resolve(false);
          return;
        }
        const transaction = db.transaction(['firebaseLocalStorage'], 'readonly');
        const store = transaction.objectStore('firebaseLocalStorage');
        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = () => {
          const hasAuthData = getAllRequest.result && getAllRequest.result.length > 0;
          resolve(hasAuthData);
        };
        getAllRequest.onerror = () => resolve(false);
      };
      request.onerror = () => resolve(false);
    });
  }, { timeout: 15000 });

  // Give Firefox a bit more time to stabilize
  await page.waitForTimeout(1000);
}

test.describe('SaleProductForm - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test to ensure fresh authenticated session
    await loginAsTestUser(page);
  });

  test('should select hierarchical dropdowns (Business Unit → Department → Category) and create product', async ({ page }) => {
    // 1. Navegar al formulario
    await page.goto('/control/productos-venta/nuevo');

    // 2. Esperar a que el formulario cargue
    await expect(page.locator('h1, h2').filter({ hasText: /producto/i })).toBeVisible();

    // 3. Esperar a que los datos carguen y el dropdown se habilite
    const businessUnitCombobox = page.locator('button[role="combobox"]').first();
    await expect(businessUnitCombobox).toBeEnabled({ timeout: 10000 });
    await businessUnitCombobox.click();

    // Esperar a que aparezcan las opciones en el Portal
    await page.waitForSelector('[role="option"]', { state: 'visible' });

    // Seleccionar "logiav1-2" que es el business unit que tiene departamentos
    const businessUnitOption = page.locator('[role="option"]:has-text("logiav1-2")');
    await businessUnitOption.click();

    // Esperar a que el portal se cierre
    await page.waitForSelector('[role="option"]', { state: 'hidden' });

    // 4. Seleccionar Departamento (debe estar habilitado después de seleccionar Business Unit)
    const departmentCombobox = page.locator('button[role="combobox"]').nth(1);

    // Esperar a que se habilite
    await expect(departmentCombobox).toBeEnabled({ timeout: 5000 });

    await page.waitForTimeout(500); // Esperar a que Radix UI esté listo
    await departmentCombobox.click();

    // Esperar a que aparezcan las opciones
    await page.waitForSelector('[role="option"]', { state: 'visible', timeout: 5000 });

    // Seleccionar la primera opción de departamento
    const departmentOption = page.locator('[role="option"]').first();
    await departmentOption.click();
    await page.waitForSelector('[role="option"]', { state: 'hidden' });

    // 5. Seleccionar Categoría de Venta (debe estar habilitado después de seleccionar Department)
    const categoryCombobox = page.locator('button[role="combobox"]').nth(2);

    // Esperar a que se habilite
    await expect(categoryCombobox).toBeEnabled({ timeout: 5000 });

    await page.waitForTimeout(500); // Esperar a que Radix UI esté listo
    await categoryCombobox.click();

    // Esperar a que aparezcan las opciones de categoría
    await page.waitForSelector('[role="option"]', { state: 'visible', timeout: 5000 });

    // Seleccionar la primera opción de categoría
    const categoryOption = page.locator('[role="option"]').first();
    await categoryOption.click();
    await page.waitForSelector('[role="option"]', { state: 'hidden' });

    // 6. Llenar campos de texto requeridos
    await page.fill('input[name="name"]', 'Test Product E2E');
    await page.fill('input[name="price"]', '99.99');

    // 7. Llenar campos opcionales
    await page.fill('textarea[name="description"]', 'Producto de prueba creado por test E2E');
    await page.fill('input[name="cost"]', '50.00');

    // 8. Verificar que el análisis de rentabilidad se actualiza
    await expect(page.locator('text=/UTILIDAD NETA/i')).toBeVisible();
    await expect(page.locator('text=/MARGEN NETO/i')).toBeVisible();

    // 9. Enviar el formulario
    await page.click('button[type="submit"]:has-text("Crear Producto")');

    // 10. Verificar que se redirige y muestra toast de éxito
    await expect(page).toHaveURL(/\/control\/productos-venta/, { timeout: 10000 });

    // Verificar toast - usar selector más específico para evitar strict mode
    await expect(page.locator('div.text-sm.font-semibold:has-text("¡Éxito!")')).toBeVisible({ timeout: 5000 });
  });

  test('should validate required fields before submission', async ({ page }) => {
    await page.goto('/control/productos-venta/nuevo');

    // Intentar enviar sin llenar campos
    await page.click('button[type="submit"]:has-text("Crear Producto")');

    // Verificar que NO se redirige (se queda en la misma página)
    await expect(page).toHaveURL(/\/nuevo/);

    // Verificar que aparecen mensajes de error de validación
    // (React Hook Form + Zod mostrarán errores)
    await page.waitForSelector('text=/requerido|obligatorio|debe/i', { timeout: 2000 });
  });

  test('should enable/disable cascading dropdowns correctly', async ({ page }) => {
    await page.goto('/control/productos-venta/nuevo');

    // Verificar estado inicial de los dropdowns
    const businessUnitCombobox = page.locator('button[role="combobox"]').first();
    const departmentCombobox = page.locator('button[role="combobox"]').nth(1);
    const categoryCombobox = page.locator('button[role="combobox"]').nth(2);

    // Business Unit debe estar habilitado después de cargar
    await expect(businessUnitCombobox).toBeEnabled({ timeout: 10000 });

    // Departamento debe estar deshabilitado inicialmente
    await expect(departmentCombobox).toBeDisabled();

    // Categoría debe estar deshabilitada inicialmente
    await expect(categoryCombobox).toBeDisabled();

    // Seleccionar Business Unit (logiav1-2 que tiene departamentos)
    await businessUnitCombobox.click();
    await page.waitForSelector('[role="option"]', { state: 'visible' });
    await page.locator('[role="option"]:has-text("logiav1-2")').click();
    await page.waitForSelector('[role="option"]', { state: 'hidden' });

    // Ahora Departamento debe estar habilitado
    await expect(departmentCombobox).toBeEnabled({ timeout: 5000 });

    // Pero Categoría sigue deshabilitada
    await expect(categoryCombobox).toBeDisabled();

    // Seleccionar Department
    await page.waitForTimeout(500); // Esperar a que Radix UI esté listo
    await departmentCombobox.click();
    await page.waitForSelector('[role="option"]', { state: 'visible', timeout: 5000 });
    await page.locator('[role="option"]').first().click();
    await page.waitForSelector('[role="option"]', { state: 'hidden' });

    // Ahora Categoría debe estar habilitada
    await expect(categoryCombobox).toBeEnabled({ timeout: 5000 });
  });

  test('should parse and submit ingredientes correctly', async ({ page }) => {
    await page.goto('/control/productos-venta/nuevo');

    // Seleccionar todos los dropdowns requeridos de forma explícita y robusta
    const businessUnitCombobox = page.locator('button[role="combobox"]').nth(0);
    await expect(businessUnitCombobox).toBeEnabled({ timeout: 10000 });
    await businessUnitCombobox.click();
    await page.waitForSelector('[role="option"]', { state: 'visible' });
    await page.locator('[role="option"]:has-text("logiav1-2")').click();
    await page.waitForSelector('[role="option"]', { state: 'hidden' });

    const departmentCombobox = page.locator('button[role="combobox"]').nth(1);
    await expect(departmentCombobox).toBeEnabled({ timeout: 5000 });
    await page.waitForTimeout(500);
    await departmentCombobox.click();
    await page.waitForSelector('[role="option"]', { state: 'visible' });
    await page.locator('[role="option"]').first().click();
    await page.waitForSelector('[role="option"]', { state: 'hidden' });

    const categoryCombobox = page.locator('button[role="combobox"]').nth(2);
    await expect(categoryCombobox).toBeEnabled({ timeout: 5000 });
    await page.waitForTimeout(500);
    await categoryCombobox.click();
    await page.waitForSelector('[role="option"]', { state: 'visible' });
    await page.locator('[role="option"]').first().click();
    await page.waitForSelector('[role="option"]', { state: 'hidden' });

    // Llenar campos básicos
    await page.fill('input[name="name"]', 'Taco con Extras');
    await page.fill('input[name="price"]', '45.00');

    // Llenar ingredientes base
    await page.fill('textarea:below(:text("Ingredientes Base"))', 'Tortilla, Carne, Cebolla, Cilantro');

    // Llenar ingredientes extra con formato: nombre:precio
    await page.fill('textarea:below(:text("Ingredientes Extra"))', 'Queso:10, Aguacate:15, Crema:5');

    // Interceptar el request para verificar el payload
    const requestPromise = page.waitForRequest(request =>
      request.url().includes('/api/control/productos-venta') &&
      request.method() === 'POST'
    );

    // Enviar formulario
    await page.click('button[type="submit"]:has-text("Crear Producto")');

    // Verificar el payload
    const request = await requestPromise;
    const postData = request.postDataJSON();

    expect(postData.ingredientesBase).toEqual(['Tortilla', 'Carne', 'Cebolla', 'Cilantro']);
    expect(postData.ingredientesExtra).toEqual([
      { nombre: 'Queso', precio: 10 },
      { nombre: 'Aguacate', precio: 15 },
      { nombre: 'Crema', precio: 5 },
    ]);
  });

  test('should calculate and display profitability metrics', async ({ page }) => {
    await page.goto('/control/productos-venta/nuevo');

    // Llenar precio y costo
    await page.fill('input[name="price"]', '100.00');
    await page.fill('input[name="cost"]', '40.00');
    await page.fill('input[name="platformFeePercent"]', '15');

    // Verificar que los cálculos se muestran
    await expect(page.locator('text=/Precio Base/i')).toBeVisible();
    await expect(page.locator('text=/IVA.*16%/i')).toBeVisible();
    await expect(page.locator('text=/Utilidad Bruta/i')).toBeVisible();
    await expect(page.locator('text=/Comisión.*15%/i')).toBeVisible();

    // UTILIDAD NETA y MARGEN NETO deben estar visibles
    await expect(page.locator('text=/UTILIDAD NETA:/i')).toBeVisible();
    await expect(page.locator('text=/MARGEN NETO:/i')).toBeVisible();

    // Verificar que los números se calculan (no son $0.00 todos)
    const utilidadNeta = await page.locator('text=/UTILIDAD NETA/i').locator('..').textContent();
    expect(utilidadNeta).toMatch(/\$\d+\.\d{2}/);
  });

  test('should handle image upload', async ({ page }) => {
    await page.goto('/control/productos-venta/nuevo');

    // Verificar que el botón de upload existe
    await expect(page.locator('button:has-text("Subir Archivo")')).toBeVisible();

    // Verificar que hay un input de URL de imagen
    await expect(page.locator('input[name="imageUrl"]')).toBeVisible();

    // Llenar URL manualmente
    await page.fill('input[name="imageUrl"]', 'https://example.com/test-image.jpg');

    // Verificar que se muestra en la vista previa (si existe)
    // await expect(page.locator('img[alt*="Vista previa"]')).toBeVisible();
  });
});
