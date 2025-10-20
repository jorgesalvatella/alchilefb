import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeliveryActions } from '../DeliveryActions';

// Mock hooks
const mockToast = jest.fn();
const mockPush = jest.fn();
const mockGetIdToken = jest.fn();

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/firebase/provider', () => ({
  useUser: () => ({
    user: { getIdToken: mockGetIdToken },
  }),
}));

jest.mock('@/hooks/use-location-tracking', () => ({
  useLocationTracking: jest.fn(({ enabled }) => ({
    isTracking: enabled,
    error: null,
    lastLocation: enabled
      ? { lat: 19.4326, lng: -99.1332, accuracy: 15 }
      : null,
  })),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
};
Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

describe('DeliveryActions Component', () => {
  const mockOrderPreparando = {
    id: 'order123',
    status: 'Preparando',
    driverId: 'driver123',
  };

  const mockOrderEnReparto = {
    id: 'order456',
    status: 'En Reparto',
    driverId: 'driver123',
  };

  const mockOrderEntregado = {
    id: 'order789',
    status: 'Entregado',
    driverId: 'driver123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetIdToken.mockResolvedValue('fake-token');
  });

  describe('Order status: Preparando', () => {
    it('should render "Salir a Entregar" button', () => {
      render(<DeliveryActions order={mockOrderPreparando} />);

      const button = screen.getByRole('button', { name: /salir a entregar/i });
      expect(button).toBeInTheDocument();
    });

    it('should call API when "Salir a Entregar" is clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: {
            latitude: 19.4326,
            longitude: -99.1332,
            accuracy: 15,
            heading: null,
            speed: null,
          },
        });
      });

      render(<DeliveryActions order={mockOrderPreparando} />);

      const button = screen.getByRole('button', { name: /salir a entregar/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/pedidos/order123/marcar-en-camino',
          expect.objectContaining({
            method: 'PUT',
            headers: expect.objectContaining({
              'Authorization': 'Bearer fake-token',
            }),
          })
        );
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '✅ En Camino',
        })
      );
    });

    it('should handle GPS permission denied gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error({ code: 1, message: 'User denied geolocation' });
      });

      render(<DeliveryActions order={mockOrderPreparando} />);

      const button = screen.getByRole('button', { name: /salir a entregar/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: '⚠️ Sin GPS',
            description: expect.stringContaining('No se pudo obtener tu ubicación'),
          })
        );
      });

      // Should still call API even without GPS
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should show error when API call fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Error del servidor' }),
      });

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: {
            latitude: 19.4326,
            longitude: -99.1332,
            accuracy: 15,
            heading: null,
            speed: null,
          },
        });
      });

      render(<DeliveryActions order={mockOrderPreparando} />);

      const button = screen.getByRole('button', { name: /salir a entregar/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error al actualizar',
            description: 'Error del servidor',
            variant: 'destructive',
          })
        );
      });
    });

    it('should disable button while loading', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ success: true }),
                }),
              100
            )
          )
      );

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: { latitude: 19.4326, longitude: -99.1332, accuracy: 15, heading: null, speed: null },
        });
      });

      render(<DeliveryActions order={mockOrderPreparando} />);

      const button = screen.getByRole('button', { name: /salir a entregar/i });
      fireEvent.click(button);

      // Button should be disabled immediately
      expect(button).toBeDisabled();
      expect(screen.getByText(/procesando/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('Order status: En Reparto', () => {
    it('should render "Marcar como Entregado" button', () => {
      render(<DeliveryActions order={mockOrderEnReparto} />);

      const button = screen.getByRole('button', { name: /marcar como entregado/i });
      expect(button).toBeInTheDocument();
    });

    it('should show tracking indicator', () => {
      render(<DeliveryActions order={mockOrderEnReparto} />);

      expect(screen.getByText(/tracking activo/i)).toBeInTheDocument();
      expect(screen.getByText(/Última ubicación/)).toBeInTheDocument();
    });

    it('should display GPS coordinates', () => {
      render(<DeliveryActions order={mockOrderEnReparto} />);

      expect(screen.getByText(/19\.43260/)).toBeInTheDocument();
      expect(screen.getByText(/-99\.13320/)).toBeInTheDocument();
    });

    it('should call API when "Marcar como Entregado" is clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<DeliveryActions order={mockOrderEnReparto} />);

      const button = screen.getByRole('button', { name: /marcar como entregado/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/pedidos/order456/marcar-entregado',
          expect.objectContaining({
            method: 'PUT',
            headers: expect.objectContaining({
              'Authorization': 'Bearer fake-token',
            }),
          })
        );
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '🎉 Pedido Entregado',
        })
      );

      expect(mockPush).toHaveBeenCalledWith('/repartidor/dashboard');
    });

    it('should handle completion error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'El pedido no está en reparto' }),
      });

      render(<DeliveryActions order={mockOrderEnReparto} />);

      const button = screen.getByRole('button', { name: /marcar como entregado/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error al completar',
            description: 'El pedido no está en reparto',
            variant: 'destructive',
          })
        );
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should show accuracy in meters', () => {
      render(<DeliveryActions order={mockOrderEnReparto} />);

      expect(screen.getByText(/±15m/)).toBeInTheDocument();
    });
  });

  describe('Order status: Entregado', () => {
    it('should show delivered message', () => {
      render(<DeliveryActions order={mockOrderEntregado} />);

      expect(screen.getByText(/pedido ya entregado/i)).toBeInTheDocument();
    });

    it('should not show any action buttons', () => {
      render(<DeliveryActions order={mockOrderEntregado} />);

      expect(screen.queryByRole('button', { name: /salir a entregar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /marcar como entregado/i })).not.toBeInTheDocument();
    });

    it('should render check circle icon', () => {
      render(<DeliveryActions order={mockOrderEntregado} />);

      const checkIcon = screen.getByTestId('check-circle-icon');
      expect(checkIcon).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle network error gracefully when starting delivery', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: { latitude: 19.4326, longitude: -99.1332, accuracy: 15, heading: null, speed: null },
        });
      });

      render(<DeliveryActions order={mockOrderPreparando} />);

      const button = screen.getByRole('button', { name: /salir a entregar/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error al actualizar',
            description: 'Verifica tu conexión',
            variant: 'destructive',
          })
        );
      });
    });

    it('should handle network error when completing delivery', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<DeliveryActions order={mockOrderEnReparto} />);

      const button = screen.getByRole('button', { name: /marcar como entregado/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error al completar',
            description: 'Verifica tu conexión',
            variant: 'destructive',
          })
        );
      });
    });
  });
});
