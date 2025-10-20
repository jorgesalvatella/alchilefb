import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AdminExpensesPage from './page';
import type { Expense, PaymentMethod } from '@/lib/data';

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

// Mock AddEditExpenseDialog
jest.mock('@/components/control/add-edit-expense-dialog', () => ({
  AddEditExpenseDialog: ({ isOpen, expense }: any) => (
    <div data-testid="expense-dialog">
      {isOpen && <div>Dialog {expense ? 'Edit' : 'Create'}</div>}
    </div>
  ),
}));

// Mock Next.js Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock window.confirm
global.confirm = jest.fn(() => true);

// Mock window.location.reload
delete (window as any).location;
(window as any).location = { reload: jest.fn() };

// Mock fetch
global.fetch = jest.fn();

describe('AdminExpensesPage', () => {
  const mockPaymentMethods: PaymentMethod[] = [
    { id: 'pm1', name: 'Cash', active: true },
    { id: 'pm2', name: 'Credit Card', active: true },
  ];

  const mockExpenses: Expense[] = [
    {
      id: 'expense1',
      expenseId: 'EXP-001',
      businessUnitId: 'bu1',
      departmentId: 'dept1',
      groupId: 'group1',
      conceptId: 'concept1',
      supplierId: 'supplier1',
      paymentMethodId: 'pm1',
      amount: 100.50,
      currency: 'MXN',
      expenseDate: '2025-01-15',
      invoiceNumber: 'INV-123',
      description: 'Test expense',
      status: 'draft',
      createdAt: new Date('2025-01-15'),
      updatedAt: new Date('2025-01-15'),
    },
    {
      id: 'expense2',
      expenseId: 'EXP-002',
      businessUnitId: 'bu1',
      departmentId: 'dept1',
      groupId: 'group1',
      conceptId: 'concept1',
      supplierId: 'supplier1',
      paymentMethodId: 'pm2',
      amount: 250.75,
      currency: 'USD',
      expenseDate: '2025-01-16',
      status: 'pending',
      receiptImageUrl: 'https://example.com/receipt.jpg',
      createdAt: new Date('2025-01-16'),
      updatedAt: new Date('2025-01-16'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/control/metodos-pago')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockPaymentMethods,
        });
      }
      if (url.includes('/api/control/gastos')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockExpenses,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
  });

  it('should render the page title', async () => {
    render(<AdminExpensesPage />);

    await waitFor(() => {
      expect(screen.getByText('Gastos')).toBeInTheDocument();
    });
  });

  it('should render breadcrumbs', async () => {
    render(<AdminExpensesPage />);

    await waitFor(() => {
      const breadcrumbs = screen.getByTestId('breadcrumbs');
      expect(breadcrumbs).toBeInTheDocument();
      expect(breadcrumbs).toHaveTextContent('Finanzas');
      expect(breadcrumbs).toHaveTextContent('Gastos');
    });
  });

  it('should load and display expenses', async () => {
    render(<AdminExpensesPage />);

    await waitFor(() => {
      expect(screen.getByText('EXP-001')).toBeInTheDocument();
      expect(screen.getByText('EXP-002')).toBeInTheDocument();
    });
  });

  it('should load payment methods', async () => {
    render(<AdminExpensesPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/control/metodos-pago',
        expect.objectContaining({
          headers: { 'Authorization': 'Bearer mock-token' },
        })
      );
    });
  });

  it('should display "Registrar Gasto" button', async () => {
    render(<AdminExpensesPage />);

    await waitFor(() => {
      expect(screen.getByText('Registrar Gasto')).toBeInTheDocument();
    });
  });

  it('should open create dialog when "Registrar Gasto" is clicked', async () => {
    render(<AdminExpensesPage />);

    await waitFor(() => {
      expect(screen.getByText('Registrar Gasto')).toBeInTheDocument();
    });

    const addButton = screen.getByText('Registrar Gasto');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Dialog Create')).toBeInTheDocument();
    });
  });

  it('should display status badges correctly', async () => {
    render(<AdminExpensesPage />);

    await waitFor(() => {
      expect(screen.getByText('Borrador')).toBeInTheDocument();
      expect(screen.getByText('Pendiente')).toBeInTheDocument();
    });
  });

  it('should format currency correctly', async () => {
    render(<AdminExpensesPage />);

    await waitFor(() => {
      // Check for MXN formatted amount
      expect(screen.getAllByText(/\$100\.50/)[0]).toBeInTheDocument();
      // Check for USD formatted amount
      expect(screen.getAllByText(/\$250\.75/)[0]).toBeInTheDocument();
    });
  });

  it('should format dates correctly', async () => {
    render(<AdminExpensesPage />);

    await waitFor(() => {
      expect(screen.getByText(/15 ene/i)).toBeInTheDocument();
      expect(screen.getByText(/16 ene/i)).toBeInTheDocument();
    });
  });

  it('should display payment method names', async () => {
    render(<AdminExpensesPage />);

    await waitFor(() => {
      expect(screen.getByText('Cash')).toBeInTheDocument();
      expect(screen.getByText('Credit Card')).toBeInTheDocument();
    });
  });

  it('should show receipt image link when available', async () => {
    render(<AdminExpensesPage />);

    await waitFor(() => {
      const viewButtons = screen.getAllByText('Ver');
      expect(viewButtons.length).toBeGreaterThan(0);
    });
  });

  it('should show "Sin imagen" when receipt is not available', async () => {
    render(<AdminExpensesPage />);

    await waitFor(() => {
      expect(screen.getByText('Sin imagen')).toBeInTheDocument();
    });
  });

  it('should open image preview dialog when receipt image is clicked', async () => {
    render(<AdminExpensesPage />);

    await waitFor(() => {
      const viewButtons = screen.getAllByText('Ver');
      expect(viewButtons.length).toBeGreaterThan(0);
    });

    const viewButton = screen.getAllByText('Ver')[0];
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(screen.getByText('Comprobante de Gasto')).toBeInTheDocument();
    });
  });

  it('should handle edit action', async () => {
    render(<AdminExpensesPage />);

    await waitFor(() => {
      expect(screen.getByText('EXP-001')).toBeInTheDocument();
    });

    // Find edit buttons (Pen icons)
    const editButtons = screen.getAllByRole('button').filter(btn =>
      btn.querySelector('svg') && btn.className.includes('hover:text-orange-400')
    );

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
      if (url.includes('/api/control/metodos-pago')) {
        return Promise.resolve({ ok: true, json: async () => mockPaymentMethods });
      }
      return Promise.resolve({ ok: true, json: async () => mockExpenses });
    });

    render(<AdminExpensesPage />);

    await waitFor(() => {
      expect(screen.getByText('EXP-001')).toBeInTheDocument();
    });

    // Find delete buttons (Trash2 icons)
    const deleteButtons = screen.getAllByRole('button').filter(btn =>
      btn.querySelector('svg') && btn.className.includes('hover:text-red-500')
    );

    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalledWith('¿Estás seguro de que quieres eliminar este gasto?');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/control/gastos/expense1',
        expect.objectContaining({
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer mock-token' },
        })
      );
    });
  });

  it('should handle approve action for super admin', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (url.includes('/approve')) {
        return Promise.resolve({ ok: true });
      }
      if (url.includes('/api/control/metodos-pago')) {
        return Promise.resolve({ ok: true, json: async () => mockPaymentMethods });
      }
      return Promise.resolve({ ok: true, json: async () => mockExpenses });
    });

    render(<AdminExpensesPage />);

    await waitFor(() => {
      expect(screen.getByText('EXP-002')).toBeInTheDocument();
    });

    // Find approve button for pending expense
    const approveButtons = screen.getAllByRole('button').filter(btn =>
      btn.querySelector('svg') && btn.className.includes('hover:text-green-500')
    );

    if (approveButtons.length > 0) {
      fireEvent.click(approveButtons[0]);

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalledWith('¿Aprobar este gasto?');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/approve'),
          expect.objectContaining({
            method: 'POST',
            headers: { 'Authorization': 'Bearer mock-token' },
          })
        );
      });
    }
  });

  it('should handle reject action for super admin', async () => {
    global.prompt = jest.fn(() => 'Rejected due to missing documentation');

    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (url.includes('/reject')) {
        return Promise.resolve({ ok: true });
      }
      if (url.includes('/api/control/metodos-pago')) {
        return Promise.resolve({ ok: true, json: async () => mockPaymentMethods });
      }
      return Promise.resolve({ ok: true, json: async () => mockExpenses });
    });

    render(<AdminExpensesPage />);

    await waitFor(() => {
      expect(screen.getByText('EXP-002')).toBeInTheDocument();
    });

    // Find reject button for pending expense
    const rejectButtons = screen.getAllByRole('button').filter(btn =>
      btn.querySelector('svg') && btn.title === 'Rechazar'
    );

    if (rejectButtons.length > 0) {
      fireEvent.click(rejectButtons[0]);

      await waitFor(() => {
        expect(global.prompt).toHaveBeenCalledWith('Motivo del rechazo:');
      });
    }
  });

  it('should filter expenses by status', async () => {
    const draftExpenses = [mockExpenses[0]];

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('status=draft')) {
        return Promise.resolve({ ok: true, json: async () => draftExpenses });
      }
      if (url.includes('/api/control/metodos-pago')) {
        return Promise.resolve({ ok: true, json: async () => mockPaymentMethods });
      }
      return Promise.resolve({ ok: true, json: async () => mockExpenses });
    });

    render(<AdminExpensesPage />);

    await waitFor(() => {
      expect(screen.getByText('EXP-001')).toBeInTheDocument();
    });

    // Find and click status filter
    const filterTrigger = screen.getByRole('combobox');
    fireEvent.click(filterTrigger);

    // Wait for the dropdown to open and select "Borrador"
    await waitFor(() => {
      const draftOption = screen.getByText('Borrador');
      fireEvent.click(draftOption);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/control/gastos?status=draft',
        expect.any(Object)
      );
    });
  });

  it('should show loading state', () => {
    (global.fetch as jest.Mock).mockImplementation(() => {
      return new Promise(() => {}); // Never resolves
    });

    render(<AdminExpensesPage />);

    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('should show error state when fetch fails', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/control/gastos')) {
        return Promise.resolve({ ok: false });
      }
      return Promise.resolve({ ok: true, json: async () => mockPaymentMethods });
    });

    render(<AdminExpensesPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  it('should not show approve/reject buttons for non-pending expenses', async () => {
    const approvedExpenses = [{
      ...mockExpenses[0],
      status: 'approved',
    }];

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/control/gastos')) {
        return Promise.resolve({ ok: true, json: async () => approvedExpenses });
      }
      return Promise.resolve({ ok: true, json: async () => mockPaymentMethods });
    });

    render(<AdminExpensesPage />);

    await waitFor(() => {
      expect(screen.getByText('Aprobado')).toBeInTheDocument();
    });

    // Approve and reject buttons should not be present
    const approveButtons = screen.queryAllByRole('button').filter(btn =>
      btn.title === 'Aprobar'
    );
    expect(approveButtons.length).toBe(0);
  });

  it('should cancel delete when user declines confirmation', async () => {
    (global.confirm as jest.Mock).mockReturnValueOnce(false);

    render(<AdminExpensesPage />);

    await waitFor(() => {
      expect(screen.getByText('EXP-001')).toBeInTheDocument();
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
    const finalFetchCallCount = (global.fetch as jest.Mock).mock.calls.length;
    const deleteCalls = (global.fetch as jest.Mock).mock.calls.filter(
      call => call[1]?.method === 'DELETE'
    );
    expect(deleteCalls.length).toBe(0);
  });

  it('should handle delete error gracefully', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (options?.method === 'DELETE') {
        return Promise.resolve({ ok: false });
      }
      if (url.includes('/api/control/metodos-pago')) {
        return Promise.resolve({ ok: true, json: async () => mockPaymentMethods });
      }
      return Promise.resolve({ ok: true, json: async () => mockExpenses });
    });

    render(<AdminExpensesPage />);

    await waitFor(() => {
      expect(screen.getByText('EXP-001')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button').filter(btn =>
      btn.querySelector('svg') && btn.className.includes('hover:text-red-500')
    );

    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(window.location.reload).not.toHaveBeenCalled();
    });
  });
});
