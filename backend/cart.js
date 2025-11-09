const express = require('express');
const admin = require('firebase-admin');
const authMiddleware = require('./authMiddleware');

const router = express.Router();
const db = admin.firestore();

/**
 * Obtiene y valida las promociones activas del sistema
 */
async function getActivePromotions() {
  const now = new Date();
  const snapshot = await db.collection('promotions')
    .where('isActive', '==', true)
    .where('deletedAt', '==', null)
    .get();

  const activePromotions = [];

  snapshot.forEach(doc => {
    const data = doc.data();

    // Validar vigencia de fechas
    if (data.startDate && data.startDate.toDate() > now) {
      return; // Promoción aún no inicia
    }
    if (data.endDate && data.endDate.toDate() < now) {
      return; // Promoción ya expiró
    }

    activePromotions.push({
      id: doc.id,
      ...data
    });
  });

  return activePromotions;
}

/**
 * Calcula el precio de un paquete incluyendo personalizaciones
 */
async function calculatePackagePrice(packageData, customizations) {
  let packageTotal = packageData.packagePrice;
  let packageSubtotal = packageData.packagePrice / 1.16; // Asumimos que los paquetes son gravables
  const packageItemsDetails = [];

  // Procesar cada producto del paquete
  for (const packageItem of packageData.packageItems) {
    const productRef = db.collection('productosDeVenta').doc(packageItem.productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      throw new Error(`Producto ${packageItem.productId} del paquete no encontrado`);
    }

    const productData = productDoc.data();
    const addedCustomizations = [];

    // Procesar extras agregados al producto específico del paquete
    if (customizations && customizations[packageItem.productId] && customizations[packageItem.productId].added) {
      for (const addedItemName of customizations[packageItem.productId].added) {
        const extra = (productData.ingredientesExtra || []).find(e => e.nombre === addedItemName);
        if (extra && extra.precio) {
          const extraPrice = parseFloat(extra.precio);
          packageTotal += extraPrice * packageItem.quantity;

          if (productData.isTaxable) {
            const extraBasePrice = extraPrice / 1.16;
            packageSubtotal += extraBasePrice * packageItem.quantity;
          } else {
            packageSubtotal += extraPrice * packageItem.quantity;
          }

          addedCustomizations.push(extra.nombre);
        }
      }
    }

    packageItemsDetails.push({
      productId: packageItem.productId,
      name: packageItem.name,
      quantity: packageItem.quantity,
      addedCustomizations: addedCustomizations
    });
  }

  return {
    packageTotal,
    packageSubtotal,
    packageItemsDetails
  };
}

/**
 * Aplica descuentos de promociones a un item
 */
function applyPromotionDiscount(itemTotal, itemSubtotal, productId, categoryId, promotions) {
  let discount = 0;
  let discountSubtotal = 0;
  let appliedPromotion = null;

  for (const promo of promotions) {
    if (promo.type !== 'promotion') continue;

    let applies = false;

    // Verificar si la promoción aplica a este producto
    if (promo.appliesTo === 'product') {
      applies = promo.targetIds.includes(productId);
    } else if (promo.appliesTo === 'category') {
      applies = promo.targetIds.includes(categoryId);
    }

    if (applies) {
      // Calcular descuento
      if (promo.promoType === 'percentage') {
        discount = itemTotal * (promo.promoValue / 100);
        discountSubtotal = itemSubtotal * (promo.promoValue / 100);
      } else if (promo.promoType === 'fixed_amount') {
        discount = promo.promoValue;
        discountSubtotal = promo.promoValue / 1.16; // Asumimos gravable
      }

      appliedPromotion = {
        id: promo.id,
        name: promo.name,
        discount: discount
      };

      break; // Solo aplicar la primera promoción que coincida
    }
  }

  return {
    discount,
    discountSubtotal,
    appliedPromotion
  };
}

