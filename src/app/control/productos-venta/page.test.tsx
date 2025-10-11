import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminSaleProductsPage from './page';
import { useUser } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';

// Mocks
jest.mock('@/firebase/provider', () => ({
  useUser: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

const mockUseUser = useUser as jest.Mock;
const mockToast = useToast as jest.Mock;

// Mock de fetch
global.fetch = jest.fn();

const mockProducts = [
  { id: '1', name: 'Taco de Pastor', category: 'Tacos', price: 25, isAvailable: true, createdAt: new Date().toISOString() },
  { id: '2', name: 'Agua de Horchata', category: 'Bebidas', price: 20, isAvailable: false, createdAt: new Date().toISOString() },
];

describe('AdminSaleProductsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({
      user: {
        getIdToken: async () => 'test-token',
      },
      isUserLoading: false,
    });
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProducts),
    });
  });

  it('should render the main title and add button', async () => {
    render(<AdminSaleProductsPage />);
    await waitFor(() => {
      expect(screen.getByText('Gestión de Productos de Venta')).toBeInTheDocument();
      expect(screen.getByText('Añadir Producto')).toBeInTheDocument();
    });
  });

  it('should display a loading state initially', () => {
    // Hacemos que la promesa de fetch nunca se resuelva para este test
    (fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));
    render(<AdminSaleProductsPage />);
    expect(screen.getByText('Gestión de Productos de Venta')).toBeInTheDocument(); // El header se muestra
    // Buscamos por los Skeletons, una forma es buscar por el rol (si lo tuvieran) o por su estructura
    // En este caso, es más simple verificar que los datos aún no están
    expect(screen.queryByText('Taco de Pastor')).not.toBeInTheDocument();
  });

  it('should fetch and display products in the table', async () => {
    render(<AdminSaleProductsPage />);
    await waitFor(() => {
      expect(screen.getByText('Taco de Pastor')).toBeInTheDocument();
      expect(screen.getByText('Agua de Horchata')).toBeInTheDocument();
      expect(screen.getByText('$25.00')).toBeInTheDocument();
      expect(screen.getByText('Disponible')).toBeInTheDocument();
      expect(screen.getByText('No Disponible')).toBeInTheDocument();
    });
  });

  it('should display an error message if fetching fails', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('No se pudo obtener los productos de venta.'));
    render(<AdminSaleProductsPage />);
    await waitFor(() => {
      expect(screen.getByText('Error: No se pudo obtener los productos de venta.')).toBeInTheDocument();
    });
  });

  it('should open the dialog when "Añadir Producto" is clicked', async () => {
    render(<AdminSaleProductsPage />);

    // Usar getByRole para buscar específicamente el botón
    const addButton = await screen.findByRole('button', { name: /añadir producto/i });
    expect(addButton).toBeInTheDocument();

    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // Verificar que ahora hay 2 instancias del texto (botón + título del diálogo)
      const addProductTexts = screen.getAllByText('Añadir Producto');
      expect(addProductTexts.length).toBeGreaterThan(1);
    });
  });

  it('should show profitability calculations in the dialog', async () => {
    render(<AdminSaleProductsPage />);

    const addButton = await screen.findByRole('button', { name: /añadir producto/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Análisis de Rentabilidad')).toBeInTheDocument();
    });

    // Simular entrada del usuario
    const priceInput = screen.getByLabelText('Precio de Venta (IVA Incl.)');
    const costInput = screen.getByLabelText('Costo del Producto');
    const feeInput = screen.getByLabelText('Comisión de Plataforma (%)');

    fireEvent.change(priceInput, { target: { value: '100' } });
    fireEvent.change(costInput, { target: { value: '30' } });
    fireEvent.change(feeInput, { target: { value: '20' } });

    // Verificar que los campos tienen los valores correctos
    await waitFor(() => {
      expect(priceInput).toHaveValue(100);
      expect(costInput).toHaveValue(30);
      expect(feeInput).toHaveValue(20);
    });

    // Verificar que la sección de Análisis de Rentabilidad está visible
    expect(screen.getByText('Análisis de Rentabilidad')).toBeInTheDocument();
    expect(screen.getByText('Precio Base (Subtotal):')).toBeInTheDocument();
    expect(screen.getByText('IVA (16%):')).toBeInTheDocument();
    expect(screen.getByText('Utilidad Bruta:')).toBeInTheDocument();
  });

  it('should submit the new fields when creating a product', async () => {
    render(<AdminSaleProductsPage />);

    const addButton = await screen.findByRole('button', { name: /añadir producto/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Llenar el formulario
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Test Product' } });
    fireEvent.change(screen.getByLabelText('Precio de Venta (IVA Incl.)'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Costo del Producto'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Comisión de Plataforma (%)'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: 'Test Category' } });
    
    // Simular clic en el switch de IVA (si es necesario cambiarlo)
    // fireEvent.click(screen.getByLabelText('¿Lleva IVA?'));

    fireEvent.click(screen.getByText('Guardar Cambios'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/control/productos-venta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          name: 'Test Product',
          price: 100,
          category: 'Test Category',
          description: '',
          imageUrl: '',
          isAvailable: true,
          isTaxable: true,
          cost: 30,
          platformFeePercent: 20,
        }),
      });
    });
  });
});
