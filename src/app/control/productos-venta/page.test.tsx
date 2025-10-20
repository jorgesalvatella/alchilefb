import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { useUser } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';

// Mock de next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => '/control/productos-venta'),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
}));

// Mock de withAuth
jest.mock('@/firebase/withAuth', () => ({
  withAuth: (Component: any) => {
    return function MockedComponent(props: any) {
      const mockUser = {
        uid: 'test-admin-123',
        email: 'admin@test.com',
        getIdToken: jest.fn(() => Promise.resolve('test-token')),
      };
      const mockClaims = { admin: true };
      return <Component {...props} user={mockUser} claims={mockClaims} />;
    };
  },
}));

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

let AdminSaleProductsPage: any;

describe('AdminSaleProductsPage', () => {
  beforeAll(() => {
    AdminSaleProductsPage = require('./page').default;
  });
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

  it('should call the feature toggle API when the switch is clicked', async () => {
    const mockProducts = [
      { id: 'prod1', name: 'Pizza', description: 'Delicious pizza', price: 150.00, isFeatured: false },
    ];
    mockFetch.mockResolvedValueOnce({ // Initial load
      ok: true,
      json: () => Promise.resolve(mockProducts),
    });

    const { container } = render(<AdminSaleProductsPage />);
    const desktopView = container.querySelector('.hidden.md\\:block');
    const withinDesktop = within(desktopView as HTMLElement);

    const featureSwitch = await withinDesktop.findByRole('switch');
    expect(featureSwitch).not.toBeChecked();

    // Mock for the PUT call to toggle feature
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    fireEvent.click(featureSwitch);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/control/productos-venta/prod1/toggle-featured', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isFeatured: true }),
      });
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Producto Actualizado',
        description: 'El producto ahora es destacado.',
      });
    });

    // Check if the switch is now checked in the UI (optimistic update)
    expect(featureSwitch).toBeChecked();
  });
});