async function verifyCartTotals(items) {
  if (!items || !Array.isArray(items)) {
    throw new Error('Request body must contain an array of items.');
  }

  let grandSubtotal = 0;
  let grandTotal = 0;
  const detailedItems = [];

  // Obtener promociones activas
  const activePromotions = await getActivePromotions();

  for (const item of items) {
    // Verificar si es un paquete o producto normal
    if (item.packageId) {
      // Es un paquete
      if (!item.packageId || !item.quantity) {
        throw new Error(`Invalid package item in cart: ${JSON.stringify(item)}`);
      }

      const packageRef = db.collection('promotions').doc(item.packageId);
      const packageSnap = await packageRef.get();

      if (!packageSnap.exists) {
        throw new Error(`Paquete con ID ${item.packageId} no encontrado.`);
      }

      const packageData = packageSnap.data();

      if (packageData.type !== 'package') {
        throw new Error(`El ID ${item.packageId} no corresponde a un paquete válido.`);
      }

      // Calcular precio del paquete con personalizaciones
      const { packageTotal, packageSubtotal, packageItemsDetails } = await calculatePackagePrice(
        packageData,
        item.packageCustomizations
      );

      const finalItemSubtotal = packageSubtotal * item.quantity;
      const finalItemTotal = packageTotal * item.quantity;

      grandSubtotal += finalItemSubtotal;
      grandTotal += finalItemTotal;

      detailedItems.push({
        type: 'package',
        packageId: item.packageId,
        packageName: packageData.name,
        quantity: item.quantity,
        packageItems: packageItemsDetails,
        subtotalItem: finalItemSubtotal,
        totalItem: finalItemTotal,
      });

    } else if (item.productId) {
      // Es un producto normal
      if (!item.quantity) {
        throw new Error(`Invalid item in cart: ${JSON.stringify(item)}`);
      }

      const productRef = db.collection('productosDeVenta').doc(item.productId);
      const docSnap = await productRef.get();

      if (!docSnap.exists) {
        throw new Error(`Producto con ID ${item.productId} no encontrado.`);
      }

      const productData = docSnap.data();
      let itemSubtotal = productData.basePrice || 0;
      let itemTotal = productData.price || 0;
      let customName = productData.name;
      const addedCustomizations = [];

      if (item.customizations && item.customizations.added && Array.isArray(item.customizations.added)) {
        for (const addedItemName of item.customizations.added) {
          const extra = (productData.ingredientesExtra || []).find(e => e.nombre === addedItemName);
          if (extra && extra.precio) {
            const extraPrice = parseFloat(extra.precio);
            itemTotal += extraPrice;
            if (productData.isTaxable) {
              const extraBasePrice = extraPrice / 1.16;
              itemSubtotal += extraBasePrice;
            } else {
              itemSubtotal += extraPrice;
            }
            addedCustomizations.push(extra.nombre);
          }
        }
      }

      if (addedCustomizations.length > 0) {
        customName = `${productData.name} (+ ${addedCustomizations.join(', ')})`;
      }

      // Aplicar descuentos de promociones
      const { discount, discountSubtotal, appliedPromotion } = applyPromotionDiscount(
        itemTotal,
        itemSubtotal,
        item.productId,
        productData.categoriaVentaId,
        activePromotions
      );

      itemTotal -= discount;
      itemSubtotal -= discountSubtotal;

      const finalItemSubtotal = itemSubtotal * item.quantity;
      const finalItemTotal = itemTotal * item.quantity;

      grandSubtotal += finalItemSubtotal;
      grandTotal += finalItemTotal;

      detailedItems.push({
        type: 'product',
        ...item,
        name: customName,
        subtotalItem: finalItemSubtotal,
        totalItem: finalItemTotal,
        removed: (item.customizations && item.customizations.removed) || [],
        // Multiplicar el descuento por la cantidad para retornar el descuento total
        // (no solo el descuento unitario). Esto es más útil para el frontend.
        appliedPromotion: appliedPromotion ? {
          ...appliedPromotion,
          discount: appliedPromotion.discount * item.quantity
        } : null
      });

    } else {
      throw new Error(`Invalid item in cart: must have either productId or packageId`);
    }
  }

  // Aplicar promociones de total de pedido
  let orderDiscount = 0;
  let orderDiscountSubtotal = 0;
  let appliedOrderPromotion = null;

  for (const promo of activePromotions) {
    if (promo.type === 'promotion' && promo.appliesTo === 'total_order') {
      if (promo.promoType === 'percentage') {
        orderDiscount = grandTotal * (promo.promoValue / 100);
        orderDiscountSubtotal = grandSubtotal * (promo.promoValue / 100);
      } else if (promo.promoType === 'fixed_amount') {
        orderDiscount = promo.promoValue;
        orderDiscountSubtotal = promo.promoValue / 1.16;
      }

      appliedOrderPromotion = {
        id: promo.id,
        name: promo.name,
        discount: orderDiscount
      };

      break; // Solo aplicar la primera promoción de orden total
    }
  }

  grandTotal -= orderDiscount;
  grandSubtotal -= orderDiscountSubtotal;

  const ivaDesglosado = grandTotal - grandSubtotal;

  return {
    items: detailedItems,
    summary: {
      subtotalGeneral: grandSubtotal,
      ivaDesglosado: ivaDesglosado,
      totalFinal: grandTotal,
      appliedOrderPromotion: appliedOrderPromotion
    },
  };
}

router.post('/verify-totals', authMiddleware, async (req, res) => {
  try {
    const result = await verifyCartTotals(req.body.items);
    res.status(200).json(result);
  } catch (error) {
    // Si el error es por validación, es un error del cliente (400)
    if (error.message.includes('Request body must contain') ||
        error.message.includes('Invalid item in cart') ||
        error.message.includes('no encontrado') ||
        error.message.includes('no corresponde')) {
      return res.status(400).json({ message: error.message });
    }
    // Otros errores son del servidor (500)
    console.error("Error verifying cart totals:", error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

module.exports = { router, verifyCartTotals };
