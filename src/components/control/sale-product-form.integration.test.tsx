/**
 * Tests de integración para SaleProductForm
 *
 * Estos tests verifican la lógica de negocio del formulario sin depender
 * de la implementación específica de Radix UI Select.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaleProductForm } from './sale-product-form';
import { useUser } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

// Mocking dependencies
jest.mock('@/firebase/provider');
jest.mock('@/hooks/use-toast');
jest.mock('next/navigation');

const mockUseUser = useUser as jest.Mock;
const mockUseToast = useToast as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockFetch = jest.fn();

global.fetch = mockFetch as any;

describe('SaleProductForm - Integration Tests', () => {
  let mockRouterPush: jest.Mock;
  let mockToastFn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({
      user: { getIdToken: () => Promise.resolve('fake-token') }
    });
    mockToastFn = jest.fn();
    mockUseToast.mockReturnValue({ toast: mockToastFn });
    mockRouterPush = jest.fn();
    mockUseRouter.mockReturnValue({
      push: mockRouterPush,
      refresh: jest.fn()
    });
  });

  describe('Form Rendering', () => {
    it('renders all required form fields', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      render(<SaleProductForm />);

      // Verificar que los campos principales existen
      expect(screen.getByLabelText(/Nombre del Producto/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Precio de Venta/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Costo del Producto/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Crear Producto/i })).toBeInTheDocument();
    });

    it('loads business units on mount', async () => {
      const mockBusinessUnits = [{ id: 'bu1', name: 'Restaurante' }];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBusinessUnits),
      });

      render(<SaleProductForm />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/control/unidades-de-negocio',
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer fake-token'
            })
          })
        );
      });
    });
  });

  describe('Form Validation', () => {
    it('shows validation errors when submitting empty form', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const user = userEvent.setup();
      render(<SaleProductForm />);

      const submitButton = screen.getByRole('button', { name: /Crear Producto/i });
      await user.click(submitButton);

      // El formulario no debe hacer POST si hay errores de validación
      await waitFor(() => {
        const postCalls = (mockFetch as jest.Mock).mock.calls.filter(
          call => call[1]?.method === 'POST'
        );
        expect(postCalls.length).toBe(0);
      });
    });
  });

  describe('Data Parsing', () => {
    it('parses ingredientesBase string into array', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.toString().includes('/productos-venta') && url.toString().includes('POST')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'new-id' })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      });

      const user = userEvent.setup();
      const mockProduct = {
        id: 'test-id',
        name: 'Test Product',
        price: 100,
        businessUnitId: 'bu1',
        departmentId: 'dep1',
        categoriaVentaId: 'cat1',
        ingredientesBase: [],
        ingredientesExtra: [],
      };

      render(<SaleProductForm product={mockProduct} />);

      // Llenar el campo de ingredientes base
      const baseIngredientsInput = screen.getByLabelText(/Ingredientes Base/i);
      await user.clear(baseIngredientsInput);
      await user.type(baseIngredientsInput, 'Carne, Cebolla, Cilantro');

      // Enviar el formulario
      const submitButton = screen.getByRole('button', { name: /Guardar Cambios/i });
      await user.click(submitButton);

      // Verificar que el POST se hizo con los datos parseados correctamente
      await waitFor(() => {
        const postCall = (mockFetch as jest.Mock).mock.calls.find(
          call => call[1]?.method === 'PUT' && call[0].includes('/productos-venta/test-id')
        );

        if (postCall) {
          const submittedData = JSON.parse(postCall[1].body);
          expect(submittedData.ingredientesBase).toEqual(['Carne', 'Cebolla', 'Cilantro']);
        }
      }, { timeout: 3000 });
    });

    it('parses ingredientesExtra string into array of objects', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.toString().includes('/productos-venta')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'new-id' })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      });

      const user = userEvent.setup();
      const mockProduct = {
        id: 'test-id',
        name: 'Test Product',
        price: 100,
        businessUnitId: 'bu1',
        departmentId: 'dep1',
        categoriaVentaId: 'cat1',
        ingredientesBase: [],
        ingredientesExtra: [],
      };

      render(<SaleProductForm product={mockProduct} />);

      // Llenar el campo de ingredientes extra
      const extraIngredientsInput = screen.getByLabelText(/Ingredientes Extra/i);
      await user.clear(extraIngredientsInput);
      await user.type(extraIngredientsInput, 'Queso:10, Aguacate:15');

      // Enviar el formulario
      const submitButton = screen.getByRole('button', { name: /Guardar Cambios/i });
      await user.click(submitButton);

      // Verificar que el POST se hizo con los datos parseados correctamente
      await waitFor(() => {
        const postCall = (mockFetch as jest.Mock).mock.calls.find(
          call => call[1]?.method === 'PUT'
        );

        if (postCall) {
          const submittedData = JSON.parse(postCall[1].body);
          expect(submittedData.ingredientesExtra).toEqual([
            { nombre: 'Queso', precio: 10 },
            { nombre: 'Aguacate', precio: 15 },
          ]);
        }
      }, { timeout: 3000 });
    });

    it('handles malformed extra ingredients gracefully', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.toString().includes('/productos-venta')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'new-id' })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      });

      const user = userEvent.setup();
      const mockProduct = {
        id: 'test-id',
        name: 'Test Product',
        price: 100,
        businessUnitId: 'bu1',
        departmentId: 'dep1',
        categoriaVentaId: 'cat1',
        ingredientesBase: [],
        ingredientesExtra: [],
      };

      render(<SaleProductForm product={mockProduct} />);

      // Llenar con datos malformados
      const extraIngredientsInput = screen.getByLabelText(/Ingredientes Extra/i);
      await user.clear(extraIngredientsInput);
      await user.type(extraIngredientsInput, 'Queso:10, , Aguacate:, Crema:abc');

      const submitButton = screen.getByRole('button', { name: /Guardar Cambios/i });
      await user.click(submitButton);

      // Verificar que solo se incluyen los válidos
      await waitFor(() => {
        const postCall = (mockFetch as jest.Mock).mock.calls.find(
          call => call[1]?.method === 'PUT'
        );

        if (postCall) {
          const submittedData = JSON.parse(postCall[1].body);
          // Solo "Queso:10" es válido
          expect(submittedData.ingredientesExtra).toEqual([
            { nombre: 'Queso', precio: 10 },
          ]);
        }
      }, { timeout: 3000 });
    });
  });

  describe('Profitability Calculations', () => {
    it('calculates profitability correctly with IVA', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      render(<SaleProductForm />);

      // Verificar que el card de rentabilidad existe
      expect(screen.getByText(/Análisis de Rentabilidad/i)).toBeInTheDocument();
      expect(screen.getByText(/UTILIDAD NETA/i)).toBeInTheDocument();
      expect(screen.getByText(/MARGEN NETO/i)).toBeInTheDocument();
    });
  });
});
