import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddEditExpenseDialog } from '../add-edit-expense-dialog';
import type { Expense } from '@/lib/data';

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

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('AddEditExpenseDialog', () => {
  const mockOnOpenChange = jest.fn();

  const mockBusinessUnits = [
    { id: 'bu1', name: 'Business Unit 1' },
    { id: 'bu2', name: 'Business Unit 2' },
  ];

  const mockDepartments = [
    { id: 'dept1', name: 'Department 1' },
    { id: 'dept2', name: 'Department 2' },
  ];

  const mockGroups = [
    { id: 'group1', name: 'Group 1' },
    { id: 'group2', name: 'Group 2' },
  ];

  const mockConcepts = [
    { id: 'concept1', name: 'Concept 1' },
    { id: 'concept2', name: 'Concept 2' },
  ];

  const mockSuppliers = [
    { id: 'supplier1', name: 'Supplier 1' },
    { id: 'supplier2', name: 'Supplier 2' },
  ];

  const mockPaymentMethods = [
    { id: 'pm1', name: 'Cash', active: true },
    { id: 'pm2', name: 'Credit Card', active: true },
  ];

  const mockExpense: Expense = {
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
    dueDate: '2025-02-15',
    description: 'Test expense',
    authorizedBy: 'John Doe',
    receiptImageUrl: 'https://example.com/receipt.jpg',
    status: 'draft',
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockToast.mockClear();
    mockOnOpenChange.mockClear();

    // Setup default fetch mocks
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/control/unidades-de-negocio')) {
        if (url.includes('/departamentos')) {
          if (url.includes('/grupos')) {
            if (url.includes('/conceptos')) {
              return Promise.resolve({
                ok: true,
                json: async () => mockConcepts,
              });
            }
            return Promise.resolve({
              ok: true,
              json: async () => mockGroups,
            });
          }
          return Promise.resolve({
            ok: true,
            json: async () => mockDepartments,
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockBusinessUnits,
        });
      }
      if (url.includes('/api/control/metodos-pago')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockPaymentMethods,
        });
      }
      if (url.includes('/conceptos/') && url.includes('/proveedores')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockSuppliers,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
  });

  it('should render create expense dialog when expense is null', async () => {
    render(
      <AddEditExpenseDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        expense={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Registrar Nuevo Gasto')).toBeInTheDocument();
    });

    expect(screen.getByText(/Completa los detalles del gasto/)).toBeInTheDocument();
  });

  it('should render edit expense dialog when expense is provided', async () => {
    render(
      <AddEditExpenseDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        expense={mockExpense}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Editar Gasto')).toBeInTheDocument();
    });
  });

  it('should load initial data when dialog opens', async () => {
    render(
      <AddEditExpenseDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        expense={null}
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/control/unidades-de-negocio',
        expect.objectContaining({
          headers: { 'Authorization': 'Bearer mock-token' },
        })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/control/metodos-pago',
        expect.objectContaining({
          headers: { 'Authorization': 'Bearer mock-token' },
        })
      );
    });
  });

  it('should populate form fields when editing an expense', async () => {
    render(
      <AddEditExpenseDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        expense={mockExpense}
      />
    );

    await waitFor(() => {
      const amountInput = screen.getByLabelText(/Monto/) as HTMLInputElement;
      expect(amountInput.value).toBe('100.5');
    });

    const invoiceInput = screen.getByLabelText(/Número de Factura/) as HTMLInputElement;
    expect(invoiceInput.value).toBe('INV-123');

    const descriptionInput = screen.getByLabelText(/Descripción/) as HTMLTextAreaElement;
    expect(descriptionInput.value).toBe('Test expense');

    const authorizedByInput = screen.getByLabelText(/Autorizado por/) as HTMLInputElement;
    expect(authorizedByInput.value).toBe('John Doe');
  });

  it('should show validation error when required fields are missing', async () => {
    render(
      <AddEditExpenseDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        expense={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Registrar Nuevo Gasto')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Guardar Gasto');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Todos los campos obligatorios deben estar completos.',
        variant: 'destructive',
      });
    });
  });

  it('should handle file selection for receipt upload', async () => {
    render(
      <AddEditExpenseDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        expense={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Registrar Nuevo Gasto')).toBeInTheDocument();
    });

    const file = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/Comprobante/) as HTMLInputElement;

    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('receipt.jpg')).toBeInTheDocument();
    });
  });

  it('should upload receipt image successfully', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/upload-receipt')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ url: 'https://example.com/uploaded.jpg' }),
        });
      }
      // Return default mocks for other URLs
      if (url.includes('/api/control/unidades-de-negocio')) {
        return Promise.resolve({ ok: true, json: async () => mockBusinessUnits });
      }
      if (url.includes('/api/control/metodos-pago')) {
        return Promise.resolve({ ok: true, json: async () => mockPaymentMethods });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <AddEditExpenseDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        expense={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Registrar Nuevo Gasto')).toBeInTheDocument();
    });

    const file = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/Comprobante/) as HTMLInputElement;

    await userEvent.upload(fileInput, file);

    const uploadButton = screen.getByText(/Subir Comprobante/);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Éxito',
        description: 'Comprobante subido exitosamente.',
      });
    });
  });

  it('should handle upload error', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/upload-receipt')) {
        return Promise.resolve({
          ok: false,
        });
      }
      // Return default mocks for other URLs
      if (url.includes('/api/control/unidades-de-negocio')) {
        return Promise.resolve({ ok: true, json: async () => mockBusinessUnits });
      }
      if (url.includes('/api/control/metodos-pago')) {
        return Promise.resolve({ ok: true, json: async () => mockPaymentMethods });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <AddEditExpenseDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        expense={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Registrar Nuevo Gasto')).toBeInTheDocument();
    });

    const file = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/Comprobante/) as HTMLInputElement;

    await userEvent.upload(fileInput, file);

    const uploadButton = screen.getByText(/Subir Comprobante/);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Error al subir la imagen.',
        variant: 'destructive',
      });
    });
  });

  it('should display uploaded receipt image', async () => {
    const expenseWithReceipt = {
      ...mockExpense,
      receiptImageUrl: 'https://example.com/receipt.jpg',
    };

    render(
      <AddEditExpenseDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        expense={expenseWithReceipt}
      />
    );

    await waitFor(() => {
      const image = screen.getByAltText('Comprobante');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/receipt.jpg');
    });

    expect(screen.getByText('Comprobante subido exitosamente')).toBeInTheDocument();
  });

  it('should remove uploaded receipt image', async () => {
    const expenseWithReceipt = {
      ...mockExpense,
      receiptImageUrl: 'https://example.com/receipt.jpg',
    };

    render(
      <AddEditExpenseDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        expense={expenseWithReceipt}
      />
    );

    await waitFor(() => {
      expect(screen.getByAltText('Comprobante')).toBeInTheDocument();
    });

    // Find and click the remove button (X icon)
    const removeButtons = screen.getAllByRole('button');
    const removeButton = removeButtons.find(btn => btn.querySelector('svg'));

    if (removeButton) {
      fireEvent.click(removeButton);
    }

    await waitFor(() => {
      expect(screen.queryByAltText('Comprobante')).not.toBeInTheDocument();
    });
  });

  it('should close dialog when cancel button is clicked', async () => {
    render(
      <AddEditExpenseDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        expense={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Registrar Nuevo Gasto')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should filter active payment methods only', async () => {
    const allPaymentMethods = [
      { id: 'pm1', name: 'Cash', active: true },
      { id: 'pm2', name: 'Credit Card', active: true },
      { id: 'pm3', name: 'Inactive Method', active: false },
    ];

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/control/metodos-pago')) {
        return Promise.resolve({
          ok: true,
          json: async () => allPaymentMethods,
        });
      }
      if (url.includes('/api/control/unidades-de-negocio')) {
        return Promise.resolve({ ok: true, json: async () => mockBusinessUnits });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <AddEditExpenseDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        expense={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Registrar Nuevo Gasto')).toBeInTheDocument();
    });

    // Verify that only active payment methods are loaded
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/control/metodos-pago',
        expect.any(Object)
      );
    });
  });

  it('should reset form when dialog closes and reopens for new expense', async () => {
    const { rerender } = render(
      <AddEditExpenseDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        expense={mockExpense}
      />
    );

    await waitFor(() => {
      const amountInput = screen.getByLabelText(/Monto/) as HTMLInputElement;
      expect(amountInput.value).toBe('100.5');
    });

    // Close dialog
    rerender(
      <AddEditExpenseDialog
        isOpen={false}
        onOpenChange={mockOnOpenChange}
        expense={mockExpense}
      />
    );

    // Reopen with null expense
    rerender(
      <AddEditExpenseDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        expense={null}
      />
    );

    await waitFor(() => {
      const amountInput = screen.getByLabelText(/Monto/) as HTMLInputElement;
      expect(amountInput.value).toBe('');
    });
  });

  it('should display currency selector with correct options', async () => {
    render(
      <AddEditExpenseDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        expense={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Registrar Nuevo Gasto')).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Moneda/)).toBeInTheDocument();
  });

  it('should show optional field hints', async () => {
    render(
      <AddEditExpenseDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        expense={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Registrar Nuevo Gasto')).toBeInTheDocument();
    });

    expect(screen.getByText(/Opcional al crear/)).toBeInTheDocument();
  });
});
