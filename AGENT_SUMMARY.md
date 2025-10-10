# Resumen Rápido para Agentes IA

## 👥 Equipo de Agentes Especializados

| Nombre | Rol | Invoca cuando... |
|--------|-----|------------------|
| **Atlas** | Arquitecto Full-Stack | Necesitas planificación estratégica o decisiones arquitectónicas |
| **Pyra** | Arquitecto Firebase | Trabajas con Firestore, Auth, Storage o Security Rules |
| **Aether** | Especialista UI/UX | Desarrollas componentes visuales o responsive design |
| **Nexus** | Ingeniero Backend | Implementas APIs REST o trabajas con Express.js |
| **Sentinel** | Depurador Senior | Enfrentas bugs complejos o errores persistentes |
| **Vanguard** | QA Engineer | Escribes tests o validas calidad del código |
| **Aire** | DevOps Specialist | Configuras infraestructura o despliegues |

## 🚀 Stack
- **Frontend**: Next.js 15 + React 18 + TypeScript + Tailwind + shadcn/ui (puerto 9002)
- **Backend**: Express.js + Firebase Admin (puerto 8080)
- **Firebase**: Auth + Firestore + Storage
- **Testing**: Jest + React Testing Library + Supertest

## 🎯 Comandos Esenciales

```bash
# Desarrollo
npm run dev                    # Frontend (localhost:9002)
cd backend && node index.js    # Backend (localhost:8080)

# Testing
npm test                       # Ambos (frontend + backend)
npm run test:frontend          # Solo frontend
npm run test:backend           # Solo backend

# Diagnóstico
node check-storage.js          # Verificar Firebase Storage
node test-backend-upload.js    # Probar upload
node setAdminFromShell.js UID  # Asignar super_admin

# Limpieza
rm -rf .next && npm run dev    # Limpiar caché Next.js
```

## ⚠️ Problemas Comunes (TOP 5)

1. **Endpoint vacío** → Implementar completamente, NO dejar `// ... (código existente)`
2. **Storage 404** → Bucket name: `studio-9824031244-700aa.firebasestorage.app`
3. **App Check 403** → Deshabilitado en dev (var `NEXT_PUBLIC_ENABLE_APP_CHECK`)
4. **403 Forbidden** → Usuario necesita claim `super_admin` + reiniciar sesión
5. **Código antiguo** → Ctrl+Shift+R en navegador

## 📋 Checklist de Implementación

### Nuevo Endpoint Backend
- [ ] Implementar lógica completa (NO placeholders)
- [ ] Agregar `authMiddleware`
- [ ] Validar inputs
- [ ] Verificar `super_admin` si es necesario
- [ ] Manejar errores con mensajes descriptivos
- [ ] Escribir test con Supertest
- [ ] Probar manualmente

### Nuevo Componente Frontend
- [ ] Usar componentes shadcn/ui existentes
- [ ] Implementar manejo de errores
- [ ] Usar hooks de Firebase (`useUser`, `useDoc`, `useCollection`)
- [ ] Responsive design
- [ ] Escribir test con React Testing Library

### Upload de Archivos
- [ ] Frontend: FormData → `/api/control/upload`
- [ ] Backend: multer + Firebase Storage
- [ ] NO usar `makePublic()` (reglas de Storage son suficientes)
- [ ] Retornar URL pública
- [ ] Frontend: Usar URL en request principal

## 🔐 Firebase Storage Config

```javascript
// backend/app.js
initializeApp({
  credential: applicationDefault(),
  projectId: 'studio-9824031244-700aa',
  storageBucket: 'studio-9824031244-700aa.firebasestorage.app', // ⚠️ Exacto!
});
```

## 🧪 Patrón de Testing Backend

```javascript
describe('POST /api/control/unidades-de-negocio', () => {
  it('should return 403 if not super_admin', async () => {
    const response = await request(app)
      .post('/api/control/unidades-de-negocio')
      .set('Authorization', 'Bearer test-regular-user-token')
      .send({ name: 'Test' });
    expect(response.statusCode).toBe(403);
  });

  it('should return 201 on success', async () => {
    const response = await request(app)
      .post('/api/control/unidades-de-negocio')
      .set('Authorization', 'Bearer test-super-admin-token')
      .send({ name: 'Test', razonSocial: 'Test SA' });
    expect(response.statusCode).toBe(201);
  });
});
```

## 📚 Documentación Completa

Ver `AGENTS.md` para documentación extendida de todos los roles y mejores prácticas.
