import { renderHook, waitFor } from '@testing-library/react';
import { useLocationTracking } from '../use-location-tracking';
import { useUser } from '@/firebase/provider';

// Mock de Firebase provider
jest.mock('@/firebase/provider', () => ({
  useUser: jest.fn(),
}));

const mockUseUser = useUser as jest.Mock;

// Mock de geolocalización
const mockGetCurrentPosition = jest.fn();
const mockWatchPosition = jest.fn();
const mockClearWatch = jest.fn();

describe('useLocationTracking', () => {
  const mockUser = {
    uid: 'test-driver-123',
    email: 'driver@test.com',
    getIdToken: jest.fn(() => Promise.resolve('test-token')),
  };

  const mockPosition: GeolocationPosition = {
    coords: {
      latitude: 20.967537,
      longitude: -89.592586,
      accuracy: 50,
      altitude: null,
      altitudeAccuracy: null,
      heading: 90,
      speed: 5,
    },
    timestamp: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock de navigator.geolocation
    Object.defineProperty(global.navigator, 'geolocation', {
      value: {
        getCurrentPosition: mockGetCurrentPosition,
        watchPosition: mockWatchPosition,
        clearWatch: mockClearWatch,
      },
      writable: true,
      configurable: true,
    });

    mockUseUser.mockReturnValue({ user: mockUser, isUserLoading: false });

    // Mock de fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    ) as jest.Mock;

    // Mock de console methods
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Reset watchPosition para que retorne un ID único
    mockWatchPosition.mockReturnValue(12345);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should not track when enabled is false', () => {
    const { result } = renderHook(() =>
      useLocationTracking({
        orderId: 'order-123',
        enabled: false,
      })
    );

    expect(result.current.isTracking).toBe(false);
    expect(mockGetCurrentPosition).not.toHaveBeenCalled();
    expect(mockWatchPosition).not.toHaveBeenCalled();
  });

  it('should not track when orderId is missing', () => {
    const { result } = renderHook(() =>
      useLocationTracking({
        orderId: undefined,
        enabled: true,
      })
    );

    expect(result.current.isTracking).toBe(false);
    expect(mockGetCurrentPosition).not.toHaveBeenCalled();
    expect(mockWatchPosition).not.toHaveBeenCalled();
  });

  it('should not track when user is not authenticated', () => {
    mockUseUser.mockReturnValue({ user: null, isUserLoading: false });

    const { result } = renderHook(() =>
      useLocationTracking({
        orderId: 'order-123',
        enabled: true,
      })
    );

    expect(result.current.isTracking).toBe(false);
    expect(mockGetCurrentPosition).not.toHaveBeenCalled();
    expect(mockWatchPosition).not.toHaveBeenCalled();
  });

  it('should start tracking when enabled with valid orderId and user', () => {
    const { result } = renderHook(() =>
      useLocationTracking({
        orderId: 'order-123',
        enabled: true,
      })
    );

    expect(result.current.isTracking).toBe(true);
    expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1);
    expect(mockWatchPosition).toHaveBeenCalledTimes(1);
  });

  it('should call getCurrentPosition with correct options', () => {
    renderHook(() =>
      useLocationTracking({
        orderId: 'order-123',
        enabled: true,
      })
    );

    expect(mockGetCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 10000,
      }
    );
  });

  it('should send location to server when position is received', async () => {
    mockGetCurrentPosition.mockImplementation((successCallback) => {
      successCallback(mockPosition);
    });

    renderHook(() =>
      useLocationTracking({
        orderId: 'order-123',
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/repartidores/me/update-location',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          }),
          body: JSON.stringify({
            lat: 20.967537,
            lng: -89.592586,
            accuracy: 50,
            heading: 90,
            speed: 5,
            orderId: 'order-123',
          }),
        })
      );
    });
  });

  it('should update lastLocation after successful server update', async () => {
    mockGetCurrentPosition.mockImplementation((successCallback) => {
      successCallback(mockPosition);
    });

    const { result } = renderHook(() =>
      useLocationTracking({
        orderId: 'order-123',
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.lastLocation).toEqual({
        lat: 20.967537,
        lng: -89.592586,
        accuracy: 50,
        heading: 90,
        speed: 5,
      });
    });
  });

  it('should reject location with poor accuracy (>= 100m)', async () => {
    const lowAccuracyPosition = {
      ...mockPosition,
      coords: {
        ...mockPosition.coords,
        accuracy: 150, // Baja precisión
      },
    };

    mockGetCurrentPosition.mockImplementation((successCallback) => {
      successCallback(lowAccuracyPosition);
    });

    renderHook(() =>
      useLocationTracking({
        orderId: 'order-123',
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(console.warn).toHaveBeenCalledWith(
        'Ubicación rechazada por baja precisión:',
        150
      );
    });

    // No debe enviar al servidor
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should handle PERMISSION_DENIED error', async () => {
    const permissionError: GeolocationPositionError = {
      code: 1,
      message: 'User denied geolocation',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    mockGetCurrentPosition.mockImplementation((success, errorCallback) => {
      errorCallback(permissionError);
    });

    const { result } = renderHook(() =>
      useLocationTracking({
        orderId: 'order-123',
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.error).toBe(
        'Permiso de ubicación denegado. Por favor habilita el GPS.'
      );
    });
  });

  it('should handle POSITION_UNAVAILABLE error', async () => {
    const unavailableError: GeolocationPositionError = {
      code: 2,
      message: 'Position unavailable',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    mockGetCurrentPosition.mockImplementation((success, errorCallback) => {
      errorCallback(unavailableError);
    });

    const { result } = renderHook(() =>
      useLocationTracking({
        orderId: 'order-123',
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.error).toBe(
        'Ubicación no disponible. Verifica tu conexión.'
      );
    });
  });

  it('should not set error for TIMEOUT (normal in development)', async () => {
    const timeoutError: GeolocationPositionError = {
      code: 3,
      message: 'Timeout',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    mockGetCurrentPosition.mockImplementation((success, errorCallback) => {
      errorCallback(timeoutError);
    });

    const { result } = renderHook(() =>
      useLocationTracking({
        orderId: 'order-123',
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(console.warn).toHaveBeenCalledWith(
        'Timeout al obtener ubicación (normal en desarrollo)'
      );
    });

    // No debe setear error
    expect(result.current.error).toBeNull();
  });

  it('should setup interval for periodic updates', () => {
    renderHook(() =>
      useLocationTracking({
        orderId: 'order-123',
        enabled: true,
        interval: 10000,
      })
    );

    // Avanzar el tiempo y verificar que se llama getCurrentPosition periódicamente
    jest.advanceTimersByTime(10000);

    // Inicial + 1 del interval
    expect(mockGetCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it('should use custom interval when provided', () => {
    renderHook(() =>
      useLocationTracking({
        orderId: 'order-123',
        enabled: true,
        interval: 5000, // 5 segundos
      })
    );

    jest.advanceTimersByTime(5000);

    // Inicial + 1 del interval
    expect(mockGetCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() =>
      useLocationTracking({
        orderId: 'order-123',
        enabled: true,
      })
    );

    unmount();

    expect(mockClearWatch).toHaveBeenCalledWith(12345);
  });

  it('should cleanup when enabled changes to false', () => {
    const { rerender } = renderHook(
      ({ enabled }) =>
        useLocationTracking({
          orderId: 'order-123',
          enabled,
        }),
      { initialProps: { enabled: true } }
    );

    expect(mockWatchPosition).toHaveBeenCalled();

    rerender({ enabled: false });

    expect(mockClearWatch).toHaveBeenCalledWith(12345);
  });

  it('should handle error when geolocation is not supported', () => {
    // Remover geolocation del navegador
    Object.defineProperty(global.navigator, 'geolocation', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() =>
      useLocationTracking({
        orderId: 'order-123',
        enabled: true,
      })
    );

    expect(result.current.error).toBe('Geolocalización no soportada en este navegador');
    expect(result.current.isTracking).toBe(false);
  });

  it('should handle server error when sending location', async () => {
    mockGetCurrentPosition.mockImplementation((successCallback) => {
      successCallback(mockPosition);
    });

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'Server error' }),
      })
    ) as jest.Mock;

    const { result } = renderHook(() =>
      useLocationTracking({
        orderId: 'order-123',
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Server error');
    });
  });

  it('should clear error on successful location update', async () => {
    // Primero causar un error
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'Server error' }),
      })
    ) as jest.Mock;

    mockGetCurrentPosition.mockImplementation((successCallback) => {
      successCallback(mockPosition);
    });

    const { result } = renderHook(() =>
      useLocationTracking({
        orderId: 'order-123',
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Server error');
    });

    // Ahora hacer que el fetch funcione
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    ) as jest.Mock;

    // Simular nueva actualización
    jest.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });
});
