
## [2025-10-25] - Actualización en Tiempo Real de Pedidos

### ✨ Agregado
- **Actualización en tiempo real** para páginas de pedidos del cliente usando Firestore `onSnapshot()`
- Subscripción automática a cambios en `/mis-pedidos` (lista de pedidos)
- Subscripción automática a cambios en `/mis-pedidos/[id]` (detalle de pedido)
- Los clientes ahora ven cambios de estado instantáneamente sin recargar la página

### 🔄 Modificado
- `/src/app/mis-pedidos/page.tsx` - Reemplazado fetch único con onSnapshot
- `/src/app/mis-pedidos/[id]/page.tsx` - Reemplazado fetch único con onSnapshot
- `/src/app/mis-pedidos/page.test.tsx` - Actualizados mocks para Firestore
- `/src/app/mis-pedidos/[id]/page.test.tsx` - Actualizados mocks para Firestore

### 🎁 Beneficios
- Cliente ve cuando admin cambia estado del pedido (Pendiente → Preparando → En Reparto → Entregado)
- Cliente ve cuando se asigna repartidor instantáneamente
- Reduce llamadas de soporte preguntando "¿dónde está mi pedido?"
- Experiencia de usuario moderna y fluida
- Menos carga en el servidor (no hay polling)

### 📝 Documentación
- Agregado `/docs/REALTIME-UPDATES.md` - Documentación completa de implementación

### 🔒 Seguridad
- Reglas de Firestore garantizan que usuarios solo ven sus propios pedidos
- Validación adicional en código: `orderData.userId !== user.uid`
- Cleanup automático de subscripciones al desmontar componentes

### ⚠️ Breaking Changes
- Ninguno - Los endpoints REST `/api/me/orders` aún funcionan para compatibilidad

### 📊 Tests
- Tests actualizados para usar mocks de Firestore onSnapshot
- Estado: 280/280 tests pasando (100%) ✅

