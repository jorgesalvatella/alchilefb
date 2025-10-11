import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaleProductForm } from './sale-product-form';
import { useUser } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

// Mocking dependencies
jest.mock('@/firebase/provider', () => ({ useUser: jest.fn() }));
jest.mock('@/hooks/use-toast', () => ({ useToast: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));

global.fetch = jest.fn();

const mockUseUser = useUser as jest.Mock;
const mockUseToast = useToast as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockFetch = global.fetch as jest.Mock;

// Mock data
const mockBusinessUnits = [{ id: 'bu1', name: 'Restaurante' }];
const mockDepartments = [{ id: 'dep1', name: 'Cocina' }];
const mockCategories = [{ id: 'cat1', name: 'Tacos' }];

describe('SaleProductForm', () => {
  let mockRouterPush: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({ user: { getIdToken: () => Promise.resolve('fake-token') } });
    mockUseToast.mockReturnValue({ toast: jest.fn() });
    mockRouterPush = jest.fn();
    mockUseRouter.mockReturnValue({ push: mockRouterPush, refresh: jest.fn() });
  });

  const renderForm = (product: any = null) => {
    render(<SaleProductForm product={product} />);
  };

  it('loads and selects hierarchical options correctly and submits the form', async () => {
    const user = userEvent.setup();
    const toast = jest.fn();
    mockUseToast.mockReturnValue({ toast });

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockBusinessUnits) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockDepartments) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockCategories) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'new-prod-id' }) });

    renderForm();

    // 1. Select Business Unit
    await user.click(screen.getByRole('combobox', { name: /Unidad de Negocio/i }));
    const buOption = await screen.findByRole('option', { name: 'Restaurante' });
    await user.click(buOption);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/control/unidades-de-negocio/bu1/departamentos', expect.any(Object));
    });

    // 2. Wait for and select Department
    await waitFor(() => expect(screen.getByRole('combobox', { name: /Departamento/i })).not.toBeDisabled());
    await user.click(screen.getByRole('combobox', { name: /Departamento/i }));
    const depOption = await screen.findByRole('option', { name: 'Cocina' });
    await user.click(depOption);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/control/departamentos/dep1/categorias-venta', expect.any(Object));
    });

    // 3. Wait for and select Category
    await waitFor(() => expect(screen.getByRole('combobox', { name: /Categoría de Venta/i })).not.toBeDisabled());
    await user.click(screen.getByRole('combobox', { name: /Categoría de Venta/i }));
    const catOption = await screen.findByRole('option', { name: 'Tacos' });
    await user.click(catOption);

    // 4. Fill other fields
    await user.type(screen.getByLabelText(/Nombre del Producto/i), 'Taco de Test');
    await user.type(screen.getByLabelText(/Precio de Venta/i), '30');

    // 5. Submit
    await user.click(screen.getByRole('button', { name: /Crear Producto/i }));

    // 6. Verify submission
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/control/productos-venta', expect.any(Object));
      const submittedData = JSON.parse(mockFetch.mock.calls.find(call => call[0] === '/api/control/productos-venta')[1].body);
      expect(submittedData).toMatchObject({
        name: 'Taco de Test',
        price: 30,
        businessUnitId: 'bu1',
        departmentId: 'dep1',
        categoriaVentaId: 'cat1',
      });
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: '¡Éxito!' }));
      expect(mockRouterPush).toHaveBeenCalledWith('/control/productos-venta');
    });
  });
});