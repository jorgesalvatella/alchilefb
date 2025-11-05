const admin = require('firebase-admin');
const { applicationDefault } = require('firebase-admin/app');

admin.initializeApp({
  credential: applicationDefault(),
  projectId: 'studio-9824031244-700aa',
});

const uid = 'IDACCQXPoahKVi2eKnwIfi9f05G3';

async function fixUserClaims() {
  try {
    console.log('🔄 Iniciando proceso de corrección...\n');

    // 1. Revocar todos los tokens existentes
    console.log('1️⃣ Revocando tokens existentes del usuario...');
    await admin.auth().revokeRefreshTokens(uid);
    console.log('   ✅ Tokens revocados\n');

    // 2. Re-asignar el custom claim
    console.log('2️⃣ Re-asignando custom claims...');
    await admin.auth().setCustomUserClaims(uid, {
      super_admin: true,
      admin: true
    });
    console.log('   ✅ Claims asignados: super_admin=true, admin=true\n');

    // 3. Verificar que se asignó correctamente
    console.log('3️⃣ Verificando claims...');
    const user = await admin.auth().getUser(uid);
    console.log('   Usuario:', user.email);
    console.log('   Custom Claims:', JSON.stringify(user.customClaims, null, 2));
    console.log('');

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ ¡PROCESO COMPLETADO!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('📋 PASOS A SEGUIR EN EL NAVEGADOR:');
    console.log('');
    console.log('1. Abre la consola del navegador (F12)');
    console.log('');
    console.log('2. Ejecuta este comando para cerrar sesión:');
    console.log('   firebase.auth().signOut().then(() => window.location.href = "/ingresar")');
    console.log('');
    console.log('3. Vuelve a iniciar sesión con: jorgesalvatella22@alchile.com');
    console.log('');
    console.log('4. Ve a /control para ver el dashboard');
    console.log('');
    console.log('═══════════════════════════════════════════════════════');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixUserClaims();
