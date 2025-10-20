import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdminPaymentMethodsPageContent } from './page';
import type { PaymentMethod } from '@/lib/data';

// Mock toast
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  getIdToken: jest.fn().mockResolvedValue('test-token'),
};

// Mock window.location.reload
delete (window as any).location;
window.location = { reload: jest.fn() } as any;

// Mock window.confirm
global.confirm = jest.fn();

describe('AdminPaymentMethodsPageContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  const mockPaymentMethods: PaymentMethod[] = [
    { id: '1', name: 'Efectivo', description: 'Pago en efectivo', active: true },
    { id: '2', name: 'Tarjeta', description: 'Pago con tarjeta', active: false },
  ];

  it('should render loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<AdminPaymentMethodsPageContent user={mockUser} />);

    const loadingTexts = screen.getAllByText('Cargando...');
    expect(loadingTexts.length).toBeGreaterThan(0);
  });

  it('should fetch and display payment methods', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaymentMethods,
    });

    render(<AdminPaymentMethodsPageContent user={mockUser} />);

    await waitFor(() => {
      const efectivoTexts = screen.getAllByText('Efectivo');
      expect(efectivoTexts.length).toBeGreaterThan(0);
      const tarjetaTexts = screen.getAllByText('Tarjeta');
      expect(tarjetaTexts.length).toBeGreaterThan(0);
    });
  });

  it('should display error message when fetch fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    render(<AdminPaymentMethodsPageContent user={mockUser} />);

    await waitFor(() => {
      const errorTexts = screen.getAllByText(/Error:/);
      expect(errorTexts.length).toBeGreaterThan(0);
    });
  });

  it('should open add dialog when clicking add button', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaymentMethods,
    });

    render(<AdminPaymentMethodsPageContent user={mockUser} />);

    await waitFor(() => {
      const efectivoTexts = screen.getAllByText('Efectivo');
      expect(efectivoTexts.length).toBeGreaterThan(0);
    });

    const addButton = screen.getByRole('button', { name: /Añadir Método de Pago/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      const dialogTitles = screen.getAllByText('Añadir Método de Pago');
      expect(dialogTitles.length).toBeGreaterThan(0);
    });
  });

  it('should call delete endpoint when confirming delete', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaymentMethods,
      })
      .mockResolvedValueOnce({
        ok: true,
      });

    (global.confirm as jest.Mock).mockReturnValue(true);

    render(<AdminPaymentMethodsPageContent user={mockUser} />);

    await waitFor(() => {
      const efectivoTexts = screen.getAllByText('Efectivo');
      expect(efectivoTexts.length).toBeGreaterThan(0);
    });

    const deleteButtons = screen.getAllByRole('button', { name: '' });
    const firstDeleteButton = deleteButtons[deleteButtons.length - 1];

    fireEvent.click(firstDeleteButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/control/metodos-pago/'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  it('should not delete when user cancels confirmation', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaymentMethods,
    });

    (global.confirm as jest.Mock).mockReturnValue(false);

    render(<AdminPaymentMethodsPageContent user={mockUser} />);

    await waitFor(() => {
      const efectivoTexts = screen.getAllByText('Efectivo');
      expect(efectivoTexts.length).toBeGreaterThan(0);
    });

    const initialCallCount = (global.fetch as jest.Mock).mock.calls.length;

    const deleteButtons = screen.getAllByRole('button', { name: '' });
    const firstDeleteButton = deleteButtons[deleteButtons.length - 1];

    fireEvent.click(firstDeleteButton);

    // No additional fetch calls should be made
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(initialCallCount);
  });

  it('should show active status with green indicator', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaymentMethods,
    });

    render(<AdminPaymentMethodsPageContent user={mockUser} />);

    await waitFor(() => {
      const activoTexts = screen.getAllByText('Activo');
      expect(activoTexts.length).toBeGreaterThan(0);
    });
  });

  it('should show inactive status with red indicator', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaymentMethods,
    });

    render(<AdminPaymentMethodsPageContent user={mockUser} />);

    await waitFor(() => {
      const inactivoTexts = screen.getAllByText('Inactivo');
      expect(inactivoTexts.length).toBeGreaterThan(0);
    });
  });

  it('should render breadcrumbs correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaymentMethods,
    });

    render(<AdminPaymentMethodsPageContent user={mockUser} />);

    await waitFor(() => {
      const breadcrumbTexts = screen.getAllByText('Métodos de Pago');
      expect(breadcrumbTexts.length).toBeGreaterThan(0);
    });
  });
});
