/**
 * Tests para NotificationSettings
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationSettings } from '../NotificationSettings';
import * as useFCMTokenHook from '@/hooks/use-fcm-token';
import * as firebaseMessaging from '@/lib/fcm/firebase-messaging';
import { toast } from 'sonner';

// Mocks
jest.mock('@/hooks/use-fcm-token');
jest.mock('@/lib/fcm/firebase-messaging');
jest.mock('sonner');

describe('NotificationSettings', () => {
  const mockRegisterToken = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock por defecto
    (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
      token: null,
      isLoading: false,
      error: null,
      permission: 'default',
      isSupported: true,
      registerToken: mockRegisterToken
    });
  });

  describe('Not supported state', () => {
    it('should show not available message when notifications are not supported', () => {
      (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
        permission: 'default',
        isSupported: false,
        token: null,
        registerToken: mockRegisterToken
      });

      render(<NotificationSettings />);

      expect(screen.getByText('Notificaciones no disponibles')).toBeInTheDocument();
      expect(screen.getByText(/Tu navegador no soporta notificaciones push/i)).toBeInTheDocument();
    });

    it('should display BellOff icon when not supported', () => {
      (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
        permission: 'default',
        isSupported: false,
        token: null,
        registerToken: mockRegisterToken
      });

      render(<NotificationSettings />);

      const bellOffIcon = screen.getByTestId('bell-off-icon');
      expect(bellOffIcon).toBeInTheDocument();
    });
  });

  describe('Granted state (activated)', () => {
    it('should show activated message when permissions are granted and token exists', () => {
      (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
        permission: 'granted',
        isSupported: true,
        token: 'mock-fcm-token-123456789',
        registerToken: mockRegisterToken
      });

      render(<NotificationSettings />);

      expect(screen.getByText('Notificaciones activadas')).toBeInTheDocument();
      expect(screen.getByText(/Recibirás notificaciones de tus pedidos en tiempo real/i)).toBeInTheDocument();
    });

    it('should display truncated token', () => {
      (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
        permission: 'granted',
        isSupported: true,
        token: 'abcdefghijklmnopqrstuvwxyz123456789',
        registerToken: mockRegisterToken
      });

      render(<NotificationSettings />);

      expect(screen.getByText(/Token registrado: abcdefghijklmnopqrst.../i)).toBeInTheDocument();
    });

    it('should display green Bell icon when activated', () => {
      (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
        permission: 'granted',
        isSupported: true,
        token: 'mock-token',
        registerToken: mockRegisterToken
      });

      render(<NotificationSettings />);

      const bellIcon = screen.getByTestId('bell-icon');
      expect(bellIcon).toBeInTheDocument();
      expect(bellIcon).toHaveClass('text-green-500');
    });
  });

  describe('Denied state (blocked)', () => {
    it('should show blocked message when permissions are denied', () => {
      (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
        permission: 'denied',
        isSupported: true,
        token: null,
        registerToken: mockRegisterToken
      });

      render(<NotificationSettings />);

      expect(screen.getByText('Notificaciones bloqueadas')).toBeInTheDocument();
      expect(screen.getByText(/Has bloqueado las notificaciones para este sitio/i)).toBeInTheDocument();
    });

    it('should display instructions to unblock', () => {
      (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
        permission: 'denied',
        isSupported: true,
        token: null,
        registerToken: mockRegisterToken
      });

      render(<NotificationSettings />);

      expect(screen.getByText(/Para activarlas, sigue estos pasos:/i)).toBeInTheDocument();
      expect(screen.getByText(/Haz click en el icono de candado en la barra de direcciones/i)).toBeInTheDocument();
      expect(screen.getByText(/Busca la opción "Notificaciones"/i)).toBeInTheDocument();
      expect(screen.getByText(/Cambia a "Permitir"/i)).toBeInTheDocument();
      expect(screen.getByText(/Recarga esta página/i)).toBeInTheDocument();
    });

    it('should display AlertCircle icon when blocked', () => {
      (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
        permission: 'denied',
        isSupported: true,
        token: null,
        registerToken: mockRegisterToken
      });

      render(<NotificationSettings />);

      const alertIcon = screen.getByTestId('alert-circle-icon');
      expect(alertIcon).toBeInTheDocument();
      expect(alertIcon).toHaveClass('text-red-500');
    });
  });

  describe('Default state (pending activation)', () => {
    beforeEach(() => {
      (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
        permission: 'default',
        isSupported: true,
        token: null,
        registerToken: mockRegisterToken
      });
    });

    it('should show activation card with benefits', () => {
      render(<NotificationSettings />);

      expect(screen.getByText('Notificaciones push')).toBeInTheDocument();
      expect(screen.getByText(/Recibe actualizaciones de tus pedidos en tiempo real/i)).toBeInTheDocument();
    });

    it('should display list of notification events', () => {
      render(<NotificationSettings />);

      expect(screen.getByText(/Te notificaremos cuando:/i)).toBeInTheDocument();
      expect(screen.getByText(/Tu pedido sea confirmado/i)).toBeInTheDocument();
      expect(screen.getByText(/Esté en preparación/i)).toBeInTheDocument();
      expect(screen.getByText(/Un repartidor sea asignado/i)).toBeInTheDocument();
      expect(screen.getByText(/Esté en camino/i)).toBeInTheDocument();
      expect(screen.getByText(/Sea entregado/i)).toBeInTheDocument();
    });

    it('should display "Activar notificaciones" button', () => {
      render(<NotificationSettings />);

      const activateButton = screen.getByRole('button', { name: /Activar notificaciones/i });
      expect(activateButton).toBeInTheDocument();
      expect(activateButton).not.toBeDisabled();
    });
  });

  describe('Manual activation', () => {
    beforeEach(() => {
      (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
        permission: 'default',
        isSupported: true,
        token: null,
        registerToken: mockRegisterToken
      });
    });

    it('should request permissions when clicking activate button', async () => {
      (firebaseMessaging.requestNotificationPermission as jest.Mock).mockResolvedValue('granted');

      render(<NotificationSettings />);

      const activateButton = screen.getByRole('button', { name: /Activar notificaciones/i });
      fireEvent.click(activateButton);

      await waitFor(() => {
        expect(firebaseMessaging.requestNotificationPermission).toHaveBeenCalled();
      });
    });

    it('should show success toast when permissions are granted', async () => {
      (firebaseMessaging.requestNotificationPermission as jest.Mock).mockResolvedValue('granted');

      render(<NotificationSettings />);

      const activateButton = screen.getByRole('button', { name: /Activar notificaciones/i });
      fireEvent.click(activateButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('¡Notificaciones activadas!');
      });
    });

    it('should call registerToken when permissions are granted', async () => {
      (firebaseMessaging.requestNotificationPermission as jest.Mock).mockResolvedValue('granted');

      render(<NotificationSettings />);

      const activateButton = screen.getByRole('button', { name: /Activar notificaciones/i });
      fireEvent.click(activateButton);

      await waitFor(() => {
        expect(mockRegisterToken).toHaveBeenCalled();
      });
    });

    it('should show error toast when permissions are denied', async () => {
      (firebaseMessaging.requestNotificationPermission as jest.Mock).mockResolvedValue('denied');

      render(<NotificationSettings />);

      const activateButton = screen.getByRole('button', { name: /Activar notificaciones/i });
      fireEvent.click(activateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Permisos denegados',
          expect.objectContaining({
            description: expect.stringContaining('configuración de tu navegador')
          })
        );
      });
    });

    it('should disable button while activating', async () => {
      (firebaseMessaging.requestNotificationPermission as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('granted'), 100))
      );

      render(<NotificationSettings />);

      const activateButton = screen.getByRole('button', { name: /Activar notificaciones/i });
      fireEvent.click(activateButton);

      // Button debe mostrar "Activando..."
      await waitFor(() => {
        expect(screen.getByText('Activando...')).toBeInTheDocument();
      });

      const buttonWhileLoading = screen.getByRole('button', { name: /Activando.../i });
      expect(buttonWhileLoading).toBeDisabled();
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
        permission: 'default',
        isSupported: true,
        token: null,
        registerToken: mockRegisterToken
      });
    });

    it('should show error toast when activation fails', async () => {
      (firebaseMessaging.requestNotificationPermission as jest.Mock).mockRejectedValue(
        new Error('Permission error')
      );

      render(<NotificationSettings />);

      const activateButton = screen.getByRole('button', { name: /Activar notificaciones/i });
      fireEvent.click(activateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Error al activar notificaciones');
      });
    });

    it('should re-enable button after error', async () => {
      (firebaseMessaging.requestNotificationPermission as jest.Mock).mockRejectedValue(
        new Error('Permission error')
      );

      render(<NotificationSettings />);

      const activateButton = screen.getByRole('button', { name: /Activar notificaciones/i });
      fireEvent.click(activateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      // El botón debe volver a estar habilitado
      const buttonAfterError = screen.getByRole('button', { name: /Activar notificaciones/i });
      expect(buttonAfterError).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
        permission: 'default',
        isSupported: true,
        token: null,
        registerToken: mockRegisterToken
      });

      render(<NotificationSettings />);

      const activateButton = screen.getByRole('button', { name: /Activar notificaciones/i });
      expect(activateButton).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      (useFCMTokenHook.useFCMToken as jest.Mock).mockReturnValue({
        permission: 'default',
        isSupported: true,
        token: null,
        registerToken: mockRegisterToken
      });

      render(<NotificationSettings />);

      const activateButton = screen.getByRole('button', { name: /Activar notificaciones/i });

      // El botón debe ser focuseable
      activateButton.focus();
      expect(activateButton).toHaveFocus();
    });
  });
});
