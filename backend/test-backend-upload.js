const admin = require('firebase-admin');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');

// Inicializar con el bucket CORRECTO
initializeApp({
  credential: applicationDefault(),
  projectId: 'studio-9824031244-700aa',
  storageBucket: 'studio-9824031244-700aa.firebasestorage.app',
});

(async () => {
  try {
    console.log('🧪 Probando upload a Firebase Storage...\n');
    
    const bucket = getStorage().bucket();
    console.log('📦 Bucket:', bucket.name);
    
    // Crear un archivo de prueba
    const testContent = 'Este es un archivo de prueba desde el backend';
    const timestamp = new Date().getTime();
    const fileName = 'test-' + timestamp + '.txt';
    const fileRef = bucket.file('tax_ids/' + fileName);
    
    console.log('📤 Subiendo archivo:', fileName);
    
    await fileRef.save(Buffer.from(testContent), {
      metadata: { contentType: 'text/plain' },
    });
    
    console.log('✅ Archivo subido con éxito!');
    
    // Hacer público
    await fileRef.makePublic();
    console.log('✅ Archivo hecho público');
    
    const publicUrl = 'https://storage.googleapis.com/' + bucket.name + '/' + fileRef.name;
    console.log('\n🌐 URL pública:', publicUrl);
    console.log('\n✅✅✅ TODO FUNCIONA CORRECTAMENTE ✅✅✅');
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  } finally {
    process.exit(0);
  }
})();
