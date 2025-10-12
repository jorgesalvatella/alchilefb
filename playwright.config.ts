import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para tests E2E
 *
 * Para instalar:
 * npm install -D @playwright/test
 * npx playwright install
 *
 * Para ejecutar:
 * npx playwright test
 * npx playwright test --ui (modo interactivo)
 * npx playwright test --headed (ver el navegador)
 */

export default defineConfig({
  testDir: './e2e',

  /* Timeout máximo por test */
  timeout: 30 * 1000,

  /* Configuración de expect */
  expect: {
    timeout: 5000
  },

  /* Ejecutar tests en paralelo */
  fullyParallel: true,

  /* Fallar el build si dejas test.only en el código */
  forbidOnly: !!process.env.CI,

  /* Reintentos en CI */
  retries: process.env.CI ? 2 : 0,

  /* Workers: usa todos los cores disponibles */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter */
  reporter: 'html',

  /* Configuración compartida para todos los proyectos */
  use: {
    /* URL base para usar en page.goto('/') */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:9002',

    /* Capturar trace solo cuando falla */
    trace: 'on-first-retry',

    /* Screenshot solo cuando falla */
    screenshot: 'only-on-failure',

    /* Video solo cuando falla */
    video: 'retain-on-failure',
  },

  /* Configurar proyectos para diferentes navegadores */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Firefox deshabilitado temporalmente: el login de Firebase Auth no funciona correctamente
    // TODO: Investigar por qué Firebase Auth no redirige después del login en Firefox
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // WebKit deshabilitado: requiere dependencias del sistema que no están disponibles en WSL
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Tests en mobile */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  /* Ejecutar dev server antes de los tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:9002',
    reuseExistingServer: true,  // Reutilizar servidor ya corriendo
    timeout: 120 * 1000,
  },
});
