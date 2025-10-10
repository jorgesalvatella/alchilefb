const admin = require('firebase-admin');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'studio-9824031244-700aa',
  storageBucket: 'studio-9824031244-700aa.firebasestorage.app',
});

(async () => {
  try {
    console.log('🔍 Verificando Firebase Storage...\n');

    const bucket = admin.storage().bucket();
    console.log('✅ Bucket encontrado:', bucket.name);

    // Intentar verificar que existe
    const [exists] = await bucket.exists();

    if (exists) {
      console.log('✅ Firebase Storage está CONFIGURADO y FUNCIONANDO');
      console.log('\n📦 Bucket:', bucket.name);
      console.log('🌐 URL base:', `https://storage.googleapis.com/${bucket.name}/`);

      // Listar algunos archivos como prueba
      const [files] = await bucket.getFiles({ maxResults: 5 });
      console.log(`\n📁 Archivos recientes (${files.length}):`);
      files.forEach(file => console.log(`  - ${file.name}`));
    } else {
      console.log('❌ El bucket existe pero no está accesible');
    }

  } catch (error) {
    console.log('❌ Firebase Storage NO está configurado correctamente');
    console.log('\n📋 Error:', error.message);
    console.log('\n🔧 Verifica:');
    console.log('   1. Que el bucket esté habilitado en Firebase Console');
    console.log('   2. Que el nombre del bucket sea exacto');
    console.log('   3. Que tengas permisos de acceso');
    console.log('\n🌐 Firebase Console:');
    console.log('   https://console.firebase.google.com/project/studio-9824031244-700aa/storage');
  } finally {
    process.exit(0);
  }
})();
