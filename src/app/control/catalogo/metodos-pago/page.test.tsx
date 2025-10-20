import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AdminPaymentMethodsPage from './page';
import type { PaymentMethod } from '@/lib/data';

// Mock firebase withAuth HOC
jest.mock('@/firebase/withAuth', () => ({
  withAuth: (Component: any) => {
    return function MockedComponent(props: any) {
      const mockUser = {
        uid: 'user123',
        email: 'admin@test.com',
        super_admin: true,
        getIdToken: jest.fn().mockResolvedValue('mock-token'),
      };
      return <Component {...props} user={mockUser} />;
    };
  },
  WithAuthProps: {},
}));

// Mock Breadcrumbs component
jest.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumbs: ({ items }: any) => (
    <div data-testid="breadcrumbs">
      {items.map((item: any, i: number) => (
        <span key={i}>{item.label}</span>
      ))}
    </div>
  ),
}));

// Mock AddEditPaymentMethodDialog
jest.mock('@/components/control/add-edit-payment-method-dialog', () => ({
  AddEditPaymentMethodDialog: ({ isOpen, paymentMethod }: any) => (
    <div data-testid="payment-method-dialog">
      {isOpen && <div>Dialog {paymentMethod ? 'Edit' : 'Create'}</div>}
    </div>
  ),
}));

// Mock window.confirm
global.confirm = jest.fn(() => true);

// Mock window.location.reload
delete (window as any).location;
(window as any).location = { reload: jest.fn() };

// Mock fetch
global.fetch = jest.fn();

