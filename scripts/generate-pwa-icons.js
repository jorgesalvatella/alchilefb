#!/usr/bin/env node

/**
 * Script para generar todos los iconos PWA desde logo-source.png
 *
 * Genera:
 * - Iconos PWA (72, 96, 128, 144, 152, 192, 384, 512)
 * - Apple Touch Icons (152, 180)
 * - Favicons (16, 32)
 */

const fs = require('fs');
const path = require('path');

// Verificar si sharp está disponible
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('❌ Error: El paquete "sharp" no está instalado.');
  console.error('📦 Instalando sharp...\n');

  const { execSync } = require('child_process');
  try {
    execSync('npm install --save-dev sharp', { stdio: 'inherit' });
    sharp = require('sharp');
    console.log('\n✅ Sharp instalado correctamente\n');
  } catch (installError) {
    console.error('❌ Error al instalar sharp:', installError.message);
    process.exit(1);
  }
}

const LOGO_SOURCE = path.join(__dirname, '../public/logo-source.png');
const ICONS_DIR = path.join(__dirname, '../public/icons');
const PUBLIC_DIR = path.join(__dirname, '../public');

// Verificar que existe el logo fuente
if (!fs.existsSync(LOGO_SOURCE)) {
  console.error('❌ Error: No se encuentra public/logo-source.png');
  console.error('📋 Por favor, coloca tu logo PNG en: public/logo-source.png');
  process.exit(1);
}

// Crear directorio de iconos si no existe
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Definir todos los tamaños a generar
const PWA_ICONS = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
];

const APPLE_ICONS = [
  { size: 152, name: 'apple-touch-icon-152x152.png' },
  { size: 180, name: 'apple-touch-icon-180x180.png' },
  { size: 180, name: 'apple-touch-icon.png' }, // Default apple touch icon
];

const FAVICONS = [
  { size: 16, name: 'favicon-16x16.png', dir: PUBLIC_DIR },
  { size: 32, name: 'favicon-32x32.png', dir: PUBLIC_DIR },
];

async function generateIcon(size, outputPath) {
  try {
    await sharp(LOGO_SOURCE)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Fondo transparente
      })
      .png()
      .toFile(outputPath);

    return true;
  } catch (error) {
    console.error(`❌ Error generando ${path.basename(outputPath)}:`, error.message);
    return false;
  }
}

async function generateAllIcons() {
  console.log('🎨 Generando iconos PWA desde logo-source.png...\n');

  let successCount = 0;
  let failCount = 0;

  // Generar iconos PWA
  console.log('📱 Generando iconos PWA:');
  for (const { size, name } of PWA_ICONS) {
    const outputPath = path.join(ICONS_DIR, name);
    const success = await generateIcon(size, outputPath);

    if (success) {
      console.log(`  ✅ ${name} (${size}x${size})`);
      successCount++;
    } else {
      failCount++;
    }
  }

  // Generar Apple Touch Icons
  console.log('\n🍎 Generando Apple Touch Icons:');
  for (const { size, name } of APPLE_ICONS) {
    const outputPath = path.join(ICONS_DIR, name);
    const success = await generateIcon(size, outputPath);

    if (success) {
      console.log(`  ✅ ${name} (${size}x${size})`);
      successCount++;
    } else {
      failCount++;
    }
  }

  // Generar Favicons
  console.log('\n🔖 Generando Favicons:');
  for (const { size, name, dir } of FAVICONS) {
    const outputPath = path.join(dir || ICONS_DIR, name);
    const success = await generateIcon(size, outputPath);

    if (success) {
      console.log(`  ✅ ${name} (${size}x${size})`);
      successCount++;
    } else {
      failCount++;
    }
  }

  // Resumen
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Iconos generados exitosamente: ${successCount}`);
  if (failCount > 0) {
    console.log(`❌ Iconos fallidos: ${failCount}`);
  }
  console.log('='.repeat(50));
  console.log('\n📂 Ubicación: public/icons/\n');

  if (successCount > 0) {
    console.log('🎉 ¡Iconos PWA generados correctamente!');
    console.log('📋 Próximo paso: Actualizar manifest.json\n');
  }
}

// Ejecutar
generateAllIcons().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
