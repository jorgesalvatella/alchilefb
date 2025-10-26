/**
 * Meta WhatsApp Business API Client
 * Cliente para enviar mensajes vía Meta WhatsApp Cloud API
 */

const axios = require('axios');

class MetaWhatsAppClient {
  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.apiVersion = 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;

    if (!this.accessToken || !this.phoneNumberId) {
      throw new Error('Meta WhatsApp credentials not configured. Check WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID');
    }
  }

  /**
   * Enviar mensaje por WhatsApp
   * @param {string} to - Número destino en formato E.164: +52XXXXXXXXXX
   * @param {string} body - Texto del mensaje
   * @returns {Promise<object>} Respuesta con success, messageId, provider
   */
  async sendMessage(to, body) {
    try {
      // Meta no quiere el símbolo + en el número
      const phoneNumber = to.replace('+', '');

      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'text',
          text: {
            body: body
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
        provider: 'meta-whatsapp'
      };

    } catch (error) {
      console.error('Meta WhatsApp error:', error.response?.data || error.message);

      // Extraer información útil del error
      const errorMessage = error.response?.data?.error?.message || error.message;
      const errorCode = error.response?.data?.error?.code;

      throw new Error(`Failed to send WhatsApp via Meta: ${errorMessage} (Code: ${errorCode})`);
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

module.exports = MetaWhatsAppClient;
