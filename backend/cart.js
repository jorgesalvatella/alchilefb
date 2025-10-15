const express = require('express');
const admin = require('firebase-admin');

const router = express.Router();
const db = admin.firestore();

async function verifyCartTotals(items) {
  if (!items || !Array.isArray(items)) {
    throw new Error('Request body must contain an array of items.');
  }

  let grandSubtotal = 0;
  let grandTotal = 0;
  const detailedItems = [];

  for (const item of items) {
    if (!item.productId || !item.quantity) {
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

    const finalItemSubtotal = itemSubtotal * item.quantity;
    const finalItemTotal = itemTotal * item.quantity;

    grandSubtotal += finalItemSubtotal;
    grandTotal += finalItemTotal;

    detailedItems.push({
      ...item,
      name: customName,
      subtotalItem: finalItemSubtotal,
      totalItem: finalItemTotal,
      removed: (item.customizations && item.customizations.removed) || [],
    });
  }

  const ivaDesglosado = grandTotal - grandSubtotal;

  return {
    items: detailedItems,
    summary: {
      subtotalGeneral: grandSubtotal,
      ivaDesglosado: ivaDesglosado,
      totalFinal: grandTotal,
    },
  };
}

router.post('/verify-totals', async (req, res) => {
  try {
    const result = await verifyCartTotals(req.body.items);
    res.status(200).json(result);
  } catch (error) {
    // Si el error es por validación, es un error del cliente (400)
    if (error.message.includes('Request body must contain') || error.message.includes('Invalid item in cart') || error.message.includes('no encontrado')) {
      return res.status(400).json({ message: error.message });
    }
    // Otros errores son del servidor (500)
    console.error("Error verifying cart totals:", error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

module.exports = { router, verifyCartTotals };
