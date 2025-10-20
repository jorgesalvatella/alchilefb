import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddEditPaymentMethodDialog } from '../add-edit-payment-method-dialog';
import type { PaymentMethod } from '@/lib/data';

// Mock firebase provider
const mockUser = {
  getIdToken: jest.fn().mockResolvedValue('mock-token'),
};

jest.mock('@/firebase/provider', () => ({
  useUser: () => ({ user: mockUser }),
}));

// Mock toast
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock window.location.reload
delete (window as any).location;
(window as any).location = { reload: jest.fn() };

describe('AddEditPaymentMethodDialog', () => {
  const mockOnOpenChange = jest.fn();

  const mockPaymentMethod: PaymentMethod = {
    id: 'pm1',
    name: 'Cash',
    description: 'Cash payment method',
    active: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockToast.mockClear();
    mockOnOpenChange.mockClear();
  });

  it('should render create payment method dialog when paymentMethod is null', () => {
    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={null}
      />
    );

    expect(screen.getByText('Añadir Método de Pago')).toBeInTheDocument();
    expect(screen.getByText(/Completa los detalles del método de pago/)).toBeInTheDocument();
  });

  it('should render edit payment method dialog when paymentMethod is provided', () => {
    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={mockPaymentMethod}
      />
    );

    expect(screen.getByText('Editar Método de Pago')).toBeInTheDocument();
  });

  it('should populate form fields when editing a payment method', () => {
    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={mockPaymentMethod}
      />
    );

    const nameInput = screen.getByLabelText(/Nombre/) as HTMLInputElement;
    expect(nameInput.value).toBe('Cash');

    const descriptionInput = screen.getByLabelText(/Descripción/) as HTMLTextAreaElement;
    expect(descriptionInput.value).toBe('Cash payment method');

    expect(screen.getByText('El método de pago está activo')).toBeInTheDocument();
  });

  it('should initialize with active state true when creating new payment method', () => {
    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={null}
      />
    );

    expect(screen.getByText('El método de pago está activo')).toBeInTheDocument();
  });

  it('should show validation error when name is missing', async () => {
    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={null}
      />
    );

    const saveButton = screen.getByText('Guardar Cambios');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'El nombre del método de pago es obligatorio.',
        variant: 'destructive',
      });
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should show validation error when name is only whitespace', async () => {
    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={null}
      />
    );

    const nameInput = screen.getByLabelText(/Nombre/) as HTMLInputElement;
    await userEvent.type(nameInput, '   ');

    const saveButton = screen.getByText('Guardar Cambios');
    fireEvent.click(saveButton);

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
      json: async () => ({ id: 'pm2', name: 'Credit Card', description: 'CC Payment', active: true }),
    });

    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={null}
      />
    );

    const nameInput = screen.getByLabelText(/Nombre/) as HTMLInputElement;
    await userEvent.type(nameInput, 'Credit Card');

    const descriptionInput = screen.getByLabelText(/Descripción/) as HTMLTextAreaElement;
    await userEvent.type(descriptionInput, 'CC Payment');

    const saveButton = screen.getByText('Guardar Cambios');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/control/metodos-pago',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          },
          body: JSON.stringify({
            name: 'Credit Card',
            description: 'CC Payment',
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

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('should update existing payment method successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaymentMethod,
    });

    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={mockPaymentMethod}
      />
    );

    const nameInput = screen.getByLabelText(/Nombre/) as HTMLInputElement;
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Cash Updated');

    const saveButton = screen.getByText('Guardar Cambios');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/control/metodos-pago/pm1',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          },
          body: JSON.stringify({
            name: 'Cash Updated',
            description: 'Cash payment method',
            active: true,
          }),
        })
      );
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Éxito',
        description: 'Método de pago actualizado correctamente.',
      });
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('should toggle active state', async () => {
    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={mockPaymentMethod}
      />
    );

    expect(screen.getByText('El método de pago está activo')).toBeInTheDocument();

    const switchElement = screen.getByRole('switch');
    fireEvent.click(switchElement);

    await waitFor(() => {
      expect(screen.getByText('El método de pago está inactivo')).toBeInTheDocument();
    });
  });

  it('should handle API error when creating payment method', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Payment method already exists' }),
    });

    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={null}
      />
    );

    const nameInput = screen.getByLabelText(/Nombre/) as HTMLInputElement;
    await userEvent.type(nameInput, 'Duplicate Name');

    const saveButton = screen.getByText('Guardar Cambios');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Payment method already exists',
        variant: 'destructive',
      });
    });

    expect(mockOnOpenChange).not.toHaveBeenCalled();
    expect(window.location.reload).not.toHaveBeenCalled();
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

    const nameInput = screen.getByLabelText(/Nombre/) as HTMLInputElement;
    await userEvent.type(nameInput, 'Test Payment');

    const saveButton = screen.getByText('Guardar Cambios');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Network error',
        variant: 'destructive',
      });
    });
  });

  it('should close dialog when cancel button is clicked', () => {
    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={null}
      />
    );

    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should disable buttons during submission', async () => {
    (global.fetch as jest.Mock).mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({}),
          });
        }, 100);
      });
    });

    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={null}
      />
    );

    const nameInput = screen.getByLabelText(/Nombre/) as HTMLInputElement;
    await userEvent.type(nameInput, 'Test Payment');

    const saveButton = screen.getByText('Guardar Cambios');
    const cancelButton = screen.getByText('Cancelar');

    fireEvent.click(saveButton);

    // Buttons should be disabled during submission
    expect(saveButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled();
    });
  });

  it('should reset form when dialog closes and reopens for new payment method', () => {
    const { rerender } = render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={mockPaymentMethod}
      />
    );

    const nameInput = screen.getByLabelText(/Nombre/) as HTMLInputElement;
    expect(nameInput.value).toBe('Cash');

    // Close dialog
    rerender(
      <AddEditPaymentMethodDialog
        isOpen={false}
        onOpenChange={mockOnOpenChange}
        paymentMethod={mockPaymentMethod}
      />
    );

    // Reopen with null payment method
    rerender(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={null}
      />
    );

    const resetNameInput = screen.getByLabelText(/Nombre/) as HTMLInputElement;
    expect(resetNameInput.value).toBe('');
  });

  it('should handle payment method with undefined active status', () => {
    const paymentMethodNoActive = {
      id: 'pm2',
      name: 'Transfer',
      description: 'Bank transfer',
      active: undefined,
    } as any;

    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={paymentMethodNoActive}
      />
    );

    // Should default to active
    expect(screen.getByText('El método de pago está activo')).toBeInTheDocument();
  });

  it('should handle inactive payment method', () => {
    const inactivePaymentMethod = {
      ...mockPaymentMethod,
      active: false,
    };

    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={inactivePaymentMethod}
      />
    );

    expect(screen.getByText('El método de pago está inactivo')).toBeInTheDocument();
  });

  it('should allow empty description', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'pm3', name: 'PayPal', description: '', active: true }),
    });

    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={null}
      />
    );

    const nameInput = screen.getByLabelText(/Nombre/) as HTMLInputElement;
    await userEvent.type(nameInput, 'PayPal');

    const saveButton = screen.getByText('Guardar Cambios');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/control/metodos-pago',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'PayPal',
            description: '',
            active: true,
          }),
        })
      );
    });
  });

  it('should show default error message when API error has no message', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    render(
      <AddEditPaymentMethodDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        paymentMethod={null}
      />
    );

    const nameInput = screen.getByLabelText(/Nombre/) as HTMLInputElement;
    await userEvent.type(nameInput, 'Test');

    const saveButton = screen.getByText('Guardar Cambios');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Error al guardar el método de pago.',
        variant: 'destructive',
      });
    });
  });
});
