/**
 * Rate Limiter
 * Servicio para controlar el envío de códigos OTP y prevenir abuso
 * Implementa límites por teléfono y por IP
 */

const admin = require('firebase-admin');

class RateLimiter {
  constructor() {
    this.db = admin.firestore();
    this.maxPerPhonePerDay = parseInt(process.env.MAX_OTP_PER_PHONE_PER_DAY) || 5;
    this.maxPerIPPerHour = parseInt(process.env.MAX_OTP_PER_IP_PER_HOUR) || 10;
  }

  /**
   * Verifica si se puede enviar un código OTP
   * @param {string} phoneNumber - Número de teléfono en formato E.164
   * @param {string} ipAddress - Dirección IP del solicitante
   * @returns {Promise<{allowed: boolean, reason?: string}>}
   */
  async canSendOTP(phoneNumber, ipAddress) {
    // Verificar límite por teléfono (5 por día)
    const phoneCheck = await this.checkPhoneLimit(phoneNumber);
    if (!phoneCheck.allowed) {
      console.log(`[Rate Limiter] Bloqueado por teléfono: ${phoneNumber}`);
      return phoneCheck;
    }

    // Verificar límite por IP (10 por hora)
    if (ipAddress) {
      const ipCheck = await this.checkIPLimit(ipAddress);
      if (!ipCheck.allowed) {
        console.log(`[Rate Limiter] Bloqueado por IP: ${ipAddress}`);
        return ipCheck;
      }
    }

    return { allowed: true };
  }

  /**
   * Verifica límite de códigos por número de teléfono
   * @param {string} phoneNumber - Número de teléfono
   * @returns {Promise<{allowed: boolean, reason?: string}>}
   */
  async checkPhoneLimit(phoneNumber) {
    const oneDayAgo = admin.firestore.Timestamp.fromMillis(
      Date.now() - (24 * 60 * 60 * 1000)
    );

    const querySnapshot = await this.db.collection('verificationCodes')
      .where('phoneNumber', '==', phoneNumber)
      .where('createdAt', '>', oneDayAgo)
      .get();

    const count = querySnapshot.size;

    if (count >= this.maxPerPhonePerDay) {
      return {
        allowed: false,
        reason: `Límite alcanzado: máximo ${this.maxPerPhonePerDay} códigos por día. Inténtalo mañana.`,
        limitType: 'phone',
        count: count,
        limit: this.maxPerPhonePerDay
      };
    }

    return { allowed: true, count: count, limit: this.maxPerPhonePerDay };
  }

  /**
   * Verifica límite de códigos por dirección IP
   * @param {string} ipAddress - Dirección IP
   * @returns {Promise<{allowed: boolean, reason?: string}>}
   */
  async checkIPLimit(ipAddress) {
    const oneHourAgo = admin.firestore.Timestamp.fromMillis(
      Date.now() - (60 * 60 * 1000)
    );

    const querySnapshot = await this.db.collection('verificationCodes')
      .where('ipAddress', '==', ipAddress)
      .where('createdAt', '>', oneHourAgo)
      .get();

    const count = querySnapshot.size;

    if (count >= this.maxPerIPPerHour) {
      return {
        allowed: false,
        reason: `Límite alcanzado: máximo ${this.maxPerIPPerHour} códigos por hora. Espera un momento.`,
        limitType: 'ip',
        count: count,
        limit: this.maxPerIPPerHour
      };
    }

    return { allowed: true, count: count, limit: this.maxPerIPPerHour };
  }

  /**
   * Obtiene estadísticas de uso para un teléfono
   * @param {string} phoneNumber - Número de teléfono
   * @returns {Promise<object>} Estadísticas de uso
   */
  async getPhoneStats(phoneNumber) {
    const oneDayAgo = admin.firestore.Timestamp.fromMillis(
      Date.now() - (24 * 60 * 60 * 1000)
    );

    const querySnapshot = await this.db.collection('verificationCodes')
      .where('phoneNumber', '==', phoneNumber)
      .where('createdAt', '>', oneDayAgo)
      .orderBy('createdAt', 'desc')
      .get();

    const codes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    }));

    return {
      phoneNumber,
      last24Hours: codes.length,
      limit: this.maxPerPhonePerDay,
      remaining: Math.max(0, this.maxPerPhonePerDay - codes.length),
      codes: codes
    };
  }

  /**
   * Obtiene estadísticas de uso para una IP
   * @param {string} ipAddress - Dirección IP
   * @returns {Promise<object>} Estadísticas de uso
   */
  async getIPStats(ipAddress) {
    const oneHourAgo = admin.firestore.Timestamp.fromMillis(
      Date.now() - (60 * 60 * 1000)
    );

    const querySnapshot = await this.db.collection('verificationCodes')
      .where('ipAddress', '==', ipAddress)
      .where('createdAt', '>', oneHourAgo)
      .orderBy('createdAt', 'desc')
      .get();

    const codes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    }));

    return {
      ipAddress,
      lastHour: codes.length,
      limit: this.maxPerIPPerHour,
      remaining: Math.max(0, this.maxPerIPPerHour - codes.length),
      codes: codes
    };
  }
}

module.exports = RateLimiter;
