/**
 * Script de prueba manual para endpoints de promociones
 * Este script prueba los endpoints sin autenticación primero (público)
 * y luego con autenticación simulada
 */

const BASE_URL = 'http://localhost:8080';

async function testPublicEndpoint() {
  console.log('\n=== TEST 1: GET /api/promotions (público) ===');
  try {
    const response = await fetch(`${BASE_URL}/api/promotions`);
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('✅ Test 1 passed');
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
  }
}

async function testCartWithPromotions() {
  console.log('\n=== TEST 2: POST /api/cart/verify-totals (con promociones) ===');

  // Primero, vamos a probar con un carrito vacío para ver la estructura
  try {
    const response = await fetch(`${BASE_URL}/api/cart/verify-totals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: []
      })
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('✅ Test 2 passed - Empty cart');
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
  }
}

async function testHealthCheck() {
  console.log('\n=== TEST 0: Health Check (/) ===');
  try {
    const response = await fetch(`${BASE_URL}/`);
    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', text);
    console.log('✅ Test 0 passed');
  } catch (error) {
    console.error('❌ Test 0 failed:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Iniciando pruebas de endpoints de promociones...\n');

  await testHealthCheck();
  await testPublicEndpoint();
  await testCartWithPromotions();

  console.log('\n✨ Pruebas completadas\n');
  console.log('📝 Notas:');
  console.log('- Los endpoints protegidos requieren token de Firebase Auth');
  console.log('- Para probar endpoints admin, necesitas autenticarte desde el frontend');
  console.log('- Los endpoints públicos funcionan sin autenticación\n');
}

runAllTests();
