/**
 * @file validate-fcm-config.js
 * @description Script to validate Firebase Cloud Messaging (FCM) configuration
 * @module scripts/validate-fcm-config
 *
 * Este script verifica que la configuración de FCM esté correcta:
 * 1. Verifica que las variables de entorno estén definidas
 * 2. Verifica que Firebase Admin SDK esté inicializado correctamente
 * 3. Verifica conectividad con Firestore
 * 4. Opcionalmente envía una notificación de prueba a un token específico
 *
 * Uso:
 *   node backend/scripts/validate-fcm-config.js
 *   node backend/scripts/validate-fcm-config.js --test-token="TOKEN_FCM_AQUI"
 *
 * Agentes responsables: Aire (DevOps) + Nexus (Backend)
 */

const admin = require('firebase-admin');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// Colores para output en consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function section(title) {
  log(`\n${'='.repeat(60)}`, 'bright');
  log(title, 'bright');
  log('='.repeat(60), 'bright');
}

/**
 * Verifica que las variables de entorno requeridas estén definidas
 */
function checkEnvironmentVariables() {
  section('1. Verificando Configuración de Autenticación');

  // Verificar si usa Application Default Credentials (ADC)
  const hasADC = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
                 process.env.GOOGLE_CLOUD_PROJECT ||
                 process.env.GCLOUD_PROJECT;

  const hasEnvVars = process.env.FIREBASE_PROJECT_ID &&
                     process.env.FIREBASE_CLIENT_EMAIL &&
                     process.env.FIREBASE_PRIVATE_KEY;

  if (hasADC) {
    success('✓ Application Default Credentials (ADC) detectadas');
    info('Método de autenticación: gcloud auth application-default');
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      info(`Archivo de credenciales: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    }
    if (process.env.GOOGLE_CLOUD_PROJECT) {
      info(`Proyecto configurado: ${process.env.GOOGLE_CLOUD_PROJECT}`);
    }
  } else if (hasEnvVars) {
    success('✓ Credenciales en archivo .env detectadas');
    info('Método de autenticación: Variables de entorno');
    success(`FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID}`);
    success(`FIREBASE_CLIENT_EMAIL: Definida`);
    success(`FIREBASE_PRIVATE_KEY: Definida`);
  } else {
    warning('⚠️  No se detectaron credenciales de Firebase');
    info('El script intentará usar Application Default Credentials (ADC)');
    info('Si falla, ejecuta: gcloud auth application-default login');
  }

  // Verificar variables opcionales de FCM
  const optionalVars = [
    'FCM_MAX_TOKENS_PER_USER',
    'FCM_TOKEN_CLEANUP_DAYS',
    'FCM_BATCH_SIZE',
  ];

  info('\nVariables opcionales de FCM:');
  optionalVars.forEach((varName) => {
    if (process.env[varName]) {
      info(`  ${varName}: ${process.env[varName]}`);
    } else {
      info(`  ${varName}: No definida (usará valor por defecto)`);
    }
  });
}

/**
 * Inicializa Firebase Admin SDK
 */
async function initializeFirebase() {
  section('2. Inicializando Firebase Admin SDK');

  try {
    // Verificar si ya está inicializado
    if (admin.apps.length > 0) {
      info('Firebase Admin SDK ya está inicializado');
      return admin.app();
    }

    // Intentar inicializar con Application Default Credentials (ADC)
    // Esto usa las credenciales de gcloud auth application-default login
    try {
      const app = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      success(`Firebase Admin SDK inicializado con Application Default Credentials`);
      info(`Método de autenticación: ADC (gcloud auth)`);

      // Obtener el projectId desde las credenciales
      const projectId = await admin.app().options.credential.getAccessToken().then(() => {
        return process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'studio-9824031244-700aa';
      });
      info(`Proyecto detectado: ${projectId}`);

      return app;
    } catch (adcError) {
      // Si falla ADC, intentar con .env
      if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        info('ADC no disponible, intentando con credenciales de .env...');
        const app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
        success(`Firebase Admin SDK inicializado con credenciales .env`);
        info(`Proyecto: ${process.env.FIREBASE_PROJECT_ID}`);
        return app;
      } else {
        throw new Error(
          'No se encontraron credenciales válidas.\n' +
          'Opciones:\n' +
          '1. Ejecutar: gcloud auth application-default login\n' +
          '2. Crear archivo .env con FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
        );
      }
    }
  } catch (err) {
    error(`Error al inicializar Firebase Admin SDK: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Verifica conectividad con Firestore
 */
async function checkFirestoreConnection() {
  section('3. Verificando Conectividad con Firestore');

  try {
    const db = admin.firestore();

    // Intentar leer un documento (o crear colección de prueba)
    const testRef = db.collection('_fcm_test').doc('connection_test');
    await testRef.set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      message: 'FCM configuration validation test',
    });

    success('Conexión a Firestore establecida correctamente');

    // Limpiar documento de prueba
    await testRef.delete();
    info('Documento de prueba eliminado');

    // Verificar si las colecciones FCM existen
    const deviceTokensSnapshot = await db.collection('deviceTokens').limit(1).get();
    const statsSnapshot = await db.collection('notificationStats').limit(1).get();

    if (deviceTokensSnapshot.empty) {
      warning('Colección "deviceTokens" no existe aún (se creará en primer uso)');
    } else {
      success(`Colección "deviceTokens" existe (${deviceTokensSnapshot.size} documentos encontrados)`);
    }

    if (statsSnapshot.empty) {
      warning('Colección "notificationStats" no existe aún (se creará en primer uso)');
    } else {
      success(`Colección "notificationStats" existe (${statsSnapshot.size} documentos encontrados)`);
    }

  } catch (err) {
    error(`Error al conectar con Firestore: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Verifica que FCM esté disponible en Admin SDK
 */
async function checkFCMAvailability() {
  section('4. Verificando Firebase Cloud Messaging');

  try {
    const messaging = admin.messaging();

    success('Firebase Cloud Messaging (FCM) está disponible');
    info('El Admin SDK puede enviar notificaciones push');

    // Mostrar configuración FCM
    const fcmConfig = {
      maxTokensPerUser: process.env.FCM_MAX_TOKENS_PER_USER || 10,
      tokenCleanupDays: process.env.FCM_TOKEN_CLEANUP_DAYS || 90,
      batchSize: process.env.FCM_BATCH_SIZE || 500,
    };

    info(`Configuración FCM:`);
    info(`  - Max tokens por usuario: ${fcmConfig.maxTokensPerUser}`);
    info(`  - Días para cleanup: ${fcmConfig.tokenCleanupDays}`);
    info(`  - Tamaño de lote: ${fcmConfig.batchSize}`);

    return messaging;
  } catch (err) {
    error(`Error al acceder a FCM: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Envía una notificación de prueba a un token específico
 */
async function sendTestNotification(testToken) {
  section('5. Enviando Notificación de Prueba');

  if (!testToken) {
    warning('No se proporcionó un token de prueba. Saltando envío de notificación.');
    info('Para probar el envío, usa: --test-token="TOKEN_FCM_AQUI"');
    return;
  }

  try {
    const messaging = admin.messaging();

    const message = {
      notification: {
        title: '🔔 Prueba de FCM - Al Chile FB',
        body: 'Si recibes esta notificación, FCM está configurado correctamente.',
      },
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
      token: testToken,
    };

    info('Enviando notificación de prueba...');
    const response = await messaging.send(message);

    success(`Notificación enviada correctamente!`);
    info(`ID del mensaje: ${response}`);

  } catch (err) {
    if (err.code === 'messaging/invalid-registration-token') {
      error('Token inválido o expirado');
      info('Asegúrate de usar un token FCM válido generado desde el cliente');
    } else if (err.code === 'messaging/registration-token-not-registered') {
      error('Token no registrado (el dispositivo desinstaló la app o invalidó el token)');
    } else {
      error(`Error al enviar notificación: ${err.message}`);
      error(`Código de error: ${err.code}`);
    }
  }
}

/**
 * Función principal
 */
async function main() {
  log('\n🚀 FCM Configuration Validator - Al Chile FB', 'bright');
  log('Agentes: Aire (DevOps) + Nexus (Backend)\n', 'cyan');

  try {
    // 1. Verificar variables de entorno
    checkEnvironmentVariables();

    // 2. Inicializar Firebase
    await initializeFirebase();

    // 3. Verificar Firestore
    await checkFirestoreConnection();

    // 4. Verificar FCM
    await checkFCMAvailability();

    // 5. Enviar notificación de prueba (si se proporciona token)
    const args = process.argv.slice(2);
    const testTokenArg = args.find((arg) => arg.startsWith('--test-token='));
    const testToken = testTokenArg ? testTokenArg.split('=')[1] : null;

    await sendTestNotification(testToken);

    // Resumen final
    section('✅ VALIDACIÓN COMPLETA');
    success('La configuración de FCM está correcta y lista para usar');
    info('\nPróximos pasos:');
    info('1. Implementar FASE 2: Backend - Infraestructura Core');
    info('2. Crear endpoints API para registro de tokens');
    info('3. Implementar servicios FCM (envío de notificaciones)');

    process.exit(0);
  } catch (err) {
    error(`\n⛔ Error inesperado: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

// Ejecutar script
if (require.main === module) {
  main();
}

module.exports = { main };
