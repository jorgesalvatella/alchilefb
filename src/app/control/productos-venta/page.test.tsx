import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  Breadcrumbs: () => <nav aria-label="breadcrumb">Breadcrumbs</nav>,
}));

// Mock the dialog component as it will be tested separately
jest.mock('@/components/control/add-edit-sale-product-dialog', () => ({
  AddEditSaleProductDialog: ({ open }: { open: boolean }) => 
    open ? <div role="dialog">Dialog is open</div> : null,
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

  it('renders the main title and add button', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<AdminSaleProductsPage />);

    await waitFor(() => {
      expect(screen.getByText('Productos de Venta')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Añadir Producto/i })).toBeInTheDocument();
    });
  });

  it('displays a loading state initially in both views', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<AdminSaleProductsPage />);
    
    // Use `getAllByText` to confirm it appears in both mobile and desktop views initially
    const loadingMessages = await screen.findAllByText(/Cargando.../i);
    expect(loadingMessages).toHaveLength(2);
  });

  it('displays an error message if fetching products fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: 'Failed to fetch' }),
    });

    render(<AdminSaleProductsPage />);

    await waitFor(() => {
      // We expect to find the error message in both mobile and desktop views
      const errorMessages = screen.getAllByText(/Error: No se pudo obtener la lista de productos./i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it('fetches and displays a list of products in both views', async () => {
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
      // Check that both names appear (could be in either view)
      expect(screen.getAllByText('Taco de Suadero').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Agua de Horchata').length).toBeGreaterThan(0);
      expect(screen.getAllByText('$25.00').length).toBeGreaterThan(0);
    });
  });

  it('opens the dialog when "Añadir Producto" button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });
    const user = userEvent.setup();

    render(<AdminSaleProductsPage />);

    // Wait for loading to finish before clicking
    await waitFor(() => {
      expect(screen.queryByText(/Cargando.../i)).not.toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /Añadir Producto/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toHaveTextContent('Dialog is open');
    });
  });
});