const admin = require('firebase-admin');
const { initializeApp, applicationDefault } = require('firebase-admin/app');

console.log('🔍 Diagnóstico del Backend\n');

try {
  console.log('1. Inicializando Firebase Admin SDK...');
  initializeApp({
    credential: applicationDefault(),
    projectId: 'studio-9824031244-700aa',
    storageBucket: 'studio-9824031244-700aa.firebasestorage.app',
  });
  console.log('✅ Firebase Admin SDK inicializado correctamente\n');

  console.log('2. Probando conexión a Firestore...');
  const db = admin.firestore();

  (async () => {
    try {
      const snapshot = await db.collection('businessUnits')
        .where('deleted', '==', false)
        .get();

      console.log(`✅ Consulta exitosa: ${snapshot.size} unidades de negocio encontradas\n`);

      if (!snapshot.empty) {
        console.log('📋 Primeras unidades de negocio:');
        snapshot.forEach((doc, index) => {
          if (index < 3) {
            console.log(`  - ${doc.id}: ${doc.data().name}`);
          }
        });
      }

      process.exit(0);
    } catch (error) {
      console.error('❌ Error en consulta de Firestore:', error.message);
      console.error('Stack:', error.stack);
      process.exit(1);
    }
  })();

} catch (error) {
  console.error('❌ Error inicializando Firebase:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
