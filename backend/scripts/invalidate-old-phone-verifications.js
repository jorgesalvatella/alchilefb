/**
 * Script para invalidar todas las verificaciones de teléfono existentes
 *
 * ⚠️ IMPORTANTE: Este script debe ejecutarse UNA SOLA VEZ después de desplegar
 * el nuevo sistema de verificación con Firebase Phone Authentication
 *
 * Contexto:
 * - El sistema anterior solo mostraba códigos en pantalla (no verificaba teléfonos reales)
 * - El nuevo sistema envía SMS reales con Firebase Phone Auth
 * - Por seguridad, invalidamos todas las verificaciones anteriores
 *
 * Uso:
 *   node backend/scripts/invalidate-old-phone-verifications.js
 *
 * Resultado esperado:
 * - Todos los usuarios con phoneVerified=true serán marcados como phoneVerified=false
 * - Se agregará el flag requiresReVerification=true
 * - El frontend mostrará un banner pidiendo re-verificación
 */

const admin = require('firebase-admin');
const path = require('path');

// Inicializar Firebase Admin
const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
}

const db = admin.firestore();

async function invalidateOldVerifications() {
  console.log('🔄 Iniciando invalidación de verificaciones antiguas...\n');

  try {
    // Obtener todos los usuarios con phoneVerified=true
    const usersSnapshot = await db.collection('users')
      .where('phoneVerified', '==', true)
      .get();

    if (usersSnapshot.empty) {
      console.log('✅ No se encontraron usuarios con phoneVerified=true');
      console.log('✨ Nada que hacer. Script completado.');
      return;
    }

    console.log(`📊 Encontrados ${usersSnapshot.size} usuarios con phoneVerified=true\n`);
    console.log('⚠️  Estos usuarios deberán re-verificar su teléfono con SMS\n');

    // Preguntar confirmación
    console.log('❓ ¿Deseas continuar? Esta acción NO se puede revertir.');
    console.log('   Para continuar, ejecuta el script con el flag --confirm:\n');
    console.log('   node backend/scripts/invalidate-old-phone-verifications.js --confirm\n');

    // Verificar si se pasó el flag --confirm
    const hasConfirmFlag = process.argv.includes('--confirm');

    if (!hasConfirmFlag) {
      console.log('❌ Script cancelado. Agrega --confirm para ejecutar.\n');
      process.exit(0);
    }

    console.log('✅ Flag --confirm detectado. Procediendo...\n');

    // Procesar en batches de 500 (límite de Firestore)
    const batchSize = 500;
    let processedCount = 0;
    let batch = db.batch();

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();

      batch.update(doc.ref, {
        phoneVerified: false,
        phoneVerifiedAt: null,
        requiresReVerification: true,
        invalidatedAt: admin.firestore.FieldValue.serverTimestamp(),
        invalidationReason: 'migration_to_firebase_phone_auth',
      });

      processedCount++;

      // Commit cada 500 documentos
      if (processedCount % batchSize === 0) {
        await batch.commit();
        console.log(`   ✓ Procesados ${processedCount}/${usersSnapshot.size} usuarios...`);
        batch = db.batch(); // Crear nuevo batch
      }
    }

    // Commit final si quedaron documentos
    if (processedCount % batchSize !== 0) {
      await batch.commit();
    }

    console.log(`\n✅ Total procesado: ${processedCount} usuarios`);
    console.log('\n📝 Cambios aplicados:');
    console.log('   - phoneVerified: true → false');
    console.log('   - phoneVerifiedAt: [fecha] → null');
    console.log('   - requiresReVerification: true (nuevo campo)');
    console.log('   - invalidatedAt: [timestamp actual]');
    console.log('   - invalidationReason: "migration_to_firebase_phone_auth"');

    console.log('\n🎯 Próximos pasos:');
    console.log('   1. Los usuarios verán un banner al iniciar sesión');
    console.log('   2. Al intentar hacer un pedido, se les pedirá re-verificar');
    console.log('   3. Recibirán un SMS real con el código de verificación');
    console.log('   4. Una vez verificado, requiresReVerification se marcará como false');

    console.log('\n✨ Script completado exitosamente!\n');

  } catch (error) {
    console.error('\n❌ Error durante la invalidación:', error);
    console.error('\nDetalles del error:', error.message);
    process.exit(1);
  }
}

// Ejecutar script
invalidateOldVerifications()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
