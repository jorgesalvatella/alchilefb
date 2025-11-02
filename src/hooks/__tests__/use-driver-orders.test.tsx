import { renderHook, waitFor } from '@testing-library/react';
import { useDriverOrders } from '../use-driver-orders';
import { useUser, useFirestore } from '@/firebase/provider';
import { Timestamp } from 'firebase/firestore';

// Mock de Firestore
const mockOnSnapshot = jest.fn();
const mockCollection = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: (...args: any[]) => mockCollection(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  orderBy: (...args: any[]) => mockOrderBy(...args),
  onSnapshot: (...args: any[]) => mockOnSnapshot(...args),
  Timestamp: jest.requireActual('firebase/firestore').Timestamp,
}));

// Mock de Firebase provider
jest.mock('@/firebase/provider', () => ({
  useUser: jest.fn(),
  useFirestore: jest.fn(),
}));

const mockUseUser = useUser as jest.Mock;
const mockUseFirestore = useFirestore as jest.Mock;

describe('useDriverOrders', () => {
  const mockUser = {
    uid: 'driver-123',
    email: 'driver@test.com',
    getIdToken: jest.fn(() => Promise.resolve('test-token')),
  };

  const mockFirestore = { collection: mockCollection };

  const mockFirestoreOrders = [
    {
      id: 'order-1',
      driverId: 'driver-123',
      status: 'Pendiente',
      userId: 'user-1',
      items: [{ name: 'Taco', quantity: 2, price: 50 }],
      totalVerified: 100,
      shippingAddress: { street: 'Calle 1' },
      createdAt: new Timestamp(1704067200, 0),
    },
    {
      id: 'order-2',
      driverId: 'driver-123',
      status: 'En Reparto',
      userId: 'user-2',
      items: [{ name: 'Burrito', quantity: 1, price: 75 }],
      totalVerified: 75,
      shippingAddress: { street: 'Calle 2' },
      createdAt: new Timestamp(1704153600, 500000000),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseUser.mockReturnValue({ user: mockUser, isUserLoading: false });
    mockUseFirestore.mockReturnValue(mockFirestore);

    // Setup default onSnapshot behavior - returns orders
    mockOnSnapshot.mockImplementation((query, successCallback) => {
      const mockQuerySnapshot = {
        forEach: (callback: any) => {
          mockFirestoreOrders.forEach(order => {
            callback({
              data: () => order,
              id: order.id,
            });
          });
        },
      };
      successCallback(mockQuerySnapshot);
      return jest.fn(); // unsubscribe function
    });

    // Mock de console methods
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should not subscribe to orders when user is not authenticated', () => {
    mockUseUser.mockReturnValue({ user: null, isUserLoading: false });

    const { result } = renderHook(() => useDriverOrders());

    expect(result.current.loading).toBe(false);
    expect(result.current.orders).toEqual([]);
    expect(mockOnSnapshot).not.toHaveBeenCalled();
  });

  it('should not subscribe to orders when firestore is not available', () => {
    mockUseFirestore.mockReturnValue(null);

    const { result } = renderHook(() => useDriverOrders());

    expect(result.current.loading).toBe(false);
    expect(result.current.orders).toEqual([]);
    expect(mockOnSnapshot).not.toHaveBeenCalled();
  });

  it('should subscribe to orders on mount when user is authenticated', async () => {
    const { result } = renderHook(() => useDriverOrders());

    await waitFor(() => {
      expect(mockOnSnapshot).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalledWith('driverId', '==', 'driver-123');
      expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.orders).toHaveLength(2);
    });
  });

  it('should have Firestore Timestamp objects in orders', async () => {
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

  it('should cleanup subscription on unmount', async () => {
    const mockUnsubscribe = jest.fn();
    mockOnSnapshot.mockImplementation((query, successCallback) => {
      const mockQuerySnapshot = {
        forEach: (callback: any) => {
          mockFirestoreOrders.forEach(order => {
            callback({
              data: () => order,
              id: order.id,
            });
          });
        },
      };
      successCallback(mockQuerySnapshot);
      return mockUnsubscribe;
    });

    const { unmount } = renderHook(() => useDriverOrders());

    await waitFor(() => {
      expect(mockOnSnapshot).toHaveBeenCalled();
    });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should handle Firestore error', async () => {
    mockOnSnapshot.mockImplementation((query, successCallback, errorCallback) => {
      errorCallback(new Error('Permission denied'));
      return jest.fn();
    });

    const { result } = renderHook(() => useDriverOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Permission denied');
      expect(result.current.orders).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching driver orders:',
        expect.any(Error)
      );
    });
  });

  it('should handle empty result from Firestore', async () => {
    mockOnSnapshot.mockImplementation((query, successCallback) => {
      const emptyQuerySnapshot = {
        forEach: (callback: any) => {
          // No orders
        },
      };
      successCallback(emptyQuerySnapshot);
      return jest.fn();
    });

    const { result } = renderHook(() => useDriverOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.orders).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  it('should handle refetch call (no-op with real-time)', async () => {
    const { result } = renderHook(() => useDriverOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.orders).toHaveLength(2);
    });

    // Call refetch - should just log a message
    result.current.refetch();

    // Verify console.log was called
    expect(console.log).toHaveBeenCalledWith(
      '[useDriverOrders] Refetch called - data is already real-time'
    );
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

  it('should cleanup and resubscribe when user changes', async () => {
    const mockUnsubscribe1 = jest.fn();
    const mockUnsubscribe2 = jest.fn();

    let callCount = 0;
    mockOnSnapshot.mockImplementation((query, successCallback) => {
      const mockQuerySnapshot = {
        forEach: (callback: any) => {
          mockFirestoreOrders.forEach(order => {
            callback({
              data: () => order,
              id: order.id,
            });
          });
        },
      };
      successCallback(mockQuerySnapshot);

      callCount++;
      return callCount === 1 ? mockUnsubscribe1 : mockUnsubscribe2;
    });

    const { rerender } = renderHook(() => useDriverOrders());

    await waitFor(() => {
      expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
    });

    // Change user
    const newUser = {
      uid: 'driver-456',
      email: 'newdriver@test.com',
      getIdToken: jest.fn(() => Promise.resolve('new-token')),
    };

    mockUseUser.mockReturnValue({ user: newUser, isUserLoading: false });
    rerender();

    await waitFor(() => {
      // Should have unsubscribed from old subscription
      expect(mockUnsubscribe1).toHaveBeenCalled();
      // Should have created new subscription
      expect(mockOnSnapshot).toHaveBeenCalledTimes(2);
      expect(mockWhere).toHaveBeenCalledWith('driverId', '==', 'driver-456');
    });
  });

  it('should update orders in real-time when data changes', async () => {
    let updateCallback: any;

    mockOnSnapshot.mockImplementation((query, successCallback) => {
      updateCallback = successCallback;

      // Initial data
      const mockQuerySnapshot = {
        forEach: (callback: any) => {
          mockFirestoreOrders.forEach(order => {
            callback({
              data: () => order,
              id: order.id,
            });
          });
        },
      };
      successCallback(mockQuerySnapshot);
      return jest.fn();
    });

    const { result } = renderHook(() => useDriverOrders());

    await waitFor(() => {
      expect(result.current.orders).toHaveLength(2);
    });

    // Simulate real-time update with new order
    const newOrder = {
      id: 'order-3',
      driverId: 'driver-123',
      status: 'Preparando',
      userId: 'user-3',
      items: [{ name: 'Quesadilla', quantity: 1, price: 60 }],
      totalVerified: 60,
      shippingAddress: { street: 'Calle 3' },
      createdAt: new Timestamp(1704240000, 0),
    };

    updateCallback({
      forEach: (callback: any) => {
        [...mockFirestoreOrders, newOrder].forEach(order => {
          callback({
            data: () => order,
            id: order.id,
          });
        });
      },
    });

    await waitFor(() => {
      expect(result.current.orders).toHaveLength(3);
      expect(result.current.orders[2].id).toBe('order-3');
    });
  });
});
