import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddEditSaleProductDialog } from './add-edit-sale-product-dialog';
import { useUser } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';

// Mocking dependencies
jest.mock('@/firebase/provider', () => ({
  useUser: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

global.fetch = jest.fn();

const mockUseUser = useUser as jest.Mock;
const mockUseToast = useToast as jest.Mock;
const mockFetch = global.fetch as jest.Mock;

// Mock data
const mockBusinessUnits = [{ id: 'bu1', name: 'Restaurante' }];
const mockDepartments = [{ id: 'dep1', name: 'Cocina' }];
const mockCategories = [{ id: 'cat1', name: 'Tacos' }];

describe('AddEditSaleProductDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({ user: { getIdToken: () => Promise.resolve('fake-token') } });
    mockUseToast.mockReturnValue({ toast: jest.fn() });
  });

  const renderDialog = (product: any = null) => {
    return render(
      <AddEditSaleProductDialog
        open={true}
        onOpenChange={jest.fn()}
        onSuccess={jest.fn()}
        product={product}
      />
    );
  };

  it('loads business units on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockBusinessUnits),
    });
    renderDialog();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/control/unidades-de-negocio', expect.any(Object));
    });
  });

  it('loads departments when a business unit is selected', async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockBusinessUnits) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockDepartments) });

    renderDialog();

    await user.click(screen.getByRole('combobox', { name: /Unidad de Negocio/i }));
    const options = await screen.findAllByText('Restaurante');
    await user.click(options[options.length - 1]); // Click on the option, not the hidden value

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/control/unidades-de-negocio/bu1/departamentos', expect.any(Object));
    });
  });

  it('loads categories when a department is selected', async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockBusinessUnits) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockDepartments) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockCategories) });

    renderDialog();

    await user.click(screen.getByRole('combobox', { name: /Unidad de Negocio/i }));
    const buOptions = await screen.findAllByText('Restaurante');
    await user.click(buOptions[buOptions.length - 1]);

    await waitFor(() => expect(screen.getByRole('combobox', { name: /Departamento/i })).not.toBeDisabled());
    await user.click(screen.getByRole('combobox', { name: /Departamento/i }));
    const depOptions = await screen.findAllByText('Cocina');
    await user.click(depOptions[depOptions.length - 1]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/control/departamentos/dep1/categorias-venta', expect.any(Object));
    });
  });

  it('submits the form with the correct IDs', async () => {
    const user = userEvent.setup();
    const toast = jest.fn();
    mockUseToast.mockReturnValue({ toast });

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockBusinessUnits) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockDepartments) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockCategories) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'new-prod-id' }) });

    renderDialog();

    // Fill form
    await user.click(screen.getByRole('combobox', { name: /Unidad de Negocio/i }));
    const buOptions = await screen.findAllByText('Restaurante');
    await user.click(buOptions[buOptions.length - 1]);

    await waitFor(() => expect(screen.getByRole('combobox', { name: /Departamento/i })).not.toBeDisabled());
    await user.click(screen.getByRole('combobox', { name: /Departamento/i }));
    const depOptions = await screen.findAllByText('Cocina');
    await user.click(depOptions[depOptions.length - 1]);

    await waitFor(() => expect(screen.getByRole('combobox', { name: /Categoría de Venta/i })).not.toBeDisabled());
    await user.click(screen.getByRole('combobox', { name: /Categoría de Venta/i }));
    const catOptions = await screen.findAllByText('Tacos');
    await user.click(catOptions[catOptions.length - 1]);

    await user.type(screen.getByLabelText(/Nombre del Producto/i), 'Taco de Test');
    await user.type(screen.getByLabelText(/Precio de Venta/i), '30');

    await user.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

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
    });
  });
});
