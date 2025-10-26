/**
 * WhatsApp Factory
 * Factory Pattern para crear instancias de clientes WhatsApp
 * Soporta Twilio y Meta WhatsApp Business API
 *
 * Cambiar de proveedor es tan simple como:
 * WHATSAPP_PROVIDER=twilio  (o)  WHATSAPP_PROVIDER=meta
 */

const MetaClient = require('./meta-client');
const TwilioClient = require('./twilio-client');

class WhatsAppFactory {
  /**
   * Crea una instancia del cliente WhatsApp según el proveedor configurado
   * @returns {MetaWhatsAppClient | TwilioWhatsAppClient}
   * @throws {Error} Si el proveedor no es válido
   */
  static createClient() {
    const provider = process.env.WHATSAPP_PROVIDER || 'twilio';

    console.log(`[WhatsApp Factory] Inicializando proveedor: ${provider}`);

    switch (provider.toLowerCase()) {
      case 'meta':
        return new MetaClient();

      case 'twilio':
        return new TwilioClient();

      default:
        throw new Error(
          `Unknown WhatsApp provider: "${provider}". ` +
          `Valid options: "meta", "twilio". ` +
          `Set WHATSAPP_PROVIDER environment variable.`
        );
    }
  }
}

module.exports = WhatsAppFactory;
