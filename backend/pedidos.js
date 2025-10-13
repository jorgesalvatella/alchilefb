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
      customizations: item.customizations,
    }));
    const verificationResult = await verifyCartTotals(itemsToVerify);

    // 2. Construir el objeto del pedido
    const newOrder = {
      userId,
      items: verificationResult.items,
      totalVerified: verificationResult.summary.totalFinal,
      paymentMethod,
      shippingAddress,
      status: 'Recibido',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // 3. Guardar en Firestore
    const docRef = await db.collection('pedidos').add(newOrder);

    // 4. Devolver respuesta
    res.status(201).json({ id: docRef.id, ...newOrder });

  } catch (error) {
    console.error('Error creando pedido:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
