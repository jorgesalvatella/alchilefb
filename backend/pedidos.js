const express = require('express');
const admin = require('firebase-admin');
const authMiddleware = require('./authMiddleware');
const { verifyCartTotals } = require('./cart');

const router = express.Router();
const db = admin.firestore();

/**
 * @swagger
 * /api/pedidos:
 *   post:
 *     summary: Crea un nuevo pedido
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *               shippingAddress:
 *                 oneOf:
 *                   - type: object
 *                   - type: string
 *               paymentMethod:
 *                 type: string
 *     responses:
 *       '201':
 *         description: Pedido creado exitosamente
 *       '400':
 *         description: Datos inválidos
 */
// Helper function to remove undefined values from an object
const removeUndefined = (obj) => {
  if (obj instanceof admin.firestore.FieldValue || obj instanceof Date) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = removeUndefined(value);
      }
      return acc;
    }, {});
  }
  return obj;
};

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;
    const userId = req.user.uid;

    if (!items || items.length === 0 || !shippingAddress || !paymentMethod) {
      return res.status(400).json({ message: 'Faltan campos requeridos: items, shippingAddress, paymentMethod' });
    }

    // 1. Re-verificar totales (usando la lógica real)
    const itemsToVerify = items.map(item => ({
      productId: item.id,
      quantity: item.quantity,
      customizations: item.customizations || null,
    }));
    const verificationResult = await verifyCartTotals(itemsToVerify);

    // 2. Construir el objeto del pedido
    const newOrder = {
      userId,
      items: verificationResult.items,
      totalVerified: verificationResult.summary.totalFinal,
      paymentMethod,
      shippingAddress,
      status: 'Pedido Realizado',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      statusHistory: [{
        status: 'Pedido Realizado',
        timestamp: new Date(),
        changedBy: userId
      }]
    };
    console.log('1. Objeto newOrder antes de limpiar:', newOrder);

    // Remove undefined values to prevent Firestore errors
    const cleanOrder = removeUndefined(newOrder);
    console.log('2. Objeto cleanOrder después de limpiar (lo que se envía a Firestore):', cleanOrder);

    // 3. Guardar en Firestore
    const docRef = await db.collection('pedidos').add(cleanOrder);
    console.log('3. Pedido guardado con ID:', docRef.id);

    // 4. Devolver respuesta
    res.status(201).json({ id: docRef.id, ...cleanOrder });

  } catch (error) {
    console.error('Error creando pedido:', error);
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
});

/**
 * @swagger
 * /api/control/pedidos:
 *   get:
 *     summary: Obtiene todos los pedidos con filtros (Admin)
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filtrar por estado del pedido
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de inicio (ISO string)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de fin (ISO string)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Búsqueda en ID, nombre de cliente, dirección
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 50
 *         description: Límite de resultados
 *       - in: query
 *         name: offset
 *         schema:
 *           type: number
 *           default: 0
 *         description: Offset para paginación
 *     responses:
 *       '200':
 *         description: Lista de pedidos
 *       '403':
 *         description: No autorizado (requiere admin)
 */
