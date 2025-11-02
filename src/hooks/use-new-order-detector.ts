import { useEffect, useRef } from 'react';

interface Order {
  id: string;
  [key: string]: any;
}

interface UseNewOrderDetectorOptions {
  orders: Order[];
  onNewOrder?: (order: Order) => void;
}

/**
 * Hook para detectar cuando llega un nuevo pedido a la lista en tiempo real.
 * Solo detecta nuevos pedidos DESPUÉS de la carga inicial (no en el primer render).
 */
export function useNewOrderDetector({ orders, onNewOrder }: UseNewOrderDetectorOptions) {
  const previousOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    // Si es la carga inicial, solo guardar los IDs actuales y marcar como cargado
    if (isInitialLoadRef.current) {
      const currentIds = new Set(orders.map(order => order.id));
      previousOrderIdsRef.current = currentIds;
      isInitialLoadRef.current = false;
      return;
    }

    // Comparar con los IDs anteriores para detectar nuevos pedidos
    const currentIds = new Set(orders.map(order => order.id));
    const newOrderIds: string[] = [];

    currentIds.forEach(id => {
      if (!previousOrderIdsRef.current.has(id)) {
        newOrderIds.push(id);
      }
    });

    // Si hay nuevos pedidos, llamar al callback por cada uno
    if (newOrderIds.length > 0 && onNewOrder) {
      newOrderIds.forEach(id => {
        const order = orders.find(o => o.id === id);
        if (order) {
          onNewOrder(order);
        }
      });
    }

    // Actualizar la referencia con los IDs actuales
    previousOrderIdsRef.current = currentIds;
  }, [orders, onNewOrder]);
}
