/**
 * Twilio WhatsApp Client
 * Cliente para enviar mensajes vía Twilio WhatsApp API
 * Incluye fallback automático a SMS si WhatsApp falla
 */

const twilio = require('twilio');

class TwilioWhatsAppClient {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
    this.smsNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!this.accountSid || !this.authToken) {
      throw new Error('Twilio credentials not configured. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
    }

    this.client = twilio(this.accountSid, this.authToken);
  }

  /**
   * Enviar mensaje por WhatsApp
   * @param {string} to - Número destino en formato E.164: +52XXXXXXXXXX
   * @param {string} body - Texto del mensaje
   * @returns {Promise<object>} Respuesta con success, messageId, provider
   */
  async sendMessage(to, body) {
    try {
      const message = await this.client.messages.create({
        from: this.whatsappNumber,
        to: `whatsapp:${to}`,
        body: body
      });

      return {
        success: true,
        messageId: message.sid,
        status: message.status,
        provider: 'twilio-whatsapp'
      };

    } catch (error) {
      console.error('Twilio WhatsApp error:', error.message);

      // Fallback a SMS si está configurado
      if (this.smsNumber) {
        console.log('WhatsApp falló, intentando SMS fallback...');
        return await this.sendSMS(to, body);
      }

      throw new Error(`Failed to send WhatsApp via Twilio: ${error.message}`);
    }
  }

  /**
   * Enviar SMS como fallback
   * @param {string} to - Número destino en formato E.164
   * @param {string} body - Texto del mensaje
   * @returns {Promise<object>}
   */
  async sendSMS(to, body) {
    if (!this.smsNumber) {
      throw new Error('SMS fallback not configured. Set TWILIO_PHONE_NUMBER');
    }

    try {
      const message = await this.client.messages.create({
        from: this.smsNumber,
        to: to,
        body: body
      });

      return {
        success: true,
        messageId: message.sid,
        status: message.status,
        provider: 'twilio-sms'
      };

    } catch (error) {
      console.error('Twilio SMS error:', error.message);
      throw new Error(`Failed to send SMS via Twilio: ${error.message}`);
    }
  }

  /**
   * Enviar código OTP con formato predefinido
   * @param {string} to - Número destino
   * @param {string} code - Código OTP de 6 dígitos
   * @returns {Promise<object>}
   */
  async sendOTP(to, code) {
    const message = `Al Chile FB\nTu código de verificación es: ${code}\nVálido por 10 minutos.`;
    return this.sendMessage(to, message);
  }
}

module.exports = TwilioWhatsAppClient;