router.get('/control', authMiddleware, async (req, res) => {
  try {
    // Verificar que el usuario sea admin o super_admin
    if (!req.user || (!req.user.admin && !req.user.super_admin)) {
      return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
    }

    const { status, startDate, endDate, search, limit = 50, offset = 0 } = req.query;

    // Construir la query base
    let ordersQuery = db.collection('pedidos');

    // Filtrar por estado si se proporciona
    if (status && status !== 'all') {
      ordersQuery = ordersQuery.where('status', '==', status);
    }

    // Filtrar por rango de fechas
    if (startDate) {
      const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(startDate));
      ordersQuery = ordersQuery.where('createdAt', '>=', startTimestamp);
    }
    if (endDate) {
      const endTimestamp = admin.firestore.Timestamp.fromDate(new Date(endDate));
      ordersQuery = ordersQuery.where('createdAt', '<=', endTimestamp);
    }

    // Ordenar por fecha descendente
    ordersQuery = ordersQuery.orderBy('createdAt', 'desc');

    // Aplicar limit
    ordersQuery = ordersQuery.limit(parseInt(limit));

    // Ejecutar query
    const snapshot = await ordersQuery.get();

    if (snapshot.empty) {
      return res.status(200).json({ orders: [], total: 0, page: 1, limit: parseInt(limit) });
    }

    // Mapear los pedidos y obtener info de usuarios
    const orders = [];
    for (const doc of snapshot.docs) {
      const orderData = { id: doc.id, ...doc.data() };

      // Obtener información del usuario si no está denormalizada
      if (!orderData.userName && orderData.userId) {
        try {
          const userDoc = await db.collection('users').doc(orderData.userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            orderData.userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Usuario';
            orderData.userEmail = userData.email || '';
            orderData.userPhone = userData.phoneNumber || '';
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
        }
      }

      // Aplicar búsqueda si se proporciona (filtrado client-side por simplicidad)
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesId = orderData.id.toLowerCase().includes(searchLower);
        const matchesName = orderData.userName?.toLowerCase().includes(searchLower);
        const matchesAddress = typeof orderData.shippingAddress === 'object'
          ? JSON.stringify(orderData.shippingAddress).toLowerCase().includes(searchLower)
          : orderData.shippingAddress?.toLowerCase().includes(searchLower);

        if (!matchesId && !matchesName && !matchesAddress) {
          continue;
        }
      }

      orders.push(orderData);
    }

    // Calcular total (aproximado - en producción usar una query count separada)
    const total = orders.length;

    res.status(200).json({
      orders,
      total,
      page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/control/pedidos/stats:
 *   get:
 *     summary: Obtiene estadísticas de pedidos para KPIs
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha para calcular stats (default hoy)
 *     responses:
 *       '200':
 *         description: Estadísticas de pedidos
 *       '403':
 *         description: No autorizado
 */
router.get('/control/stats', authMiddleware, async (req, res) => {
  try {
    if (!req.user || (!req.user.admin && !req.user.super_admin)) {
      return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
    }

    const targetDate = req.query.date ? new Date(req.query.date) : new Date();

    // Calcular rango del día
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Calcular día anterior para comparación
    const startOfYesterday = new Date(startOfDay);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const endOfYesterday = new Date(endOfDay);
    endOfYesterday.setDate(endOfYesterday.getDate() - 1);

    // Query pedidos de hoy
    const todaySnapshot = await db.collection('pedidos')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endOfDay))
      .get();

    // Query pedidos de ayer para comparación
    const yesterdaySnapshot = await db.collection('pedidos')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startOfYesterday))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endOfYesterday))
      .get();

    // Calcular métricas
    const todayOrders = todaySnapshot.size;
    const yesterdayOrders = yesterdaySnapshot.size;
    const todayOrdersChange = yesterdayOrders > 0
      ? ((todayOrders - yesterdayOrders) / yesterdayOrders * 100).toFixed(1)
      : 0;

    // Pedidos activos (Preparando + En Reparto)
    let activeOrders = 0;
    let preparandoCount = 0;
    let enRepartoCount = 0;
    let todayRevenue = 0;
    let deliveryTimes = [];

    todaySnapshot.forEach(doc => {
      const data = doc.data();

      if (data.status === 'Preparando' || data.status === 'En Reparto') {
        activeOrders++;
        if (data.status === 'Preparando') preparandoCount++;
        if (data.status === 'En Reparto') enRepartoCount++;
      }

      // Sumar ingresos
      todayRevenue += data.totalVerified || 0;

      // Calcular tiempo de entrega si está completado
      if (data.status === 'Entregado' && data.deliveredAt && data.createdAt) {
        const deliveryTime = (data.deliveredAt.toMillis() - data.createdAt.toMillis()) / (1000 * 60); // en minutos
        deliveryTimes.push(deliveryTime);
      }
    });

    const averageTicket = todayOrders > 0 ? todayRevenue / todayOrders : 0;
    const averageDeliveryTime = deliveryTimes.length > 0
      ? Math.round(deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length)
      : 0;

    res.status(200).json({
      todayOrders,
      todayOrdersChange: parseFloat(todayOrdersChange),
      activeOrders,
      activeOrdersByStatus: {
        Preparando: preparandoCount,
        'En Reparto': enRepartoCount
      },
      todayRevenue: parseFloat(todayRevenue.toFixed(2)),
      averageTicket: parseFloat(averageTicket.toFixed(2)),
      averageDeliveryTime,
      deliveryTimeUnit: 'minutes'
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/control/pedidos/{orderId}/status:
 *   put:
 *     summary: Cambia el estado de un pedido
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Pedido Realizado, Preparando, En Reparto, Entregado, Cancelado]
 *     responses:
 *       '200':
 *         description: Estado actualizado
 *       '400':
 *         description: Estado inválido
 *       '403':
 *         description: No autorizado
 */
router.put('/control/:orderId/status', authMiddleware, async (req, res) => {
  try {
    if (!req.user || (!req.user.admin && !req.user.super_admin)) {
      return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
    }

    const { orderId } = req.params;
    const { status } = req.body;

    // Validar estado
    const validStatuses = ['Pedido Realizado', 'Preparando', 'En Reparto', 'Entregado', 'Cancelado'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Estado inválido. Debe ser uno de: ' + validStatuses.join(', ') });
    }

    const orderRef = db.collection('pedidos').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    const currentOrder = orderDoc.data();

    // Crear entrada para statusHistory
    const statusHistoryEntry = {
      status,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      changedBy: req.user.uid
    };

    // Preparar actualización
    const updateData = {
      status,
      statusHistory: admin.firestore.FieldValue.arrayUnion(statusHistoryEntry)
    };

    // Si el estado es "Entregado", guardar timestamp
    if (status === 'Entregado') {
      updateData.deliveredAt = admin.firestore.FieldValue.serverTimestamp();
    }

    await orderRef.update(updateData);

    // Obtener el pedido actualizado
    const updatedDoc = await orderRef.get();
    const updatedOrder = { id: updatedDoc.id, ...updatedDoc.data() };

    res.status(200).json({
      message: 'Estado actualizado exitosamente',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/control/pedidos/{orderId}:
 *   get:
 *     summary: Obtiene detalles completos de un pedido
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Detalles del pedido
 *       '404':
 *         description: Pedido no encontrado
 *       '403':
 *         description: No autorizado
 */
router.get('/control/:orderId', authMiddleware, async (req, res) => {
  try {
    if (!req.user || (!req.user.admin && !req.user.super_admin)) {
      return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
    }

    const { orderId } = req.params;

    const orderRef = db.collection('pedidos').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    const orderData = { id: orderDoc.id, ...orderDoc.data() };

    // Obtener información del usuario si no está denormalizada
    if (!orderData.userName && orderData.userId) {
      try {
        const userDoc = await db.collection('users').doc(orderData.userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          orderData.userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Usuario';
          orderData.userEmail = userData.email || '';
          orderData.userPhone = userData.phoneNumber || '';
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    }

    // Los items ya están en el documento principal, no en una subcolección
    res.status(200).json({ order: orderData });

  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/control/pedidos/{orderId}/cancel:
 *   delete:
 *     summary: Cancela un pedido
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Pedido cancelado
 *       '400':
 *         description: No se puede cancelar
 *       '403':
 *         description: No autorizado
 */
router.delete('/control/:orderId/cancel', authMiddleware, async (req, res) => {
  try {
    if (!req.user || (!req.user.admin && !req.user.super_admin)) {
      return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
    }

    const { orderId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Debe proporcionar una razón para la cancelación' });
    }

    const orderRef = db.collection('pedidos').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    const currentOrder = orderDoc.data();

    // No se puede cancelar un pedido ya entregado
    if (currentOrder.status === 'Entregado') {
      return res.status(400).json({ message: 'No se puede cancelar un pedido ya entregado' });
    }

    // Crear entrada para statusHistory
    const statusHistoryEntry = {
      status: 'Cancelado',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      changedBy: req.user.uid
    };

    // Actualizar pedido
    await orderRef.update({
      status: 'Cancelado',
      cancelReason: reason,
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      cancelledBy: req.user.uid,
      statusHistory: admin.firestore.FieldValue.arrayUnion(statusHistoryEntry)
    });

    // Obtener el pedido actualizado
    const updatedDoc = await orderRef.get();
    const updatedOrder = { id: updatedDoc.id, ...updatedDoc.data() };

    res.status(200).json({
      message: 'Pedido cancelado exitosamente',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Error canceling order:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
