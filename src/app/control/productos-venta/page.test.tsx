import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AdminSaleProductsPage from './page';
import { useUser } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';

// Mocks
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
const mockToast = jest.fn();

describe('AdminSaleProductsPage', () => {
  beforeEach(() => {
    mockUseUser.mockReturnValue({ user: { getIdToken: () => Promise.resolve('test-token') } });
    mockUseToast.mockReturnValue({ toast: mockToast });
    mockFetch.mockClear();
    mockToast.mockClear();
    window.confirm = jest.fn(() => true); // Mockear confirm para que siempre sea "sí"
  });

  it('should render loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Promesa que nunca se resuelve
    render(<AdminSaleProductsPage />);
    expect(screen.getAllByText('Cargando...').length).toBeGreaterThan(0);
  });

  it('should render error state if fetching fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network Error'));
    const { container } = render(<AdminSaleProductsPage />);
    const desktopView = container.querySelector('.hidden.md\\:block');
    const withinDesktop = within(desktopView as HTMLElement);
    expect(await withinDesktop.findByText('Error: Network Error')).toBeInTheDocument();
  });

  it('should render a table with products when data is loaded', async () => {
    const mockProducts = [
      { id: '1', name: 'Pizza', description: 'Delicious pizza', price: 150.00 },
      { id: '2', name: 'Burger', description: 'Juicy burger', price: 120.00 },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockProducts),
    });

    const { container } = render(<AdminSaleProductsPage />);
    const desktopView = container.querySelector('.hidden.md\\:block');
    const withinDesktop = within(desktopView as HTMLElement);

    expect(await withinDesktop.findByText('Pizza')).toBeInTheDocument();
    expect(await withinDesktop.findByText('Burger')).toBeInTheDocument();
    expect(await withinDesktop.findByText('$150.00')).toBeInTheDocument();
    expect(await withinDesktop.findByText('$120.00')).toBeInTheDocument();
  });

  it('should have a correct link for the "Añadir Producto" button', () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });
    render(<AdminSaleProductsPage />);
    const addButton = screen.getByRole('link', { name: /Añadir Producto/i });
    expect(addButton).toHaveAttribute('href', '/control/productos-venta/nuevo');
  });

  it('should have correct links for the edit buttons', async () => {
    const mockProducts = [
      { id: 'prod1', name: 'Pizza', description: 'Delicious pizza', price: 150.00 },
    ];
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockProducts) });
    const { container } = render(<AdminSaleProductsPage />);
    const desktopView = container.querySelector('.hidden.md\\:block');
    const withinDesktop = within(desktopView as HTMLElement);
    
    const editLink = await withinDesktop.findByRole('link', { name: /edit icon/i });
    expect(editLink).toHaveAttribute('href', '/control/productos-venta/prod1/editar');
  });

  it('should call the delete API when delete button is clicked and confirmed', async () => {
    const mockProducts = [
      { id: 'prod1', name: 'Pizza', description: 'Delicious pizza', price: 150.00 },
    ];
    mockFetch.mockResolvedValueOnce({ // Para la carga inicial
      ok: true,
      json: () => Promise.resolve(mockProducts),
    });

    const { container } = render(<AdminSaleProductsPage />);
    const desktopView = container.querySelector('.hidden.md\\:block');
    const withinDesktop = within(desktopView as HTMLElement);

    // Esperar a que los productos se carguen
    const deleteButton = await withinDesktop.findByTestId('delete-button-prod1');
    
    // Mock para la llamada DELETE
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    // Mock para el refetch después de borrar
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith('/api/control/productos-venta/prod1', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer test-token' },
      });
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Producto Eliminado',
        description: 'El producto se ha eliminado correctamente.',
      });
    });
  });
});
