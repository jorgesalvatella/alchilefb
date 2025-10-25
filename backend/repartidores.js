const express = require('express');
const admin = require('firebase-admin');
const authMiddleware = require('./authMiddleware');

const router = express.Router();
const db = admin.firestore();

// Middleware para verificar que el usuario tiene claim 'repartidor'
const requireRepartidor = (req, res, next) => {
  if (!req.user || !req.user.repartidor) {
    return res.status(403).json({
      message: 'Forbidden: Solo repartidores pueden acceder a este recurso'
    });
  }
  next();
};

/**
 * @swagger
 * /api/repartidores/me:
 *   get:
 *     summary: Obtiene la información del repartidor autenticado
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Información del repartidor
 *       '403':
 *         description: Usuario no tiene permisos de repartidor
 *       '404':
 *         description: Repartidor no encontrado
 */
router.get('/me', authMiddleware, requireRepartidor, async (req, res) => {
  try {
    // Buscar el documento del repartidor usando el userId (Firebase Auth UID)
    const repartidoresSnapshot = await db.collection('repartidores')
      .where('userId', '==', req.user.uid)
      .where('deleted', '==', false)
      .limit(1)
      .get();

    if (repartidoresSnapshot.empty) {
      return res.status(404).json({
        message: 'Repartidor no encontrado. Contacta al administrador.'
      });
    }

    const repartidorDoc = repartidoresSnapshot.docs[0];
    const repartidorData = {
      id: repartidorDoc.id,
      ...repartidorDoc.data()
    };

    // Remover campos sensibles si es necesario
    delete repartidorData.deleted;

    res.status(200).json(repartidorData);

  } catch (error) {
    console.error('Error fetching repartidor data:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/repartidores/me/pedidos:
 *   get:
 *     summary: Obtiene los pedidos asignados al repartidor autenticado
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Preparando, En Reparto, Entregado]
 *         description: Filtrar por estado del pedido
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           enum: [today, week, all]
 *         description: Filtrar por rango de fecha
 *     responses:
 *       '200':
 *         description: Lista de pedidos asignados
 *       '403':
 *         description: Usuario no tiene permisos de repartidor
 *       '404':
 *         description: Repartidor no encontrado
 */
/**
 * @swagger
 * /api/repartidores/me/update-location:
 *   put:
 *     summary: Actualiza la ubicación actual del repartidor en tiempo real
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lat:
 *                 type: number
 *               lng:
 *                 type: number
 *               accuracy:
 *                 type: number
 *               heading:
 *                 type: number
 *               speed:
 *                 type: number
 *               orderId:
 *                 type: string
 *                 description: ID del pedido activo en reparto
 *     responses:
 *       '200':
 *         description: Ubicación actualizada
 *       '400':
 *         description: Datos inválidos o pedido no en estado En Reparto
 *       '403':
 *         description: Pedido no asignado a este repartidor
 */
router.put('/me/update-location', authMiddleware, requireRepartidor, async (req, res) => {
  try {
    const { lat, lng, accuracy, heading, speed, orderId } = req.body;

    // Validar que se proporcionen coordenadas
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({
        message: 'Se requieren coordenadas válidas (lat, lng)'
      });
    }

    // Validar precisión (rechazar ubicaciones muy imprecisas)
    if (accuracy && accuracy > 100) {
      return res.status(400).json({
        message: 'Precisión de ubicación insuficiente (>100m)'
      });
    }

    // Obtener el repartidor
    const repartidorSnapshot = await db.collection('repartidores')
      .where('userId', '==', req.user.uid)
      .where('deleted', '==', false)
      .limit(1)
      .get();

    if (repartidorSnapshot.empty) {
      return res.status(404).json({ message: 'Repartidor no encontrado' });
    }

    const repartidorDoc = repartidorSnapshot.docs[0];
    const repartidorId = repartidorDoc.id;

    const locationData = {
      lat,
      lng,
      accuracy: accuracy || null,
      heading: heading || null,
      speed: speed || null,
      timestamp: admin.firestore.Timestamp.now(),
    };

    // Actualizar ubicación del repartidor
    await repartidorDoc.ref.update({
      currentLocation: locationData,
      lastLocationUpdate: admin.firestore.Timestamp.now(),
      isTrackingActive: true,
    });

    // Si se proporciona orderId, actualizar también el pedido
    if (orderId) {
      const orderRef = db.collection('pedidos').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        return res.status(404).json({ message: 'Pedido no encontrado' });
      }

      const orderData = orderDoc.data();

      // Verificar que el pedido esté asignado a este repartidor
      if (orderData.driverId !== repartidorId) {
        return res.status(403).json({
          message: 'Este pedido no está asignado a ti'
        });
      }

      // Solo actualizar si el pedido está En Reparto
      if (orderData.status === 'En Reparto') {
        await orderRef.update({
          driverLocation: {
            lat,
            lng,
            timestamp: admin.firestore.Timestamp.now(),
          },
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Ubicación actualizada',
    });

  } catch (error) {
    console.error('Error updating driver location:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

router.get('/me/pedidos', authMiddleware, requireRepartidor, async (req, res) => {
  try {
    const { status, date } = req.query;

    // Primero obtener el ID del repartidor
    const repartidoresSnapshot = await db.collection('repartidores')
      .where('userId', '==', req.user.uid)
      .where('deleted', '==', false)
      .limit(1)
      .get();

    if (repartidoresSnapshot.empty) {
      return res.status(404).json({
        message: 'Repartidor no encontrado'
      });
    }

    const repartidorId = repartidoresSnapshot.docs[0].id;

    // Construir query para pedidos
    let pedidosQuery = db.collection('pedidos')
      .where('driverId', '==', repartidorId);

    // Filtrar por estado si se proporciona
    if (status) {
      pedidosQuery = pedidosQuery.where('status', '==', status);
    } else {
      // Por defecto, solo mostrar pedidos activos (no entregados)
      pedidosQuery = pedidosQuery.where('status', 'in', ['Preparando', 'En Reparto']);
    }

    // Filtrar por fecha
    if (date === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      pedidosQuery = pedidosQuery.where('createdAt', '>=', admin.firestore.Timestamp.fromDate(today));
    } else if (date === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      pedidosQuery = pedidosQuery.where('createdAt', '>=', admin.firestore.Timestamp.fromDate(weekAgo));
    }

    // Ordenar por fecha de creación (más recientes primero)
    pedidosQuery = pedidosQuery.orderBy('createdAt', 'desc');

    const pedidosSnapshot = await pedidosQuery.get();

    const pedidos = pedidosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({
      pedidos,
      count: pedidos.length
    });

  } catch (error) {
    console.error('Error fetching pedidos for repartidor:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/pedidos/{orderId}/marcar-en-camino:
 *   put:
 *     summary: Marca un pedido como "En Reparto"
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentLocation:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *     responses:
 *       '200':
 *         description: Pedido marcado como En Reparto
 *       '400':
 *         description: Estado actual no permite esta transición
 *       '403':
 *         description: El pedido no está asignado a este repartidor
 *       '404':
 *         description: Pedido no encontrado
 */
router.put('/:orderId/marcar-en-camino', authMiddleware, requireRepartidor, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { currentLocation } = req.body;

    // 1. Obtener el pedido
    const orderRef = db.collection('pedidos').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    const order = orderDoc.data();

    // 2. Verificar que el pedido está asignado a ESTE repartidor
    const repartidorSnapshot = await db.collection('repartidores')
      .where('userId', '==', req.user.uid)
      .where('deleted', '==', false)
      .limit(1)
      .get();

    if (repartidorSnapshot.empty) {
      return res.status(404).json({ message: 'Repartidor no encontrado' });
    }

    const repartidorId = repartidorSnapshot.docs[0].id;

    if (order.driverId !== repartidorId) {
      return res.status(403).json({
        message: 'Este pedido no está asignado a ti'
      });
    }

    // 3. Verificar que el estado actual permite la transición
    if (order.status !== 'Preparando') {
      return res.status(400).json({
        message: `No se puede marcar en camino desde estado: ${order.status}`
      });
    }

    // 4. Actualizar el pedido
    const now = admin.firestore.Timestamp.now();
    const updateData = {
      status: 'En Reparto',
      driverStartedDeliveryAt: now,
      statusHistory: admin.firestore.FieldValue.arrayUnion({
        status: 'En Reparto',
        timestamp: now,
        updatedBy: repartidorId,
        location: currentLocation || null,
      }),
      updatedAt: now
    };

    // Si se proporciona ubicación inicial, guardarla en el pedido
    if (currentLocation && currentLocation.lat && currentLocation.lng) {
      updateData.driverLocation = {
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        timestamp: now,
      };
    }

    await orderRef.update(updateData);

    // 5. Activar tracking en el repartidor
    const repartidorRef = repartidorSnapshot.docs[0].ref;
    await repartidorRef.update({
      isTrackingActive: true,
    });

    // Si se proporciona ubicación inicial, actualizar también en repartidor
    if (currentLocation && currentLocation.lat && currentLocation.lng) {
      await repartidorRef.update({
        currentLocation: {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          accuracy: currentLocation.accuracy || null,
          heading: currentLocation.heading || null,
          speed: currentLocation.speed || null,
          timestamp: now,
        },
        lastLocationUpdate: now,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Pedido marcado como En Reparto y tracking activado',
      order: {
        id: orderId,
        status: 'En Reparto'
      }
    });

  } catch (error) {
    console.error('Error al marcar pedido en camino:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/pedidos/{orderId}/marcar-entregado:
 *   put:
 *     summary: Marca un pedido como "Entregado" y libera al repartidor
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deliveryNotes:
 *                 type: string
 *               signature:
 *                 type: string
 *                 description: Firma digital en base64 (opcional)
 *     responses:
 *       '200':
 *         description: Pedido entregado exitosamente
 *       '400':
 *         description: Estado actual no permite esta transición
 *       '403':
 *         description: El pedido no está asignado a este repartidor
 *       '404':
 *         description: Pedido no encontrado
 */
router.put('/:orderId/marcar-entregado', authMiddleware, requireRepartidor, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryNotes, signature } = req.body;

    // 1. Obtener el pedido
    const orderRef = db.collection('pedidos').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    const order = orderDoc.data();

    // 2. Verificar que el pedido está asignado a ESTE repartidor
    const repartidorSnapshot = await db.collection('repartidores')
      .where('userId', '==', req.user.uid)
      .where('deleted', '==', false)
      .limit(1)
      .get();

    if (repartidorSnapshot.empty) {
      return res.status(404).json({ message: 'Repartidor no encontrado' });
    }

    const repartidorDoc = repartidorSnapshot.docs[0];
    const repartidorId = repartidorDoc.id;
    const repartidorData = repartidorDoc.data();

    if (order.driverId !== repartidorId) {
      return res.status(403).json({
        message: 'Este pedido no está asignado a ti'
      });
    }

    // 3. Verificar que el estado actual permite la transición
    if (order.status !== 'En Reparto') {
      return res.status(400).json({
        message: `No se puede marcar entregado desde estado: ${order.status}`
      });
    }

    // 4. Actualizar el pedido
    const deliveredAt = admin.firestore.Timestamp.now();

    const updateData = {
      status: 'Entregado',
      deliveredAt,
      statusHistory: admin.firestore.FieldValue.arrayUnion({
        status: 'Entregado',
        timestamp: deliveredAt,
        updatedBy: repartidorId,
        notes: deliveryNotes || null,
      }),
      updatedAt: deliveredAt
    };

    if (signature) {
      updateData.deliverySignature = signature;
    }

    if (deliveryNotes) {
      updateData.deliveryNotes = deliveryNotes;
    }

    await orderRef.update(updateData);

    // 5. Actualizar el estado del repartidor
    const repartidorRef = db.collection('repartidores').doc(repartidorId);
    const newAssignedCount = Math.max((repartidorData.assignedOrderCount || 1) - 1, 0);

    const repartidorUpdate = {
      assignedOrderCount: newAssignedCount,
      updatedAt: deliveredAt,
      // Desactivar tracking si no tiene más pedidos activos
      isTrackingActive: newAssignedCount > 0,
    };

    // Si no tiene más pedidos asignados, cambiar status a disponible
    if (newAssignedCount === 0) {
      repartidorUpdate.status = 'disponible';
    }

    await repartidorRef.update(repartidorUpdate);

    res.status(200).json({
      success: true,
      message: 'Pedido entregado exitosamente',
      order: {
        id: orderId,
        status: 'Entregado',
        deliveredAt: deliveredAt.toDate()
      },
      driverStatusUpdated: true
    });

  } catch (error) {
    console.error('Error al marcar pedido entregado:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
