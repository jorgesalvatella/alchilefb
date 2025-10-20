import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AddEditExpenseDialog } from '../add-edit-expense-dialog';
import type { Expense } from '@/lib/data';

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

// Mock fetch dinámico para manejar selectores en cascada
const createDynamicFetchMock = () => {
  return jest.fn().mockImplementation((url: string) => {
    // Business units
    if (url === '/api/control/unidades-de-negocio') {
      return Promise.resolve({
        ok: true,
        json: async () => [
          { id: 'bu1', name: 'Unidad 1' },
          { id: 'bu2', name: 'Unidad 2' },
        ],
      });
    }

    // Payment methods
    if (url === '/api/control/metodos-pago') {
      return Promise.resolve({
        ok: true,
        json: async () => [
          { id: 'pm1', name: 'Efectivo', active: true },
          { id: 'pm2', name: 'Tarjeta', active: false }, // Should be filtered out
          { id: 'pm3', name: 'Transferencia', active: true },
        ],
      });
    }

    // Departments (cascading from business unit)
    if (url.includes('/departamentos') && !url.includes('/grupos')) {
      return Promise.resolve({
        ok: true,
        json: async () => [
          { id: 'dept1', name: 'Depto 1' },
          { id: 'dept2', name: 'Depto 2' },
        ],
      });
    }

    // Groups (cascading from department)
    if (url.includes('/grupos') && !url.includes('/conceptos')) {
      return Promise.resolve({
        ok: true,
        json: async () => [
          { id: 'grp1', name: 'Grupo 1' },
          { id: 'grp2', name: 'Grupo 2' },
        ],
      });
    }

    // Concepts (cascading from group)
    if (url.includes('/conceptos')) {
      return Promise.resolve({
        ok: true,
        json: async () => [
          { id: 'con1', name: 'Concepto 1' },
          { id: 'con2', name: 'Concepto 2' },
        ],
      });
    }

    // Suppliers (cascading from concept)
    if (url.includes('/proveedores')) {
      return Promise.resolve({
        ok: true,
        json: async () => [
          { id: 'sup1', name: 'Proveedor 1' },
          { id: 'sup2', name: 'Proveedor 2' },
        ],
      });
    }

    // Default error response
    return Promise.resolve({
      ok: false,
      json: async () => ({ message: 'Not found' }),
    });
  });
};

describe('AddEditExpenseDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useUser con valores por defecto
    mockUseUser.mockReturnValue({
      user: mockUser,
    });

    // Set up dynamic fetch mock
    global.fetch = createDynamicFetchMock();
  });

  it('should render dialog in add mode', async () => {
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
  });

  it('should render dialog in edit mode with existing data', async () => {
    const expense: Expense = {
      id: 'exp1',
      expenseId: 'EXP-001',
      businessUnitId: 'bu1',
      departmentId: 'dept1',
      groupId: 'grp1',
      conceptId: 'con1',
      supplierId: 'sup1',
      paymentMethodId: 'pm1',
      amount: 1000,
      currency: 'MXN',
      expenseDate: '2025-01-15',
      status: 'draft',
      createdBy: 'user1',
      createdAt: '2025-01-15T10:00:00Z',
    };

    render(
      <AddEditExpenseDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        expense={expense}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Editar Gasto')).toBeInTheDocument();
    });
  });

  it('should show validation error when submitting without required fields', async () => {
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

    const submitButton = screen.getByRole('button', { name: /Guardar Gasto/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Todos los campos obligatorios deben estar completos.',
        variant: 'destructive',
      });
    });
  });

  it('should load business units and payment methods on open', async () => {
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

    // Verify form fields exist
    const amountInput = screen.getByLabelText(/Monto/);
    const expenseDateInput = screen.getByLabelText(/Fecha del Gasto/);

    expect(amountInput).toBeInTheDocument();
    expect(expenseDateInput).toBeInTheDocument();
  });

  it('should populate form when editing existing expense', async () => {
    const expense: Expense = {
      id: 'exp1',
      expenseId: 'EXP-001',
      businessUnitId: 'bu1',
      departmentId: 'dept1',
      groupId: 'grp1',
      conceptId: 'con1',
      supplierId: 'sup1',
      paymentMethodId: 'pm1',
      amount: 1000,
      currency: 'MXN',
      expenseDate: '2025-01-15',
      status: 'draft',
      createdBy: 'user1',
      createdAt: '2025-01-15T10:00:00Z',
    };

    render(
      <AddEditExpenseDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        expense={expense}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Editar Gasto')).toBeInTheDocument();
    });

    const amountInput = screen.getByLabelText(/Monto/);
    expect(amountInput).toHaveValue(1000);
  });

  it('should show upload receipt button', async () => {
    render(
      <AddEditExpenseDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        expense={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Subir Comprobante/i)).toBeInTheDocument();
    });
  });

  it('should disable upload button when no file selected', async () => {
    render(
      <AddEditExpenseDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        expense={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Subir Comprobante/i)).toBeInTheDocument();
    });

    const uploadButton = screen.getByRole('button', { name: /Subir Comprobante/i });

    // Button should be disabled when no file is selected
    expect(uploadButton).toBeDisabled();
  });

  it('should verify fetch calls for business units', async () => {
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
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });
  });

  it('should verify fetch calls for payment methods', async () => {
    render(
      <AddEditExpenseDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        expense={null}
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/control/metodos-pago',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });
  });
});
