import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // 1. Navegar a la página de login
  await page.goto('/ingresar');

  // 2. Rellenar las credenciales (usar selectores con name)
  await page.fill('input[name="email"]', 'test@test.com');
  await page.fill('input[name="password"]', 'test5656/');

  // 3. Hacer clic en el botón de inicio de sesión
  await page.click('button[type="submit"]:has-text("Iniciar Sesión")');

  // 4. Esperar la redirección a la página principal (Firebase es asíncrono, darle más tiempo)
  await expect(page).toHaveURL('/', { timeout: 20000 });

  // 5. Esperar a que Firebase Auth guarde el usuario en IndexedDB
  // Verificar que el usuario esté autenticado esperando a que aparezca algo solo visible para usuarios autenticados
  await page.waitForFunction(() => {
    // Verificar que Firebase haya guardado datos de autenticación en IndexedDB
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

  // 6. Darle un segundo adicional para que todo se estabilice
  await page.waitForTimeout(2000);

  // 7. Guardar el estado de la sesión en el archivo de autenticación
  await page.context().storageState({ path: authFile });
});
