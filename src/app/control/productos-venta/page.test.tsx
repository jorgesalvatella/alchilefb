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
    await waitFor(() => {
      expect(screen.getByText('Añadir Producto')).toBeInTheDocument();
    });

    // Hacer clic en el botón específicamente (no en el texto del diálogo)
    const addButton = screen.getByRole('button', { name: /añadir producto/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // Verificar que ahora hay 2 instancias del texto (botón + título del diálogo)
      const addProductTexts = screen.getAllByText('Añadir Producto');
      expect(addProductTexts.length).toBeGreaterThan(1);
    });
  });
});
