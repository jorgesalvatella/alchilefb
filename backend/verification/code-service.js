const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Servicio de Códigos de Verificación
 * Genera y valida códigos OTP para verificación de teléfono
 */

/**
 * Genera un código de verificación aleatorio de 6 dígitos
 * @returns {string} Código de 6 dígitos (ej: "123456")
 */
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Crea un nuevo código de verificación para el usuario
 * Invalida todos los códigos anteriores del usuario antes de crear uno nuevo
 *
 * @param {string} userId - UID del usuario
 * @param {string} phoneNumber - Número de teléfono (+52XXXXXXXXXX)
 * @returns {Promise<{code: string, expiresAt: Date, codeId: string}>}
 */
async function createVerificationCode(userId, phoneNumber) {
  const code = generateCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutos

  // Invalidar códigos anteriores del usuario que no estén verificados
  const oldCodesSnapshot = await db.collection('verificationCodes')
    .where('userId', '==', userId)
    .where('verified', '==', false)
    .where('invalidated', '==', false)
    .get();

  // Usar batch para invalidar todos los códigos anteriores
  if (!oldCodesSnapshot.empty) {
    const batch = db.batch();
    oldCodesSnapshot.forEach(doc => {
      batch.update(doc.ref, { invalidated: true });
    });
    await batch.commit();
  }

  // Crear nuevo código
  const codeRef = await db.collection('verificationCodes').add({
    userId,
    phoneNumber,
    code,
    attempts: 0,
    verified: false,
    invalidated: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt)
  });

  return {
    code,
    expiresAt,
    codeId: codeRef.id
  };
}

/**
 * Obtiene el código de verificación activo del usuario
 * Un código activo es aquel que no ha expirado, no está verificado y no está invalidado
 *
 * @param {string} userId - UID del usuario
 * @returns {Promise<{code: string, expiresAt: Date, attempts: number, codeId: string} | null>}
 */
async function getActiveCode(userId) {
  const now = admin.firestore.Timestamp.now();

  const snapshot = await db.collection('verificationCodes')
    .where('userId', '==', userId)
    .where('verified', '==', false)
    .where('invalidated', '==', false)
    .where('expiresAt', '>', now)
    .orderBy('expiresAt', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  return {
    code: data.code,
    expiresAt: data.expiresAt.toDate(),
    attempts: data.attempts,
    codeId: doc.id
  };
}

/**
 * Verifica el código ingresado por el usuario
 * Valida que el código sea correcto, no haya expirado y no exceda los intentos permitidos
 *
 * @param {string} userId - UID del usuario
 * @param {string} code - Código ingresado por el usuario (6 dígitos)
 * @returns {Promise<{success: boolean, error?: string, attemptsRemaining?: number}>}
 */
async function verifyCode(userId, code) {
  const activeCode = await getActiveCode(userId);

  if (!activeCode) {
    return {
      success: false,
      error: 'no_active_code',
      message: 'No hay un código activo. Genera uno nuevo.'
    };
  }

  const codeRef = db.collection('verificationCodes').doc(activeCode.codeId);
  const codeDoc = await codeRef.get();
  const codeData = codeDoc.data();

  // Verificar si ya se excedieron los intentos
  if (codeData.attempts >= 3) {
    // Invalidar el código
    await codeRef.update({ invalidated: true });
    return {
      success: false,
      error: 'max_attempts_exceeded',
      message: 'Has excedido el número máximo de intentos. Genera un nuevo código.'
    };
  }

  // Verificar si el código es correcto
  // Normalizar ambos códigos: trim y convertir a string
  const normalizedCode = String(code).trim();
  const normalizedStoredCode = String(codeData.code).trim();

  if (normalizedStoredCode !== normalizedCode) {
    // Incrementar intentos
    const newAttempts = codeData.attempts + 1;
    await codeRef.update({ attempts: newAttempts });

    // Log para debugging
    console.log('Code comparison failed:', {
      received: normalizedCode,
      stored: normalizedStoredCode,
      receivedLength: normalizedCode.length,
      storedLength: normalizedStoredCode.length
    });

    return {
      success: false,
      error: 'invalid_code',
      message: 'Código incorrecto',
      attemptsRemaining: 3 - newAttempts
    };
  }

  // Código correcto: marcar como verificado
  await codeRef.update({
    verified: true,
    verifiedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true };
}

/**
 * Invalida manualmente un código de verificación
 * Útil para limpiar códigos o cuando el usuario solicita uno nuevo
 *
 * @param {string} codeId - ID del documento del código
 * @returns {Promise<void>}
 */
async function invalidateCode(codeId) {
  await db.collection('verificationCodes').doc(codeId).update({
    invalidated: true
  });
}

/**
 * Limpia códigos expirados (tarea de mantenimiento)
 * Elimina códigos con más de 24 horas de antigüedad
 *
 * @returns {Promise<number>} Número de códigos eliminados
 */
async function cleanupExpiredCodes() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const timestampYesterday = admin.firestore.Timestamp.fromDate(yesterday);

  const snapshot = await db.collection('verificationCodes')
    .where('createdAt', '<', timestampYesterday)
    .get();

  if (snapshot.empty) {
    return 0;
  }

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  return snapshot.size;
}

module.exports = {
  generateCode,
  createVerificationCode,
  getActiveCode,
  verifyCode,
  invalidateCode,
  cleanupExpiredCodes
};
