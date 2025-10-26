/**
 * OTP Service
 * Servicio para generación y validación de códigos OTP (One-Time Password)
 * Maneja la lógica de negocio de verificación de teléfonos
 */

const admin = require('firebase-admin');
const crypto = require('crypto');

class OTPService {
  constructor() {
    this.db = admin.firestore();
    this.expirationMinutes = parseInt(process.env.OTP_EXPIRATION_MINUTES) || 10;
    this.maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS) || 3;
  }

  /**
   * Genera código OTP aleatorio de 6 dígitos
   * Usa crypto para mayor seguridad que Math.random()
   * @returns {string} Código de 6 dígitos
   */
  generateCode() {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Crea y guarda un nuevo código de verificación en Firestore
   * @param {string} userId - UID del usuario en Firebase Auth
   * @param {string} phoneNumber - Número de teléfono en formato E.164 (+52XXXXXXXXXX)
   * @param {string} purpose - Propósito del código ('registration' | 'login' | 'resend')
   * @param {string} ipAddress - IP del solicitante (opcional)
   * @returns {Promise<{id: string, code: string}>}
   */
  async createVerificationCode(userId, phoneNumber, purpose = 'registration', ipAddress = null) {
    const code = this.generateCode();
    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + (this.expirationMinutes * 60 * 1000)
    );

    const docRef = await this.db.collection('verificationCodes').add({
      userId,
      phoneNumber,
      code,
      purpose,
      attempts: 0,
      verified: false,
      createdAt: now,
      expiresAt,
      ipAddress,
      userAgent: null // Se puede agregar desde el request
    });

    console.log(`[OTP] Código generado para userId: ${userId}, purpose: ${purpose}, expira: ${this.expirationMinutes} min`);

    return { id: docRef.id, code };
  }

  /**
   * Verifica si un código OTP es válido
   * @param {string} userId - UID del usuario
   * @param {string} code - Código ingresado por el usuario
   * @returns {Promise<{valid: boolean, error?: string}>}
   */
  async verifyCode(userId, code) {
    const now = admin.firestore.Timestamp.now();

    // Buscar código que coincida
    const querySnapshot = await this.db.collection('verificationCodes')
      .where('userId', '==', userId)
      .where('code', '==', code)
      .where('verified', '==', false)
      .where('expiresAt', '>', now)
      .orderBy('expiresAt', 'desc')
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      console.log(`[OTP] Código inválido o expirado para userId: ${userId}`);
      return {
        valid: false,
        error: 'Código inválido o expirado'
      };
    }

    const docRef = querySnapshot.docs[0].ref;
    const data = querySnapshot.docs[0].data();

    // Verificar intentos
    if (data.attempts >= this.maxAttempts) {
      console.log(`[OTP] Demasiados intentos (${data.attempts}/${this.maxAttempts}) para userId: ${userId}`);
      return {
        valid: false,
        error: 'Demasiados intentos. Solicita un nuevo código.'
      };
    }

    // Incrementar contador de intentos
    await docRef.update({
      attempts: admin.firestore.FieldValue.increment(1)
    });

    // Marcar código como verificado
    await docRef.update({
      verified: true,
      verifiedAt: now
    });

    console.log(`[OTP] Código verificado exitosamente para userId: ${userId}`);

    return { valid: true };
  }

  /**
   * Invalida todos los códigos anteriores no usados de un usuario
   * Útil antes de generar un nuevo código
   * @param {string} userId - UID del usuario
   * @returns {Promise<number>} Cantidad de códigos invalidados
   */
  async invalidatePreviousCodes(userId) {
    const batch = this.db.batch();
    const querySnapshot = await this.db.collection('verificationCodes')
      .where('userId', '==', userId)
      .where('verified', '==', false)
      .get();

    querySnapshot.forEach(doc => {
      batch.update(doc.ref, {
        verified: true,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();

    const count = querySnapshot.size;
    if (count > 0) {
      console.log(`[OTP] Invalidados ${count} códigos anteriores para userId: ${userId}`);
    }

    return count;
  }

  /**
   * Obtiene el último código generado para un usuario (para verificar cooldown)
   * @param {string} userId - UID del usuario
   * @returns {Promise<object|null>} Datos del último código o null
   */
  async getLastCode(userId) {
    const querySnapshot = await this.db.collection('verificationCodes')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      return null;
    }

    return querySnapshot.docs[0].data();
  }

  /**
   * Limpia códigos expirados (útil para ejecutar periódicamente)
   * @returns {Promise<number>} Cantidad de códigos eliminados
   */
  async cleanupExpiredCodes() {
    const now = admin.firestore.Timestamp.now();
    const batch = this.db.batch();

    const querySnapshot = await this.db.collection('verificationCodes')
      .where('expiresAt', '<', now)
      .limit(500) // Firestore batch limit
      .get();

    querySnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    const count = querySnapshot.size;
    if (count > 0) {
      console.log(`[OTP] Limpiados ${count} códigos expirados`);
    }

    return count;
  }
}

module.exports = OTPService;
