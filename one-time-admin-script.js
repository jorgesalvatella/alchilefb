const admin = require('firebase-admin');

// NOTA: Este script asume que se está ejecutando en un entorno de Google Cloud
// (como Cloud Shell) o que tienes las credenciales de administrador
// configuradas en tus variables de entorno locales (GOOGLE_APPLICATION_CREDENTIALS).

admin.initializeApp({
  projectId: 'studio-9824031244-700aa',
});

// --- UID del usuario a convertir en super-admin ---
const targetUid = 'IDACCQXPoahKVi2eKnwIfi9f05G3';

// Validar formato básico del UID (Firebase UIDs típicamente tienen 28 caracteres)
function isValidUid(uid) {
  return /^[a-zA-Z0-9]{1,128}$/.test(uid);
}

if (!isValidUid(targetUid)) {
  console.error('\nERROR: El UID tiene un formato inválido.');
  console.error('Los UIDs de Firebase deben contener solo caracteres alfanuméricos.\n');
  process.exit(1);
}

(async () => {
  try {
    console.log(`Asignando el claim de super-admin al usuario: ${targetUid}`);
    
    // Asigna el custom claim 'super_admin' al usuario especificado.
    await admin.auth().setCustomUserClaims(targetUid, { super_admin: true });

    console.log('\n✅ ¡Éxito!');
    console.log(`El usuario ${targetUid} ahora es super-administrador.`);
    console.log('Ahora puedes cerrar sesión y volver a iniciarla en la aplicación web para ver los cambios.');

  } catch (error) {
    console.error('\n❌ Error al asignar el custom claim:');
    console.error(`Código de error: ${error.code || 'N/A'}`);
    console.error(`Mensaje: ${error.message}`);
    
    // Mensajes de error específicos según el tipo
    if (error.code === 'auth/user-not-found') {
      console.error('\n💡 Sugerencia: El usuario no existe en Firebase Authentication.');
    } else if (error.code === 'auth/invalid-uid') {
      console.error('\n💡 Sugerencia: El UID proporcionado es inválido.');
    }
    
    process.exit(1);
  } finally {
    // Siempre cierra la conexión de Firebase
    await admin.app().delete();
    console.log('\nConexión a Firebase cerrada.');
  }
})();