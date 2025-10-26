/**
 * Script de Prueba: Twilio WhatsApp
 *
 * Este script prueba la configuración de Twilio WhatsApp API
 * para verificar que las credenciales y el setup estén correctos
 *
 * USO:
 *   1. Configurar variables de entorno en .env:
 *      WHATSAPP_PROVIDER=twilio
 *      TWILIO_ACCOUNT_SID=ACxxxxxxxxx
 *      TWILIO_AUTH_TOKEN=xxxxxxxxx
 *      TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
 *
 *   2. Ejecutar:
 *      node test-twilio-whatsapp.js +52XXXXXXXXXX
 *
 *      O para probar SMS fallback:
 *      TWILIO_PHONE_NUMBER=+1234567890 node test-twilio-whatsapp.js +52XXXXXXXXXX
 */

require('dotenv').config();
const TwilioClient = require('./whatsapp/providers/twilio-client');

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testTwilioWhatsApp() {
  // Título
  log('\n╔═══════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     PRUEBA DE CONFIGURACIÓN: TWILIO WHATSAPP API             ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════════╝\n', 'cyan');

  // 1. Validar variables de entorno
  log('📋 PASO 1: Validando variables de entorno...', 'blue');

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
  const smsNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid) {
    log('   ❌ TWILIO_ACCOUNT_SID no está configurado', 'red');
    log('   💡 Agrégalo a tu archivo .env', 'yellow');
    process.exit(1);
  } else {
    log(`   ✅ TWILIO_ACCOUNT_SID: ${accountSid.substring(0, 10)}...`, 'green');
  }

  if (!authToken) {
    log('   ❌ TWILIO_AUTH_TOKEN no está configurado', 'red');
    log('   💡 Agrégalo a tu archivo .env', 'yellow');
    process.exit(1);
  } else {
    log(`   ✅ TWILIO_AUTH_TOKEN: ${authToken.substring(0, 10)}...`, 'green');
  }

  log(`   ✅ TWILIO_WHATSAPP_NUMBER: ${whatsappNumber || 'whatsapp:+14155238886 (default)'}`, 'green');

  if (smsNumber) {
    log(`   ✅ TWILIO_PHONE_NUMBER: ${smsNumber} (SMS fallback habilitado)`, 'green');
  } else {
    log('   ⚠️  TWILIO_PHONE_NUMBER no configurado (SMS fallback deshabilitado)', 'yellow');
  }

  // 2. Obtener número destino
  log('\n📱 PASO 2: Validando número destino...', 'blue');

  const destinationNumber = process.argv[2];

  if (!destinationNumber) {
    log('   ❌ Error: Debes proporcionar un número destino', 'red');
    log('\n   💡 Uso: node test-twilio-whatsapp.js +52XXXXXXXXXX\n', 'yellow');
    process.exit(1);
  }

  if (!destinationNumber.match(/^\+52\d{10}$/)) {
    log(`   ❌ Formato de número inválido: ${destinationNumber}`, 'red');
    log('   💡 El formato correcto es: +52XXXXXXXXXX (10 dígitos)', 'yellow');
    process.exit(1);
  }

  log(`   ✅ Número destino: ${destinationNumber}`, 'green');

  // 3. Inicializar cliente Twilio
  log('\n🔧 PASO 3: Inicializando cliente Twilio...', 'blue');

  let client;
  try {
    client = new TwilioClient();
    log('   ✅ Cliente Twilio inicializado correctamente', 'green');
  } catch (error) {
    log(`   ❌ Error al inicializar cliente: ${error.message}`, 'red');
    process.exit(1);
  }

  // 4. Enviar mensaje de prueba
  log('\n📤 PASO 4: Enviando mensaje de prueba por WhatsApp...', 'blue');

  const testCode = Math.floor(100000 + Math.random() * 900000).toString();
  log(`   📝 Código OTP generado: ${testCode}`, 'cyan');

  try {
    log(`   ⏳ Enviando a ${destinationNumber}...`, 'yellow');

    const result = await client.sendOTP(destinationNumber, testCode);

    log('\n   ✅ ¡Mensaje enviado exitosamente!', 'green');
    log(`   📋 Detalles de envío:`, 'cyan');
    log(`      • Message ID: ${result.messageId}`, 'cyan');
    log(`      • Provider: ${result.provider}`, 'cyan');
    log(`      • Status: ${result.status || 'queued'}`, 'cyan');

    if (result.provider === 'twilio-sms') {
      log('\n   ⚠️  Nota: El mensaje se envió por SMS (fallback)', 'yellow');
      log('      WhatsApp no estaba disponible o el número no lo tiene', 'yellow');
    }

  } catch (error) {
    log('\n   ❌ Error al enviar mensaje:', 'red');
    log(`      ${error.message}`, 'red');

    // Ayuda según el error
    if (error.message.includes('Sandbox')) {
      log('\n   💡 SOLUCIÓN:', 'yellow');
      log('      1. El número destino debe hacer "join" al Sandbox de Twilio', 'yellow');
      log('      2. Envía este mensaje a +1 415 523 8886 en WhatsApp:', 'yellow');
      log('         join <tu-sandbox-code>', 'yellow');
      log('      3. El código del sandbox está en: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn', 'yellow');
    } else if (error.message.includes('not authorized')) {
      log('\n   💡 SOLUCIÓN:', 'yellow');
      log('      • Verifica tus credenciales de Twilio', 'yellow');
      log('      • El número debe estar verificado en cuenta trial', 'yellow');
    }

    process.exit(1);
  }

  // 5. Resumen final
  log('\n╔═══════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                    PRUEBA COMPLETADA ✅                       ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════════╝\n', 'cyan');

  log('📊 RESUMEN:', 'bright');
  log(`   • Proveedor: Twilio WhatsApp`, 'green');
  log(`   • Número destino: ${destinationNumber}`, 'green');
  log(`   • Código OTP enviado: ${testCode}`, 'green');
  log(`   • Estado: Mensaje en tránsito (revisa WhatsApp)`, 'green');

  log('\n📱 PRÓXIMOS PASOS:', 'bright');
  log('   1. Revisa el WhatsApp del número destino', 'cyan');
  log('   2. Deberías ver un mensaje con el código OTP', 'cyan');
  log('   3. Si funciona, la configuración está lista ✅', 'cyan');
  log('   4. Ahora puedes usar las rutas de API:', 'cyan');
  log('      • POST /api/auth/send-verification-code', 'yellow');
  log('      • POST /api/auth/verify-code', 'yellow');
  log('      • POST /api/auth/resend-verification-code', 'yellow');

  log('\n🔐 SEGURIDAD:', 'bright');
  log('   • NUNCA compartas tus credenciales de Twilio', 'red');
  log('   • NUNCA subas el archivo .env a Git', 'red');
  log('   • Rota tus tokens periódicamente', 'yellow');

  log('\n');
}

// Ejecutar prueba
testTwilioWhatsApp().catch(error => {
  log(`\n❌ Error inesperado: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
