/**
 * Tests para useFCMToken hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useFCMToken } from '../use-fcm-token';
import * as firebaseProvider from '@/firebase/provider';
import * as firebaseMessaging from '@/lib/fcm/firebase-messaging';

// Mock de Firebase provider
jest.mock('@/firebase/provider');

// Mock de firebase-messaging
jest.mock('@/lib/fcm/firebase-messaging');

// Mock de fetch global
global.fetch = jest.fn();

describe('useFCMToken', () => {
  // Mocks
  const mockUser = {
    uid: 'test-user-123',
    getIdToken: jest.fn().mockResolvedValue('test-id-token')
  };

  const mockFirebaseApp = { name: '[DEFAULT]' };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup de localStorage mock
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    // Mocks por defecto
    (firebaseProvider.useUser as jest.Mock).mockReturnValue({
      user: null,
      isUserLoading: false
    });

    (firebaseProvider.useFirebaseApp as jest.Mock).mockReturnValue(mockFirebaseApp);

    (firebaseMessaging.areNotificationsSupported as jest.Mock).mockReturnValue(true);
    (firebaseMessaging.getNotificationPermission as jest.Mock).mockReturnValue('default');
  });

  describe('Initial state', () => {
    it('should return initial loading state when user is loading', () => {
      (firebaseProvider.useUser as jest.Mock).mockReturnValue({
        user: null,
        isUserLoading: true
      });

      const { result } = renderHook(() => useFCMToken());

      expect(result.current.token).toBeNull();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.permission).toBe('default');
      expect(result.current.isSupported).toBe(true);
    });

    it('should not be loading when user is not authenticated', () => {
      (firebaseProvider.useUser as jest.Mock).mockReturnValue({
        user: null,
        isUserLoading: false
      });

      const { result } = renderHook(() => useFCMToken());

      expect(result.current.token).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should mark as not supported when browser does not support notifications', () => {
      (firebaseMessaging.areNotificationsSupported as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => useFCMToken());

      expect(result.current.isSupported).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Auto-registration with granted permissions', () => {
    beforeEach(() => {
      (firebaseProvider.useUser as jest.Mock).mockReturnValue({
        user: mockUser,
        isUserLoading: false
      });

      (firebaseMessaging.getNotificationPermission as jest.Mock).mockReturnValue('granted');
      (firebaseMessaging.registerServiceWorker as jest.Mock).mockResolvedValue({
        active: true,
        scope: '/'
      });
      (firebaseMessaging.initializeMessaging as jest.Mock).mockReturnValue({ app: mockFirebaseApp });
      (firebaseMessaging.getFCMToken as jest.Mock).mockResolvedValue('mock-fcm-token-123');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, tokenId: 'abc123' })
      });
    });

    it('should auto-register token when user is authenticated and has granted permissions', async () => {
      const { result } = renderHook(() => useFCMToken());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.token).toBe('mock-fcm-token-123');
      expect(result.current.error).toBeNull();
      expect(result.current.permission).toBe('granted');
    });

    it('should call registerServiceWorker', async () => {
      renderHook(() => useFCMToken());

      await waitFor(() => {
        expect(firebaseMessaging.registerServiceWorker).toHaveBeenCalled();
      });
    });

    it('should call backend to register token', async () => {
      renderHook(() => useFCMToken());

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/fcm/register-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-id-token'
          },
          body: expect.stringContaining('mock-fcm-token-123')
        });
      });
    });
  });

  describe('Manual registration', () => {
    beforeEach(() => {
      (firebaseProvider.useUser as jest.Mock).mockReturnValue({
        user: mockUser,
        isUserLoading: false
      });

      (firebaseMessaging.getNotificationPermission as jest.Mock).mockReturnValue('default');
      (firebaseMessaging.registerServiceWorker as jest.Mock).mockResolvedValue({
        active: true,
        scope: '/'
      });
      (firebaseMessaging.initializeMessaging as jest.Mock).mockReturnValue({ app: mockFirebaseApp });
      (firebaseMessaging.getFCMToken as jest.Mock).mockResolvedValue('mock-fcm-token-456');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });
    });

    it('should register token manually when calling registerToken()', async () => {
      const { result } = renderHook(() => useFCMToken());

      // Simular que el usuario otorgó permisos
      (firebaseMessaging.getNotificationPermission as jest.Mock).mockReturnValue('granted');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Llamar manualmente
      await result.current.registerToken();

      await waitFor(() => {
        expect(result.current.token).toBe('mock-fcm-token-456');
      });
    });

    it('should not auto-register if permissions are default', async () => {
      const { result } = renderHook(() => useFCMToken());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.token).toBeNull();
      expect(firebaseMessaging.getFCMToken).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      (firebaseProvider.useUser as jest.Mock).mockReturnValue({
        user: mockUser,
        isUserLoading: false
      });

      (firebaseMessaging.getNotificationPermission as jest.Mock).mockReturnValue('granted');
    });

    it('should handle Service Worker registration error', async () => {
      (firebaseMessaging.registerServiceWorker as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useFCMToken());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toContain('Service Worker');
      expect(result.current.token).toBeNull();
    });

    it('should handle FCM initialization error', async () => {
      (firebaseMessaging.registerServiceWorker as jest.Mock).mockResolvedValue({ active: true });
      (firebaseMessaging.initializeMessaging as jest.Mock).mockReturnValue(null);

      const { result } = renderHook(() => useFCMToken());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toContain('Firebase Messaging');
    });

    it('should handle token retrieval error', async () => {
      (firebaseMessaging.registerServiceWorker as jest.Mock).mockResolvedValue({ active: true });
      (firebaseMessaging.initializeMessaging as jest.Mock).mockReturnValue({ app: mockFirebaseApp });
      (firebaseMessaging.getFCMToken as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useFCMToken());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toContain('token FCM');
    });

    it('should handle backend registration error', async () => {
      (firebaseMessaging.registerServiceWorker as jest.Mock).mockResolvedValue({ active: true });
      (firebaseMessaging.initializeMessaging as jest.Mock).mockReturnValue({ app: mockFirebaseApp });
      (firebaseMessaging.getFCMToken as jest.Mock).mockResolvedValue('mock-token');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Backend error' })
      });

      const { result } = renderHook(() => useFCMToken());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
    });
  });

  describe('Cleanup on logout', () => {
    it('should call unregister endpoint when user logs out', async () => {
      const { rerender } = renderHook(() => useFCMToken());

      // Simular usuario logueado con token
      (firebaseProvider.useUser as jest.Mock).mockReturnValue({
        user: mockUser,
        isUserLoading: false
      });
      (firebaseMessaging.getNotificationPermission as jest.Mock).mockReturnValue('granted');
      (firebaseMessaging.registerServiceWorker as jest.Mock).mockResolvedValue({ active: true });
      (firebaseMessaging.initializeMessaging as jest.Mock).mockReturnValue({ app: mockFirebaseApp });
      (firebaseMessaging.getFCMToken as jest.Mock).mockResolvedValue('token-to-delete');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      rerender();

      await waitFor(() => {
        expect(firebaseMessaging.getFCMToken).toHaveBeenCalled();
      });

      // Simular logout
      (firebaseProvider.useUser as jest.Mock).mockReturnValue({
        user: null,
        isUserLoading: false
      });

      (global.fetch as jest.Mock).mockClear();

      rerender();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/fcm/unregister-token', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: expect.stringContaining('token-to-delete')
        });
      });
    });
  });

  describe('Permission states', () => {
    it('should reflect granted permission state', () => {
      (firebaseMessaging.getNotificationPermission as jest.Mock).mockReturnValue('granted');

      const { result } = renderHook(() => useFCMToken());

      expect(result.current.permission).toBe('granted');
    });

    it('should reflect denied permission state', () => {
      (firebaseMessaging.getNotificationPermission as jest.Mock).mockReturnValue('denied');

      const { result } = renderHook(() => useFCMToken());

      expect(result.current.permission).toBe('denied');
    });

    it('should reflect default permission state', () => {
      (firebaseMessaging.getNotificationPermission as jest.Mock).mockReturnValue('default');

      const { result } = renderHook(() => useFCMToken());

      expect(result.current.permission).toBe('default');
    });
  });
});
