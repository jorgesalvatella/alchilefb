const admin = require('firebase-admin');
const { initializeApp, applicationDefault } = require('firebase-admin/app');

initializeApp({
  credential: applicationDefault(),
  projectId: 'studio-9824031244-700aa',
});

const db = admin.firestore();

async function findAndHardDeleteCorruptOrders() {
  console.log('Buscando pedidos corruptos (createdAt o deliveredAt inválidos) para eliminación permanente...');
  const ordersRef = db.collection('pedidos');
  const corruptOrderIds = [];

  try {
    const snapshot = await ordersRef.get();
    if (snapshot.empty) {
      console.log('No se encontraron pedidos.');
      return;
    }

    const batch = db.batch();

    snapshot.forEach(doc => {
      const data = doc.data();
      const createdAt = data.createdAt;
      const deliveredAt = data.deliveredAt;

      let isCorrupt = false;
      let reason = '';

      // Check createdAt (must exist and be a timestamp)
      if (!createdAt || !(createdAt.toDate instanceof Function)) {
        isCorrupt = true;
        reason = `createdAt inválido: ${JSON.stringify(createdAt)}`;
      }
      
      // Check deliveredAt (only if it exists and is invalid)
      if (deliveredAt && !(deliveredAt.toDate instanceof Function)) {
        isCorrupt = true;
        reason = `deliveredAt inválido: ${JSON.stringify(deliveredAt)}`;
      }

      if (isCorrupt) {
        console.log(`--> Encontrado pedido corrupto: ${doc.id}. Razón: ${reason}. Marcado para eliminación.`);
        corruptOrderIds.push(doc.id);
        batch.delete(doc.ref);
      }
    });

    if (corruptOrderIds.length > 0) {
      await batch.commit();
      console.log(`✅ Éxito: Se eliminaron permanentemente ${corruptOrderIds.length} pedidos corruptos.`);
      console.log('IDs eliminados:', corruptOrderIds.join(', '));
    } else {
      console.log('✅ No se encontraron pedidos corruptos.');
    }

  } catch (error) {
    console.error('Ocurrió un error durante la limpieza de pedidos:', error);
  }
}

findAndHardDeleteCorruptOrders();