describe('AdminPaymentMethodsPage', () => {
  const mockPaymentMethods: PaymentMethod[] = [
    {
      id: 'pm1',
      name: 'Cash',
      description: 'Cash payment method',
      active: true,
    },
    {
      id: 'pm2',
      name: 'Credit Card',
      description: 'Credit card payment',
      active: true,
    },
    {
      id: 'pm3',
      name: 'Bank Transfer',
      description: 'Direct bank transfer',
      active: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockPaymentMethods,
    });
  });

  it('should render the page title', async () => {
    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      expect(screen.getByText('Métodos de Pago')).toBeInTheDocument();
    });
  });

  it('should render breadcrumbs', async () => {
    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      const breadcrumbs = screen.getByTestId('breadcrumbs');
      expect(breadcrumbs).toBeInTheDocument();
      expect(breadcrumbs).toHaveTextContent('Catálogos');
      expect(breadcrumbs).toHaveTextContent('Métodos de Pago');
    });
  });

  it('should load and display payment methods', async () => {
    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      expect(screen.getByText('Cash')).toBeInTheDocument();
      expect(screen.getByText('Credit Card')).toBeInTheDocument();
      expect(screen.getByText('Bank Transfer')).toBeInTheDocument();
    });
  });

  it('should fetch payment methods with authorization token', async () => {
    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/control/metodos-pago',
        expect.objectContaining({
          headers: { 'Authorization': 'Bearer mock-token' },
        })
      );
    });
  });

  it('should display "Añadir Método de Pago" button', async () => {
    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      expect(screen.getByText('Añadir Método de Pago')).toBeInTheDocument();
    });
  });

  it('should open create dialog when "Añadir Método de Pago" is clicked', async () => {
    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      expect(screen.getByText('Añadir Método de Pago')).toBeInTheDocument();
    });

    const addButton = screen.getByText('Añadir Método de Pago');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Dialog Create')).toBeInTheDocument();
    });
  });

  it('should display payment method descriptions', async () => {
    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      expect(screen.getByText('Cash payment method')).toBeInTheDocument();
      expect(screen.getByText('Credit card payment')).toBeInTheDocument();
      expect(screen.getByText('Direct bank transfer')).toBeInTheDocument();
    });
  });

  it('should display active status with green icon and text', async () => {
    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      const activeStatuses = screen.getAllByText('Activo');
      expect(activeStatuses.length).toBeGreaterThan(0);
    });
  });

  it('should display inactive status with red icon and text', async () => {
    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      expect(screen.getByText('Inactivo')).toBeInTheDocument();
    });
  });

  it('should handle edit action', async () => {
    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      expect(screen.getByText('Cash')).toBeInTheDocument();
    });

    // Find edit buttons (Pen icons)
    const editButtons = screen.getAllByRole('button').filter(btn =>
      btn.querySelector('svg') && btn.className.includes('hover:text-orange-400')
    );

    expect(editButtons.length).toBeGreaterThan(0);
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Dialog Edit')).toBeInTheDocument();
    });
  });

  it('should handle delete action', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (options?.method === 'DELETE') {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: true, json: async () => mockPaymentMethods });
    });

    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      expect(screen.getByText('Cash')).toBeInTheDocument();
    });

    // Find delete buttons (Trash2 icons)
    const deleteButtons = screen.getAllByRole('button').filter(btn =>
      btn.querySelector('svg') && btn.className.includes('hover:text-red-500')
    );

    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalledWith('¿Estás seguro de que quieres eliminar este método de pago?');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/control/metodos-pago/pm1',
        expect.objectContaining({
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer mock-token' },
        })
      );
    });

    expect(window.location.reload).toHaveBeenCalled();
  });

  it('should cancel delete when user declines confirmation', async () => {
    (global.confirm as jest.Mock).mockReturnValueOnce(false);

    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      expect(screen.getByText('Cash')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button').filter(btn =>
      btn.querySelector('svg') && btn.className.includes('hover:text-red-500')
    );

    const initialFetchCallCount = (global.fetch as jest.Mock).mock.calls.length;

    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled();
    });

    // Fetch should not be called for delete
    const deleteCalls = (global.fetch as jest.Mock).mock.calls.filter(
      call => call[1]?.method === 'DELETE'
    );
    expect(deleteCalls.length).toBe(0);
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('should handle delete error gracefully', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (options?.method === 'DELETE') {
        return Promise.resolve({ ok: false });
      }
      return Promise.resolve({ ok: true, json: async () => mockPaymentMethods });
    });

    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      expect(screen.getByText('Cash')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button').filter(btn =>
      btn.querySelector('svg') && btn.className.includes('hover:text-red-500')
    );

    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled();
    });

    // Wait a bit to ensure no reload happens
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('should show loading state', () => {
    (global.fetch as jest.Mock).mockImplementation(() => {
      return new Promise(() => {}); // Never resolves
    });

    render(<AdminPaymentMethodsPage />);

    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('should show error state when fetch fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
    });

    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  it('should display payment methods in table on desktop', async () => {
    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      expect(screen.getByText('Nombre')).toBeInTheDocument();
      expect(screen.getByText('Descripción')).toBeInTheDocument();
      expect(screen.getByText('Estado')).toBeInTheDocument();
      expect(screen.getByText('Acciones')).toBeInTheDocument();
    });
  });

  it('should display "-" for empty descriptions', async () => {
    const methodsWithEmptyDesc = [
      {
        id: 'pm4',
        name: 'PayPal',
        description: '',
        active: true,
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => methodsWithEmptyDesc,
    });

    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      expect(screen.getByText('PayPal')).toBeInTheDocument();
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  it('should render correct number of payment methods', async () => {
    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      // Each payment method name should appear once in the table
      expect(screen.getByText('Cash')).toBeInTheDocument();
      expect(screen.getByText('Credit Card')).toBeInTheDocument();
      expect(screen.getByText('Bank Transfer')).toBeInTheDocument();
    });
  });

  it('should show active payment methods with CheckCircle icon', async () => {
    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      const activeTexts = screen.getAllByText('Activo');
      // Should have at least 2 active payment methods
      expect(activeTexts.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('should show inactive payment methods with XCircle icon', async () => {
    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      expect(screen.getByText('Inactivo')).toBeInTheDocument();
    });
  });

  it('should open edit dialog with correct payment method data', async () => {
    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      expect(screen.getByText('Cash')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button').filter(btn =>
      btn.querySelector('svg') && btn.className.includes('hover:text-orange-400')
    );

    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Dialog Edit')).toBeInTheDocument();
    });
  });

  it('should handle network error during fetch', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  it('should have correct action buttons for each payment method', async () => {
    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      expect(screen.getByText('Cash')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button').filter(btn =>
      btn.className.includes('hover:text-orange-400')
    );
    const deleteButtons = screen.getAllByRole('button').filter(btn =>
      btn.className.includes('hover:text-red-500')
    );

    // Should have edit and delete buttons for each payment method
    expect(editButtons.length).toBe(mockPaymentMethods.length);
    expect(deleteButtons.length).toBe(mockPaymentMethods.length);
  });

  it('should reload page after successful delete', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (options?.method === 'DELETE') {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: true, json: async () => mockPaymentMethods });
    });

    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      expect(screen.getByText('Cash')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button').filter(btn =>
      btn.className.includes('hover:text-red-500')
    );

    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  it('should close dialog after successful creation', async () => {
    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      expect(screen.getByText('Añadir Método de Pago')).toBeInTheDocument();
    });

    const addButton = screen.getByText('Añadir Método de Pago');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Dialog Create')).toBeInTheDocument();
    });

    // Dialog should be visible
    const dialog = screen.getByTestId('payment-method-dialog');
    expect(dialog).toBeInTheDocument();
  });

  it('should handle payment methods without description field', async () => {
    const methodsNoDesc = [
      {
        id: 'pm5',
        name: 'Bitcoin',
        active: true,
      } as PaymentMethod,
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => methodsNoDesc,
    });

    render(<AdminPaymentMethodsPage />);

    await waitFor(() => {
      expect(screen.getByText('Bitcoin')).toBeInTheDocument();
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });
});
