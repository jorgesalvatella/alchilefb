/**
 * Script para listar usuarios con rate limiting activo
 */

const admin = require('firebase-admin');
const { initializeApp, applicationDefault } = require('firebase-admin/app');

if (!admin.apps.length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: 'studio-9824031244-700aa',
  });
}

const db = admin.firestore();

async function getUserIds() {
  try {
    // Obtener usuarios con rate limiting activo
    const snapshot = await db.collection('phoneVerificationAttempts').get();

    if (snapshot.empty) {
      console.log('✅ No hay usuarios con rate limiting activo\n');
      return;
    }

    console.log('📊 Usuarios con rate limiting activo:\n');
    console.log('═'.repeat(60));

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const userId = doc.id;

      // Obtener info del usuario
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.exists ? userDoc.data() : {};

      console.log('\n👤 User ID:', userId);
      console.log('   Email:', userData.email || 'N/A');
      console.log('   Nombre:', userData.displayName || 'N/A');
      console.log('   📍 Intentos:', data.attempts);
      console.log('   ⏰ Resetea en:', data.resetAt.toDate().toLocaleString());
      console.log('   📅 Último intento:', data.lastAttempt.toDate().toLocaleString());
    }

    console.log('\n' + '═'.repeat(60));
    console.log('\n💡 Para resetear rate limiting de un usuario:');
    console.log('   node backend/scripts/reset-rate-limit.js <userId>\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getUserIds().then(() => process.exit(0));
