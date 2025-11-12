/**
 * Script para resetear el rate limiting de verificación de teléfono
 *
 * Uso:
 *   node backend/scripts/reset-rate-limit.js <userId>
 *
 * Ejemplo:
 *   node backend/scripts/reset-rate-limit.js abc123xyz
 *
 * ⚠️ IMPORTANTE: Solo usar para testing/debugging
 */

const admin = require('firebase-admin');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const path = require('path');
const fs = require('fs');

// Inicializar Firebase Admin
const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
const useGcloudAuth = !fs.existsSync(serviceAccountPath);

if (!admin.apps.length) {
  if (useGcloudAuth) {
    // Usar Application Default Credentials (gcloud auth)
    initializeApp({
      credential: applicationDefault(),
      projectId: 'studio-9824031244-700aa',
    });
  } else {
    // Usar Service Account Key
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });
  }
}

const db = admin.firestore();

async function resetRateLimit(userId) {
  if (!userId) {
    console.error('❌ Error: Debes proporcionar un userId');
    console.log('\nUso:');
    console.log('  node backend/scripts/reset-rate-limit.js <userId>');
    console.log('\nEjemplo:');
    console.log('  node backend/scripts/reset-rate-limit.js abc123xyz\n');
    process.exit(1);
  }

  console.log(`🔄 Reseteando rate limiting para usuario: ${userId}\n`);

  try {
    const attemptDocRef = db.collection('phoneVerificationAttempts').doc(userId);
    const attemptDoc = await attemptDocRef.get();

    if (!attemptDoc.exists) {
      console.log('ℹ️  No existe documento de rate limiting para este usuario');
      console.log('✅ El usuario puede generar códigos sin restricciones\n');
      process.exit(0);
    }

    const data = attemptDoc.data();
    console.log('📊 Estado actual:');
    console.log(`   - Intentos: ${data.attempts}`);
    console.log(`   - Último intento: ${data.lastAttempt.toDate().toLocaleString()}`);
    console.log(`   - Se resetea: ${data.resetAt.toDate().toLocaleString()}\n`);

    // Eliminar el documento (resetea completamente)
    await attemptDocRef.delete();

    console.log('✅ Rate limiting reseteado exitosamente!');
    console.log('🎯 El usuario ahora tiene 3 intentos disponibles\n');

  } catch (error) {
    console.error('❌ Error reseteando rate limiting:', error.message);
    process.exit(1);
  }
}

// Obtener userId del argumento de línea de comandos
const userId = process.argv[2];

resetRateLimit(userId)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
