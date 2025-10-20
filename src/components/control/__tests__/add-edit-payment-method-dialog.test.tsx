import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AddEditPaymentMethodDialog } from '../add-edit-payment-method-dialog';
import type { PaymentMethod } from '@/lib/data';

// Mock dinámico de Firebase provider
const mockUseUser = jest.fn();
jest.mock('@/firebase/provider', () => ({
  useUser: () => mockUseUser(),
}));

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

const mockOnOpenChange = jest.fn();
const mockReload = jest.fn();

// Mock window.location.reload
delete (window as any).location;
window.location = { reload: mockReload } as any;

describe('AddEditPaymentMethodDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();

    // Mock useUser con valores por defecto
    mockUseUser.mockReturnValue({
      user: mockUser,
    });
  });

  it('should render dialog in add mode', () => {
    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={null}
      />
    );

    expect(screen.getByText('Añadir Método de Pago')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('');
  });

  it('should render dialog in edit mode with existing data', () => {
    const paymentMethod: PaymentMethod = {
      id: '1',
      name: 'Efectivo',
      description: 'Pago en efectivo',
      active: true,
    };

    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={paymentMethod}
      />
    );

    expect(screen.getByText('Editar Método de Pago')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Efectivo');
    expect(screen.getByLabelText(/Descripción/)).toHaveValue('Pago en efectivo');
  });

  it('should show error when submitting without name', async () => {
    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={null}
      />
    );

    const submitButton = screen.getByRole('button', { name: /Guardar/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'El nombre del método de pago es obligatorio.',
        variant: 'destructive',
      });
    });
  });

  it('should create new payment method successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '1', name: 'Nuevo Método' }),
    });

    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={null}
      />
    );

    const nameInput = screen.getByLabelText(/Nombre/);
    const descriptionInput = screen.getByLabelText(/Descripción/);

    fireEvent.change(nameInput, { target: { value: 'Nuevo Método' } });
    fireEvent.change(descriptionInput, { target: { value: 'Descripción del método' } });

    const submitButton = screen.getByRole('button', { name: /Guardar/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/control/metodos-pago',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          }),
          body: JSON.stringify({
            name: 'Nuevo Método',
            description: 'Descripción del método',
            active: true,
          }),
        })
      );
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Éxito',
        description: 'Método de pago creado correctamente.',
      });
    });
  });

  it('should update existing payment method successfully', async () => {
    const paymentMethod: PaymentMethod = {
      id: '1',
      name: 'Efectivo',
      description: 'Pago en efectivo',
      active: true,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => paymentMethod,
    });

    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={paymentMethod}
      />
    );

    const nameInput = screen.getByLabelText(/Nombre/);
    fireEvent.change(nameInput, { target: { value: 'Efectivo Actualizado' } });

    const submitButton = screen.getByRole('button', { name: /Guardar/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/control/metodos-pago/1',
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Éxito',
        description: 'Método de pago actualizado correctamente.',
      });
    });
  });

  it('should toggle active state', async () => {
    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={null}
      />
    );

    const activeSwitch = screen.getByRole('switch');
    expect(activeSwitch).toBeChecked();

    fireEvent.click(activeSwitch);

    expect(activeSwitch).not.toBeChecked();
  });

  it('should handle API error when creating payment method', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Error del servidor' }),
    });

    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={null}
      />
    );

    const nameInput = screen.getByLabelText(/Nombre/);
    fireEvent.change(nameInput, { target: { value: 'Nuevo Método' } });

    const submitButton = screen.getByRole('button', { name: /Guardar/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Error del servidor',
        variant: 'destructive',
      });
    });

    // No debe llamarse reload en caso de error
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('should handle network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={null}
      />
    );

    const nameInput = screen.getByLabelText(/Nombre/);
    fireEvent.change(nameInput, { target: { value: 'Nuevo Método' } });

    const submitButton = screen.getByRole('button', { name: /Guardar/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Network error',
        variant: 'destructive',
      });
    });
  });

  it('should reset form when dialog opens in add mode', () => {
    const { rerender } = render(
      <AddEditPaymentMethodDialog
        isOpen={false}
        onOpenChange={mockOnOpenChange}
        paymentMethod={null}
      />
    );

    rerender(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={null}
      />
    );

    expect(screen.getByLabelText(/Nombre/)).toHaveValue('');
    expect(screen.getByLabelText(/Descripción/)).toHaveValue('');
    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('should disable submit button while loading', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100))
    );

    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={null}
      />
    );

    const nameInput = screen.getByLabelText(/Nombre/);
    fireEvent.change(nameInput, { target: { value: 'Nuevo Método' } });

    const submitButton = screen.getByRole('button', { name: /Guardar/i });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
  });
});
