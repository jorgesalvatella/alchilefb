const admin = require('firebase-admin');
const { applicationDefault } = require('firebase-admin/app');

// Inicializar Firebase Admin si no está inicializado
if (!admin.apps.length) {
  admin.initializeApp({
    credential: applicationDefault(),
    projectId: 'studio-9824031244-700aa',
  });
}

async function setRepartidorClaim(uid) {
  try {
    // Obtener los claims actuales del usuario
    const user = await admin.auth().getUser(uid);
    const currentClaims = user.customClaims || {};

    // Agregar el claim de repartidor manteniendo los existentes
    await admin.auth().setCustomUserClaims(uid, {
      ...currentClaims,
      repartidor: true
    });

    console.log(`✅ Custom claim 'repartidor' asignado a usuario ${uid}`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`⚠️  El usuario debe cerrar sesión y volver a iniciar para que el claim tome efecto`);

    // Mostrar todos los claims actuales
    const updatedUser = await admin.auth().getUser(uid);
    console.log(`📋 Claims actuales:`, updatedUser.customClaims);

  } catch (error) {
    console.error('❌ Error al asignar claim:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

async function removeRepartidorClaim(uid) {
  try {
    const user = await admin.auth().getUser(uid);
    const currentClaims = user.customClaims || {};

    // Remover el claim de repartidor
    delete currentClaims.repartidor;

    await admin.auth().setCustomUserClaims(uid, currentClaims);

    console.log(`✅ Custom claim 'repartidor' removido del usuario ${uid}`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`📋 Claims restantes:`, currentClaims);

  } catch (error) {
    console.error('❌ Error al remover claim:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

// Uso: node setRepartidorClaim.js <uid> [--remove]
const args = process.argv.slice(2);
const uid = args[0];
const remove = args.includes('--remove');

if (!uid) {
  console.error('❌ Debes proporcionar el UID del usuario');
  console.log('\nUso:');
  console.log('  Asignar claim:  node setRepartidorClaim.js <uid>');
  console.log('  Remover claim:  node setRepartidorClaim.js <uid> --remove');
  console.log('\nEjemplo:');
  console.log('  node setRepartidorClaim.js abc123def456');
  process.exit(1);
}

if (remove) {
  removeRepartidorClaim(uid);
} else {
  setRepartidorClaim(uid);
}
