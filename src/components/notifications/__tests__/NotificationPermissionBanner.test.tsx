/**
 * Tests para NotificationPermissionBanner
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationPermissionBanner } from '../NotificationPermissionBanner';
import * as firebaseProvider from '@/firebase/provider';
import * as useFCMTokenHook from '@/hooks/use-fcm-token';
import * as firebaseMessaging from '@/lib/fcm/firebase-messaging';
import { toast } from 'sonner';

// Mocks
jest.mock('@/firebase/provider');
jest.mock('@/hooks/use-fcm-token');
jest.mock('@/lib/fcm/firebase-messaging');
jest.mock('sonner');

describe('NotificationPermissionBanner', () => {
  const mockUser = { uid: 'test-user' };
  const mockRegisterToken = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock de localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true
    });

    // Mocks por defecto
    (firebaseProvider.useUser as jest.Mock).mockReturnValue({
      user: null,
      isUserLoading: false
    });

    (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
      token: null,
      isLoading: false,
      error: null,
      permission: 'default',
      isSupported: true,
      registerToken: mockRegisterToken
    });
  });

  describe('Visibility rules', () => {
    it('should not render if user is not authenticated', () => {
      (firebaseProvider.useUser as jest.Mock).mockReturnValue({
        user: null,
        isUserLoading: false
      });

      render(<NotificationPermissionBanner />);

      expect(screen.queryByText(/Quieres recibir notificaciones/i)).not.toBeInTheDocument();
    });

    it('should not render if user is still loading', () => {
      (firebaseProvider.useUser as jest.Mock).mockReturnValue({
        user: null,
        isUserLoading: true
      });

      render(<NotificationPermissionBanner />);

      expect(screen.queryByText(/Quieres recibir notificaciones/i)).not.toBeInTheDocument();
    });

    it('should not render if notifications are not supported', () => {
      (firebaseProvider.useUser as jest.Mock).mockReturnValue({
        user: mockUser,
        isUserLoading: false
      });

      (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
        permission: 'default',
        isSupported: false,
        registerToken: mockRegisterToken
      });

      render(<NotificationPermissionBanner />);

      expect(screen.queryByText(/Quieres recibir notificaciones/i)).not.toBeInTheDocument();
    });

    it('should not render if permissions are already granted', () => {
      (firebaseProvider.useUser as jest.Mock).mockReturnValue({
        user: mockUser,
        isUserLoading: false
      });

      (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
        permission: 'granted',
        isSupported: true,
        registerToken: mockRegisterToken
      });

      render(<NotificationPermissionBanner />);

      expect(screen.queryByText(/Quieres recibir notificaciones/i)).not.toBeInTheDocument();
    });

    it('should not render if permissions are denied', () => {
      (firebaseProvider.useUser as jest.Mock).mockReturnValue({
        user: mockUser,
        isUserLoading: false
      });

      (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
        permission: 'denied',
        isSupported: true,
        registerToken: mockRegisterToken
      });

      render(<NotificationPermissionBanner />);

      expect(screen.queryByText(/Quieres recibir notificaciones/i)).not.toBeInTheDocument();
    });

    it('should not render if banner was already shown (localStorage)', () => {
      (firebaseProvider.useUser as jest.Mock).mockReturnValue({
        user: mockUser,
        isUserLoading: false
      });

      (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
        permission: 'default',
        isSupported: true,
        registerToken: mockRegisterToken
      });

      (window.localStorage.getItem as jest.Mock).mockReturnValue('true');

      render(<NotificationPermissionBanner />);

      expect(screen.queryByText(/Quieres recibir notificaciones/i)).not.toBeInTheDocument();
    });

    it('should render when all conditions are met', () => {
      (firebaseProvider.useUser as jest.Mock).mockReturnValue({
        user: mockUser,
        isUserLoading: false
      });

      (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
        permission: 'default',
        isSupported: true,
        registerToken: mockRegisterToken
      });

      (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

      render(<NotificationPermissionBanner />);

      expect(screen.getByText(/Quieres recibir notificaciones/i)).toBeInTheDocument();
    });
  });

  describe('UI elements', () => {
    beforeEach(() => {
      (firebaseProvider.useUser as jest.Mock).mockReturnValue({
        user: mockUser,
        isUserLoading: false
      });

      (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
        permission: 'default',
        isSupported: true,
        registerToken: mockRegisterToken
      });

      (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
    });

    it('should display main message', () => {
      render(<NotificationPermissionBanner />);

      expect(screen.getByText(/Quieres recibir notificaciones de tus pedidos/i)).toBeInTheDocument();
    });

    it('should display "Activar" button', () => {
      render(<NotificationPermissionBanner />);

      const activateButton = screen.getByRole('button', { name: /Activar/i });
      expect(activateButton).toBeInTheDocument();
    });

    it('should display close button (X)', () => {
      render(<NotificationPermissionBanner />);

      const closeButton = screen.getByRole('button', { name: /Cerrar/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('should display bell icon', () => {
      render(<NotificationPermissionBanner />);

      const bellIcon = screen.getByTestId('bell-icon');
      expect(bellIcon).toBeInTheDocument();
    });
  });

  describe('Activate button behavior', () => {
    beforeEach(() => {
      (firebaseProvider.useUser as jest.Mock).mockReturnValue({
        user: mockUser,
        isUserLoading: false
      });

      (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
        permission: 'default',
        isSupported: true,
        registerToken: mockRegisterToken
      });

      (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
    });

    it('should request permissions when clicking Activar', async () => {
      (firebaseMessaging.requestNotificationPermission as jest.Mock).mockResolvedValue('granted');

      render(<NotificationPermissionBanner />);

      const activateButton = screen.getByRole('button', { name: /Activar/i });
      fireEvent.click(activateButton);

      await waitFor(() => {
        expect(firebaseMessaging.requestNotificationPermission).toHaveBeenCalled();
      });
    });

    it('should show success toast and hide banner when permissions are granted', async () => {
      (firebaseMessaging.requestNotificationPermission as jest.Mock).mockResolvedValue('granted');

      render(<NotificationPermissionBanner />);

      const activateButton = screen.getByRole('button', { name: /Activar/i });
      fireEvent.click(activateButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          '¡Notificaciones activadas!',
          expect.objectContaining({
            description: expect.stringContaining('tiempo real')
          })
        );
      });

      await waitFor(() => {
        expect(window.localStorage.setItem).toHaveBeenCalledWith('fcm-permission-prompt-shown', 'true');
      });

      await waitFor(() => {
        expect(screen.queryByText(/Quieres recibir notificaciones/i)).not.toBeInTheDocument();
      });
    });

    it('should call registerToken when permissions are granted', async () => {
      (firebaseMessaging.requestNotificationPermission as jest.Mock).mockResolvedValue('granted');

      render(<NotificationPermissionBanner />);

      const activateButton = screen.getByRole('button', { name: /Activar/i });
      fireEvent.click(activateButton);

      await waitFor(() => {
        expect(mockRegisterToken).toHaveBeenCalled();
      });
    });

    it('should show error toast when permissions are denied', async () => {
      (firebaseMessaging.requestNotificationPermission as jest.Mock).mockResolvedValue('denied');

      render(<NotificationPermissionBanner />);

      const activateButton = screen.getByRole('button', { name: /Activar/i });
      fireEvent.click(activateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Notificaciones desactivadas',
          expect.objectContaining({
            description: expect.stringContaining('perfil')
          })
        );
      });
    });

    it('should show info toast when user dismisses native prompt', async () => {
      (firebaseMessaging.requestNotificationPermission as jest.Mock).mockResolvedValue('default');

      render(<NotificationPermissionBanner />);

      const activateButton = screen.getByRole('button', { name: /Activar/i });
      fireEvent.click(activateButton);

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith(
          'No se activaron las notificaciones',
          expect.any(Object)
        );
      });
    });

    it('should disable button while requesting', async () => {
      (firebaseMessaging.requestNotificationPermission as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('granted'), 100))
      );

      render(<NotificationPermissionBanner />);

      const activateButton = screen.getByRole('button', { name: /Activar/i });
      fireEvent.click(activateButton);

      // Button debe estar deshabilitado mientras procesa
      expect(activateButton).toBeDisabled();
      expect(screen.getByText('Activando...')).toBeInTheDocument();

      await waitFor(() => {
        expect(activateButton).not.toBeInTheDocument();
      });
    });
  });

  describe('Close (X) button behavior', () => {
    beforeEach(() => {
      (firebaseProvider.useUser as jest.Mock).mockReturnValue({
        user: mockUser,
        isUserLoading: false
      });

      (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
        permission: 'default',
        isSupported: true,
        registerToken: mockRegisterToken
      });

      (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
    });

    it('should hide banner when clicking X', async () => {
      render(<NotificationPermissionBanner />);

      const closeButton = screen.getByRole('button', { name: /Cerrar/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText(/Quieres recibir notificaciones/i)).not.toBeInTheDocument();
      });
    });

    it('should save to localStorage when dismissing', async () => {
      render(<NotificationPermissionBanner />);

      const closeButton = screen.getByRole('button', { name: /Cerrar/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(window.localStorage.setItem).toHaveBeenCalledWith('fcm-permission-prompt-shown', 'true');
      });
    });

    it('should show info toast when dismissing', async () => {
      render(<NotificationPermissionBanner />);

      const closeButton = screen.getByRole('button', { name: /Cerrar/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith(
          'Notificaciones desactivadas',
          expect.objectContaining({
            description: expect.stringContaining('perfil')
          })
        );
      });
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      (firebaseProvider.useUser as jest.Mock).mockReturnValue({
        user: mockUser,
        isUserLoading: false
      });

      (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
        permission: 'default',
        isSupported: true,
        registerToken: mockRegisterToken
      });

      (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
    });

    it('should show error toast if permission request fails', async () => {
      (firebaseMessaging.requestNotificationPermission as jest.Mock).mockRejectedValue(
        new Error('Permission API error')
      );

      render(<NotificationPermissionBanner />);

      const activateButton = screen.getByRole('button', { name: /Activar/i });
      fireEvent.click(activateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Error al activar notificaciones',
          expect.any(Object)
        );
      });
    });
  });
});
