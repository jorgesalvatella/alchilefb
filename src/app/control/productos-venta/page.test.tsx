import { render, screen, waitFor } from '@testing-library/react';
import AdminSaleProductsPage from './page';
import { useUser } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';

// Mocking dependencies
jest.mock('@/firebase/provider', () => ({
  useUser: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

jest.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumbs: () => <nav>Breadcrumbs</nav>,
}));

global.fetch = jest.fn();

const mockUseUser = useUser as jest.Mock;
const mockUseToast = useToast as jest.Mock;
const mockFetch = global.fetch as jest.Mock;

describe('AdminSaleProductsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({ user: { getIdToken: () => Promise.resolve('fake-token') } });
    mockUseToast.mockReturnValue({ toast: jest.fn() });
  });

  it('renders the main title and the "Añadir Producto" link', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<AdminSaleProductsPage />);

    await waitFor(() => {
        expect(screen.getByText('Productos de Venta')).toBeInTheDocument();
        const addLink = screen.getByRole('link', { name: /Añadir Producto/i });
        expect(addLink).toBeInTheDocument();
        expect(addLink).toHaveAttribute('href', '/control/productos-venta/nuevo');
    });
  });

  it('fetches and displays a list of products with correct edit links', async () => {
    const mockProducts = [
      { id: '1', name: 'Taco de Suadero', description: 'Delicioso', price: 25.00 },
      { id: '2', name: 'Agua de Horchata', description: 'Refrescante', price: 15.00 },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockProducts),
    });

    render(<AdminSaleProductsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Taco de Suadero').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Agua de Horchata').length).toBeGreaterThan(0);
      
      // Check for the edit links
      const editLinks = screen.getAllByRole('link', { name: /edit icon/i }); // Assuming icons have accessible names
      expect(editLinks[0]).toHaveAttribute('href', '/control/productos-venta/1/editar');
      expect(editLinks[1]).toHaveAttribute('href', '/control/productos-venta/2/editar');
    });
  });
});