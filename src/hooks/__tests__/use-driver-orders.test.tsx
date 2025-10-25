import { renderHook, waitFor } from '@testing-library/react';
import { useDriverOrders } from '../use-driver-orders';
import { useUser } from '@/firebase/provider';
import { Timestamp } from 'firebase/firestore';

// Mock de Firebase provider
jest.mock('@/firebase/provider', () => ({
  useUser: jest.fn(),
}));

const mockUseUser = useUser as jest.Mock;

describe('useDriverOrders', () => {
  const mockUser = {
    uid: 'driver-123',
    email: 'driver@test.com',
    getIdToken: jest.fn(() => Promise.resolve('test-token')),
  };

  const mockApiOrders = {
    pedidos: [
      {
        id: 'order-1',
        driverId: 'driver-123',
        status: 'Pendiente',
        userId: 'user-1',
        items: [{ name: 'Taco', quantity: 2, price: 50 }],
        totalVerified: 100,
        shippingAddress: { street: 'Calle 1' },
        createdAt: {
          _seconds: 1704067200,
          _nanoseconds: 0,
        },
      },
      {
        id: 'order-2',
        driverId: 'driver-123',
        status: 'En Reparto',
        userId: 'user-2',
        items: [{ name: 'Burrito', quantity: 1, price: 75 }],
        totalVerified: 75,
        shippingAddress: { street: 'Calle 2' },
        createdAt: {
          _seconds: 1704153600,
          _nanoseconds: 500000000,
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUseUser.mockReturnValue({ user: mockUser, isUserLoading: false });

    // Mock de fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApiOrders),
      })
    ) as jest.Mock;

    // Mock de console methods
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should not fetch orders when user is not authenticated', () => {
    mockUseUser.mockReturnValue({ user: null, isUserLoading: false });

    const { result } = renderHook(() => useDriverOrders());

    expect(result.current.loading).toBe(false);
    expect(result.current.orders).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should fetch orders on mount when user is authenticated', async () => {
    const { result } = renderHook(() => useDriverOrders());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/repartidores/me/pedidos',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-token',
          },
        })
      );
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.orders).toHaveLength(2);
    });
  });

  it('should convert API timestamps to Firestore Timestamp objects', async () => {
    const { result } = renderHook(() => useDriverOrders());

    await waitFor(() => {
      expect(result.current.orders).toHaveLength(2);
    });

    const firstOrder = result.current.orders[0];
    expect(firstOrder.createdAt).toBeInstanceOf(Timestamp);
    expect(firstOrder.createdAt.seconds).toBe(1704067200);
    expect(firstOrder.createdAt.nanoseconds).toBe(0);

    const secondOrder = result.current.orders[1];
    expect(secondOrder.createdAt).toBeInstanceOf(Timestamp);
    expect(secondOrder.createdAt.seconds).toBe(1704153600);
    expect(secondOrder.createdAt.nanoseconds).toBe(500000000);
  });

  it('should preserve all order properties', async () => {
    const { result } = renderHook(() => useDriverOrders());

    await waitFor(() => {
      expect(result.current.orders).toHaveLength(2);
    });

    const order = result.current.orders[0];
    expect(order.id).toBe('order-1');
    expect(order.driverId).toBe('driver-123');
    expect(order.status).toBe('Pendiente');
    expect(order.userId).toBe('user-1');
    expect(order.items).toEqual([{ name: 'Taco', quantity: 2, price: 50 }]);
    expect(order.totalVerified).toBe(100);
    expect(order.shippingAddress).toEqual({ street: 'Calle 1' });
  });

  it('should setup auto-refresh interval every 15 seconds', async () => {
    renderHook(() => useDriverOrders());

    // Initial fetch
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Clear the mock to count only interval calls
    (global.fetch as jest.Mock).mockClear();

    // Advance time by 15 seconds
    jest.advanceTimersByTime(15000);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Advance another 15 seconds
    jest.advanceTimersByTime(15000);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should cleanup interval on unmount', async () => {
    const { unmount } = renderHook(() => useDriverOrders());

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const initialCallCount = (global.fetch as jest.Mock).mock.calls.length;

    unmount();

    // Advance time - should NOT trigger more fetches
    jest.advanceTimersByTime(15000);

    expect(global.fetch).toHaveBeenCalledTimes(initialCallCount);
  });

  it('should handle API error', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      })
    ) as jest.Mock;

    const { result } = renderHook(() => useDriverOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Unauthorized');
      expect(result.current.orders).toEqual([]);
    });
  });

  it('should handle network error', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error'))) as jest.Mock;

    const { result } = renderHook(() => useDriverOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Network error');
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching driver orders:',
        expect.any(Error)
      );
    });
  });

  it('should handle empty response', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ pedidos: [] }),
      })
    ) as jest.Mock;

    const { result } = renderHook(() => useDriverOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.orders).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  it('should handle response without pedidos property', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    ) as jest.Mock;

    const { result } = renderHook(() => useDriverOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.orders).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  it('should refetch orders when refetch is called', async () => {
    const { result } = renderHook(() => useDriverOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.orders).toHaveLength(2);
    });

    // Clear fetch calls
    (global.fetch as jest.Mock).mockClear();

    // Call refetch
    result.current.refetch();

    // Wait for loading to become true, then false
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should clear error on successful refetch', async () => {
    // First call fails
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'Server error' }),
      })
    ) as jest.Mock;

    const { result } = renderHook(() => useDriverOrders());

    await waitFor(() => {
      expect(result.current.error).toBe('Server error');
    });

    // Now make it succeed
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApiOrders),
      })
    ) as jest.Mock;

    result.current.refetch();

    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.orders).toHaveLength(2);
    });
  });

  it('should reset orders when user logs out', async () => {
    const { result, rerender } = renderHook(() => useDriverOrders());

    await waitFor(() => {
      expect(result.current.orders).toHaveLength(2);
    });

    // User logs out
    mockUseUser.mockReturnValue({ user: null, isUserLoading: false });
    rerender();

    await waitFor(() => {
      expect(result.current.orders).toEqual([]);
      expect(result.current.loading).toBe(false);
    });
  });

  it('should handle orders without createdAt timestamp', async () => {
    const ordersWithoutTimestamp = {
      pedidos: [
        {
          id: 'order-3',
          driverId: 'driver-123',
          status: 'Pendiente',
          userId: 'user-3',
          items: [],
          totalVerified: 50,
          shippingAddress: {},
          // No createdAt
        },
      ],
    };

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(ordersWithoutTimestamp),
      })
    ) as jest.Mock;

    const { result } = renderHook(() => useDriverOrders());

    await waitFor(() => {
      expect(result.current.orders).toHaveLength(1);
      expect(result.current.orders[0].createdAt).toBeNull();
    });
  });

  it('should cleanup and restart interval when user changes', async () => {
    const { rerender } = renderHook(() => useDriverOrders());

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const initialCallCount = (global.fetch as jest.Mock).mock.calls.length;

    // Change user
    const newUser = {
      uid: 'driver-456',
      email: 'newdriver@test.com',
      getIdToken: jest.fn(() => Promise.resolve('new-token')),
    };

    mockUseUser.mockReturnValue({ user: newUser, isUserLoading: false });
    rerender();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/repartidores/me/pedidos',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer new-token',
          },
        })
      );
    });

    // Should have made a new initial fetch
    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(initialCallCount);
  });
});
