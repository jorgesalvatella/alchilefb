/**
 * Script de migración temporal para asignar categoryId a paquetes existentes
 *
 * Uso:
 * 1. Obtén tu token de autenticación desde la consola del navegador:
 *    - Abre DevTools (F12)
 *    - Ve a Application > Local Storage > http://localhost:9002
 *    - Busca la clave que contiene tu token (ej: "firebase:authUser:...")
 *    - Copia el valor del campo "stsTokenManager.accessToken"
 *
 * 2. Ejecuta: node migrate-packages.js YOUR_TOKEN_HERE
 */

const token = process.argv[2];

if (!token) {
  console.error('❌ Error: Debes proporcionar un token de autenticación');
  console.log('\nUso: node migrate-packages.js YOUR_TOKEN_HERE\n');
  console.log('Para obtener tu token:');
  console.log('1. Abre http://localhost:9002/control en tu navegador');
  console.log('2. Abre DevTools (F12) > Application > Local Storage');
  console.log('3. Busca la clave que contiene tu token');
  console.log('4. Copia el valor de "stsTokenManager.accessToken"\n');
  process.exit(1);
}

const https = require('http');

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/control/promotions/migrate-categories',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
};

console.log('🔄 Iniciando migración de categoryId para paquetes y promociones...\n');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      const result = JSON.parse(data);
      console.log('✅ Migración completada exitosamente!');
      console.log(`📦 Paquetes/promociones actualizados: ${result.updated}`);
      console.log('\n💡 Ahora recarga la página /menu para ver los paquetes\n');
    } else {
      console.error(`❌ Error: ${res.statusCode} ${res.statusMessage}`);
      console.error(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error al conectar con el servidor:', error.message);
  console.log('\n💡 Asegúrate de que el backend esté corriendo en el puerto 8080\n');
});

req.end();
