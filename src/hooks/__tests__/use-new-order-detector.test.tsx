import { renderHook } from '@testing-library/react';
import { useNewOrderDetector } from '../use-new-order-detector';

describe('useNewOrderDetector', () => {
  it('should not call onNewOrder on initial load', () => {
    const onNewOrder = jest.fn();
    const orders = [
      { id: '1', status: 'Preparando' },
      { id: '2', status: 'En Reparto' },
    ];

    renderHook(() => useNewOrderDetector({ orders, onNewOrder }));

    // No debe llamarse en la carga inicial
    expect(onNewOrder).not.toHaveBeenCalled();
  });

  it('should detect and call onNewOrder when a new order is added', () => {
    const onNewOrder = jest.fn();
    const initialOrders = [
      { id: '1', status: 'Preparando' },
      { id: '2', status: 'En Reparto' },
    ];

    const { rerender } = renderHook(
      ({ orders }) => useNewOrderDetector({ orders, onNewOrder }),
      { initialProps: { orders: initialOrders } }
    );

    // Primera carga - no debe llamarse
    expect(onNewOrder).not.toHaveBeenCalled();

    // Agregar nuevo pedido
    const newOrders = [
      { id: '3', status: 'Preparando' },
      ...initialOrders,
    ];

    rerender({ orders: newOrders });

    // Debe detectar el nuevo pedido
    expect(onNewOrder).toHaveBeenCalledTimes(1);
    expect(onNewOrder).toHaveBeenCalledWith({ id: '3', status: 'Preparando' });
  });

  it('should detect multiple new orders added simultaneously', () => {
    const onNewOrder = jest.fn();
    const initialOrders = [
      { id: '1', status: 'Preparando' },
    ];

    const { rerender } = renderHook(
      ({ orders }) => useNewOrderDetector({ orders, onNewOrder }),
      { initialProps: { orders: initialOrders } }
    );

    expect(onNewOrder).not.toHaveBeenCalled();

    // Agregar múltiples pedidos nuevos
    const newOrders = [
      { id: '2', status: 'Preparando' },
      { id: '3', status: 'En Reparto' },
      { id: '4', status: 'Preparando' },
      ...initialOrders,
    ];

    rerender({ orders: newOrders });

    // Debe detectar los 3 nuevos pedidos
    expect(onNewOrder).toHaveBeenCalledTimes(3);
    expect(onNewOrder).toHaveBeenCalledWith({ id: '2', status: 'Preparando' });
    expect(onNewOrder).toHaveBeenCalledWith({ id: '3', status: 'En Reparto' });
    expect(onNewOrder).toHaveBeenCalledWith({ id: '4', status: 'Preparando' });
  });

  it('should not call onNewOrder when orders are removed', () => {
    const onNewOrder = jest.fn();
    const initialOrders = [
      { id: '1', status: 'Preparando' },
      { id: '2', status: 'En Reparto' },
      { id: '3', status: 'Preparando' },
    ];

    const { rerender } = renderHook(
      ({ orders }) => useNewOrderDetector({ orders, onNewOrder }),
      { initialProps: { orders: initialOrders } }
    );

    expect(onNewOrder).not.toHaveBeenCalled();

    // Remover un pedido
    const updatedOrders = [
      { id: '1', status: 'Preparando' },
      { id: '3', status: 'Preparando' },
    ];

    rerender({ orders: updatedOrders });

    // No debe llamarse porque solo se removió un pedido
    expect(onNewOrder).not.toHaveBeenCalled();
  });

  it('should not call onNewOrder when order data changes but IDs remain the same', () => {
    const onNewOrder = jest.fn();
    const initialOrders = [
      { id: '1', status: 'Preparando' },
      { id: '2', status: 'En Reparto' },
    ];

    const { rerender } = renderHook(
      ({ orders }) => useNewOrderDetector({ orders, onNewOrder }),
      { initialProps: { orders: initialOrders } }
    );

    expect(onNewOrder).not.toHaveBeenCalled();

    // Cambiar datos pero mantener IDs
    const updatedOrders = [
      { id: '1', status: 'Entregado' }, // Status cambió
      { id: '2', status: 'En Reparto' },
    ];

    rerender({ orders: updatedOrders });

    // No debe llamarse porque no hay nuevos IDs
    expect(onNewOrder).not.toHaveBeenCalled();
  });

  it('should handle empty orders array', () => {
    const onNewOrder = jest.fn();
    const initialOrders: any[] = [];

    const { rerender } = renderHook(
      ({ orders }) => useNewOrderDetector({ orders, onNewOrder }),
      { initialProps: { orders: initialOrders } }
    );

    expect(onNewOrder).not.toHaveBeenCalled();

    // Agregar pedidos desde vacío
    const newOrders = [
      { id: '1', status: 'Preparando' },
    ];

    rerender({ orders: newOrders });

    // Debe detectar el nuevo pedido
    expect(onNewOrder).toHaveBeenCalledTimes(1);
    expect(onNewOrder).toHaveBeenCalledWith({ id: '1', status: 'Preparando' });
  });

  it('should work without onNewOrder callback', () => {
    const initialOrders = [{ id: '1', status: 'Preparando' }];

    const { rerender } = renderHook(
      ({ orders }) => useNewOrderDetector({ orders }),
      { initialProps: { orders: initialOrders } }
    );

    // Agregar nuevo pedido
    const newOrders = [
      { id: '2', status: 'Preparando' },
      ...initialOrders,
    ];

    // No debe lanzar error sin callback
    expect(() => rerender({ orders: newOrders })).not.toThrow();
  });

  it('should continuously detect new orders across multiple updates', () => {
    const onNewOrder = jest.fn();
    const initialOrders = [
      { id: '1', status: 'Preparando' },
    ];

    const { rerender } = renderHook(
      ({ orders }) => useNewOrderDetector({ orders, onNewOrder }),
      { initialProps: { orders: initialOrders } }
    );

    expect(onNewOrder).not.toHaveBeenCalled();

    // Primera actualización
    const secondOrders = [
      { id: '2', status: 'Preparando' },
      ...initialOrders,
    ];
    rerender({ orders: secondOrders });
    expect(onNewOrder).toHaveBeenCalledTimes(1);

    // Segunda actualización
    const thirdOrders = [
      { id: '3', status: 'En Reparto' },
      ...secondOrders,
    ];
    rerender({ orders: thirdOrders });
    expect(onNewOrder).toHaveBeenCalledTimes(2);

    // Tercera actualización
    const fourthOrders = [
      { id: '4', status: 'Preparando' },
      ...thirdOrders,
    ];
    rerender({ orders: fourthOrders });
    expect(onNewOrder).toHaveBeenCalledTimes(3);
  });
});
