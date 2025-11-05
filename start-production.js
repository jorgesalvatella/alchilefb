#!/usr/bin/env node

/**
 * Orquestador de Producción - Al Chile FB
 *
 * Inicia Next.js (frontend) y Express (backend) en el mismo contenedor
 * Estrategia: Backend en puerto 8080, Next.js hace proxy interno
 */

const { spawn } = require('child_process');
const path = require('path');

const PORT = process.env.PORT || 8080;
const BACKEND_PORT = 8080;
const FRONTEND_PORT = 9002;

console.log('================================================');
console.log('🚀 Al Chile FB - Production Server');
console.log('================================================');
console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
console.log(`Main Port: ${PORT}`);
console.log(`Backend: http://localhost:${BACKEND_PORT}`);
console.log(`Frontend: http://localhost:${FRONTEND_PORT}`);
console.log('================================================\n');

// Array para almacenar procesos hijos
const processes = [];

// Función para manejar shutdown gracefully
function shutdown(signal) {
  console.log(`\n⚠️  Received ${signal}, shutting down gracefully...`);

  processes.forEach((proc) => {
    if (proc && !proc.killed) {
      proc.kill('SIGTERM');
    }
  });

  setTimeout(() => {
    console.log('✅ All processes terminated');
    process.exit(0);
  }, 5000);
}

// Registrar handlers de señales
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Función para iniciar un proceso
function startProcess(name, command, args, options = {}) {
  console.log(`🔹 Starting ${name}...`);

  const proc = spawn(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...options.env },
    cwd: options.cwd || process.cwd(),
  });

  proc.on('error', (error) => {
    console.error(`❌ ${name} failed to start:`, error);
    shutdown('ERROR');
  });

  proc.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(`❌ ${name} exited with code ${code}`);
      shutdown('EXIT');
    } else if (signal) {
      console.log(`⚠️  ${name} killed by signal ${signal}`);
    }
  });

  processes.push(proc);
  return proc;
}

// ================================
// Iniciar Backend (Express)
// ================================
async function startBackend() {
  return new Promise((resolve) => {
    console.log('\n📦 Starting Express Backend...');

    const backend = startProcess(
      'Backend',
      'node',
      ['index.js'],
      {
        cwd: path.join(__dirname, 'backend'),
        env: {
          PORT: BACKEND_PORT,
          NODE_ENV: 'production',
        },
      }
    );

    // Esperar 3 segundos para que el backend arranque
    setTimeout(() => {
      console.log('✅ Backend started successfully\n');
      resolve();
    }, 3000);
  });
}

// ================================
// Iniciar Frontend (Next.js)
// ================================
function startFrontend() {
  console.log('🎨 Starting Next.js Frontend...');

  startProcess(
    'Frontend',
    'npm',
    ['run', 'start', '--', '-p', FRONTEND_PORT.toString()],
    {
      env: {
        PORT: FRONTEND_PORT,
        BACKEND_URL: `http://localhost:${BACKEND_PORT}`,
        NODE_ENV: 'production',
      },
    }
  );

  console.log('✅ Frontend started successfully\n');
}

// ================================
// Arranque secuencial
// ================================
async function start() {
  try {
    // 1. Iniciar backend primero (el frontend depende de él)
    await startBackend();

    // 2. Iniciar frontend
    startFrontend();

    console.log('================================================');
    console.log('✅ All services are running!');
    console.log('================================================');
    console.log(`🌐 Application: http://localhost:${PORT}`);
    console.log(`📡 API Backend: http://localhost:${BACKEND_PORT}/api`);
    console.log(`🎨 Frontend: http://localhost:${FRONTEND_PORT}`);
    console.log('================================================\n');

    // Mantener el proceso principal vivo
    console.log('💡 Press Ctrl+C to stop all services\n');

  } catch (error) {
    console.error('❌ Failed to start services:', error);
    shutdown('ERROR');
  }
}

// Iniciar todo
start();
