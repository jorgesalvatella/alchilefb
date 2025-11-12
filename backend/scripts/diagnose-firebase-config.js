/**
 * Script de diagnóstico para verificar configuración de Firebase
 *
 * Uso:
 *   node backend/scripts/diagnose-firebase-config.js
 *
 * Verifica:
 * - Firebase Admin SDK inicializado correctamente
 * - Configuración del proyecto
 * - Conexión a Firestore
 * - Variables de entorno
 */

const admin = require('firebase-admin');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const path = require('path');
const fs = require('fs');

console.log('🔍 Diagnóstico de Firebase Configuration\n');
console.log('═'.repeat(60));

// 1. Verificar método de autenticación
console.log('\n1️⃣  Verificando método de autenticación...');
const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
const useGcloudAuth = !fs.existsSync(serviceAccountPath);

if (useGcloudAuth) {
  console.log('✅ Usando Application Default Credentials (gcloud auth)');
  console.log('   - Método: applicationDefault()');
  console.log('   - Archivo JSON: No requerido');
} else {
  console.log('✅ Usando Service Account Key');
  console.log('   - Archivo: serviceAccountKey.json');
}

// 2. Verificar gcloud auth (si corresponde)
if (useGcloudAuth) {
  console.log('\n2️⃣  Verificando gcloud authentication...');
  const { execSync } = require('child_process');

  try {
    const account = execSync('gcloud auth list --filter=status:ACTIVE --format="value(account)"', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    if (account) {
      console.log('✅ gcloud authentication activa');
      console.log(`   - Cuenta: ${account}`);
    } else {
      console.warn('⚠️  ADVERTENCIA: No se detectó cuenta activa de gcloud');
      console.log('\n💡 Para autenticar:');
      console.log('   gcloud auth application-default login\n');
    }
  } catch (error) {
    console.warn('⚠️  No se pudo verificar gcloud auth (¿gcloud instalado?)');
    console.log('   Continuando con la verificación...');
  }
}

// 3. Inicializar Firebase Admin
console.log('\n3️⃣  Inicializando Firebase Admin SDK...');
const projectId = 'studio-9824031244-700aa';

try {
  if (!admin.apps.length) {
    if (useGcloudAuth) {
      initializeApp({
        credential: applicationDefault(),
        projectId: projectId,
        storageBucket: `${projectId}.firebasestorage.app`,
      });
    } else {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  }
  console.log('✅ Firebase Admin SDK inicializado correctamente');
  console.log(`   - Project ID: ${projectId}`);
} catch (error) {
  console.error('❌ ERROR: No se pudo inicializar Firebase Admin');
  console.error(`   ${error.message}\n`);

  if (useGcloudAuth) {
    console.log('💡 Posible solución:');
    console.log('   gcloud auth application-default login\n');
  }
  process.exit(1);
}

// 4. Verificar conexión a Firestore
console.log('\n4️⃣  Verificando conexión a Firestore...');
const db = admin.firestore();

async function diagnose() {
  try {
    // Intentar leer una colección
    const testQuery = await db.collection('users').limit(1).get();
    console.log('✅ Conexión a Firestore exitosa');
    console.log(`   - Documentos encontrados: ${testQuery.size}`);
  } catch (error) {
    console.error('❌ ERROR: No se pudo conectar a Firestore');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }

  // 5. Verificar variables de entorno del frontend
  console.log('\n5️⃣  Verificando configuración del frontend...');
  const envPath = path.join(__dirname, '../../.env.local');

  if (!fs.existsSync(envPath)) {
    console.warn('⚠️  ADVERTENCIA: .env.local no encontrado');
    console.log('   Algunas configuraciones pueden faltar\n');
  } else {
    console.log('✅ .env.local encontrado');

    const envContent = fs.readFileSync(envPath, 'utf8');

    // Verificar variables importantes
    const requiredVars = [
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_RECAPTCHA_V2_SITE_KEY',
      'NEXT_PUBLIC_FCM_VAPID_KEY',
    ];

    console.log('\n   Variables de entorno:');
    requiredVars.forEach(varName => {
      const hasVar = envContent.includes(varName);
      if (hasVar) {
        // Extraer valor (sin mostrarlo completo por seguridad)
        const match = envContent.match(new RegExp(`${varName}=(.+)`));
        const value = match ? match[1].substring(0, 20) + '...' : 'presente';
        console.log(`   ✅ ${varName}: ${value}`);
      } else {
        console.log(`   ❌ ${varName}: NO ENCONTRADA`);
      }
    });
  }

  // 6. Verificar configuración de firebase/config.ts
  console.log('\n6️⃣  Verificando src/firebase/config.ts...');
  const configPath = path.join(__dirname, '../../src/firebase/config.ts');

  if (!fs.existsSync(configPath)) {
    console.error('❌ ERROR: src/firebase/config.ts no encontrado\n');
    process.exit(1);
  }

  const configContent = fs.readFileSync(configPath, 'utf8');

  // Verificar propiedades importantes
  const requiredProps = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];

  console.log('   Propiedades en firebaseConfig:');
  requiredProps.forEach(prop => {
    const hasProp = configContent.includes(`${prop}:`);
    console.log(`   ${hasProp ? '✅' : '❌'} ${prop}`);
  });

  // 7. Verificar si storageBucket está configurado
  if (!configContent.includes('storageBucket:') ||
      configContent.includes('storageBucket: ""') ||
      configContent.includes('storageBucket:""')) {
    console.warn('\n⚠️  ADVERTENCIA: storageBucket parece estar vacío');
    console.log('   Esto puede causar problemas con Phone Authentication');
    console.log(`   Valor esperado: "${projectId}.appspot.com"\n`);
  }

  // 8. Resumen
  console.log('\n' + '═'.repeat(60));
  console.log('\n📊 RESUMEN DEL DIAGNÓSTICO\n');

  console.log('Backend (Firebase Admin SDK):');
  if (useGcloudAuth) {
    console.log('  ✅ gcloud auth configurado (Application Default Credentials)');
  } else {
    console.log('  ✅ serviceAccountKey.json configurado');
  }
  console.log('  ✅ Firebase Admin SDK inicializado');
  console.log('  ✅ Conexión a Firestore funcionando');

  console.log('\nFrontend:');
  console.log('  ✅ firebase/config.ts presente');
  console.log('  ℹ️  Verificar manualmente que todas las propiedades sean correctas');

  console.log('\n🎯 PRÓXIMOS PASOS PARA RESOLVER auth/invalid-app-credential:\n');
  console.log('1. Ve a Firebase Console:');
  console.log('   https://console.firebase.google.com/project/studio-9824031244-700aa/authentication/providers');
  console.log('\n2. Habilita Phone Authentication:');
  console.log('   - Click en "Phone"');
  console.log('   - Activa el toggle');
  console.log('   - Guarda cambios');
  console.log('\n3. Agrega dominios autorizados:');
  console.log('   https://console.firebase.google.com/project/studio-9824031244-700aa/authentication/settings');
  console.log('   - Agregar: localhost');
  console.log('   - Agregar: alchilemeatballs.com');
  console.log('\n4. Reinicia el servidor de desarrollo:');
  console.log('   - Detén con Ctrl+C');
  console.log('   - Ejecuta: npm run dev');
  console.log('\n');
}

diagnose()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
