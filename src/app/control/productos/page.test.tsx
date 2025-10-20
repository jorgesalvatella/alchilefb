import { render, screen, fireEvent } from '@testing-library/react';
import { useCollection } from '@/firebase/firestore/use-collection';

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
  usePathname: jest.fn(() => '/control/productos'),
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

// Mock de componentes hijos y hooks
jest.mock('@/firebase/firestore/use-collection');
jest.mock('@/firebase/provider', () => ({
  useFirestore: jest.fn(),
  useMemoFirebase: jest.fn((callback) => callback()),
}));
jest.mock('@/components/control/add-edit-product-dialog', () => ({
  AddEditProductDialog: ({ isOpen, onOpenChange, product }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="add-edit-dialog">
        <h2>{product ? 'Edit Product' : 'Add Product'}</h2>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    );
  },
}));

const mockUseCollection = useCollection as jest.Mock;

let AdminProductsPage: any;

describe('AdminProductsPage', () => {
  beforeAll(() => {
    AdminProductsPage = require('./page').default;
  });

  beforeEach(() => {
    mockUseCollection.mockClear();
  });

  it('should render loading state initially', () => {
    mockUseCollection.mockReturnValue({ data: null, isLoading: true });
    render(<AdminProductsPage />);
    expect(screen.getByText('Cargando productos...')).toBeInTheDocument();
  });

  it('should render a table with products when data is loaded', () => {
    const mockMenuItems = [
      { id: '1', name: 'Taco de Pastor', category: 'Tacos', price: 25.00 },
      { id: '2', name: 'Agua de Horchata', category: 'Bebidas', price: 30.00 },
    ];
    mockUseCollection.mockReturnValue({ data: mockMenuItems, isLoading: false });

    render(<AdminProductsPage />);

    expect(screen.getByText('Taco de Pastor')).toBeInTheDocument();
    expect(screen.getByText('Agua de Horchata')).toBeInTheDocument();
    expect(screen.getByText('$25.00')).toBeInTheDocument();
    expect(screen.getByText('$30.00')).toBeInTheDocument();
  });

  it('should open the "Add Product" dialog when "Añadir Producto" button is clicked', () => {
    mockUseCollection.mockReturnValue({ data: [], isLoading: false });
    render(<AdminProductsPage />);

    // El diálogo no debe estar visible al inicio
    expect(screen.queryByTestId('add-edit-dialog')).not.toBeInTheDocument();

    // Click en el botón "Añadir Producto"
    const addButton = screen.getByRole('button', { name: /Añadir Producto/i });
    fireEvent.click(addButton);

    // El diálogo ahora debe estar visible
    const dialog = screen.getByTestId('add-edit-dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Add Product')).toBeInTheDocument();
  });

  it('should open the "Edit Product" dialog when an edit button is clicked', () => {
    const mockMenuItems = [
      { id: '1', name: 'Taco de Pastor', category: 'Tacos', price: 25.00 },
    ];
    mockUseCollection.mockReturnValue({ data: mockMenuItems, isLoading: false });
    render(<AdminProductsPage />);

    // El diálogo no debe estar visible al inicio
    expect(screen.queryByTestId('add-edit-dialog')).not.toBeInTheDocument();

    // Click en el botón de editar del producto '1'
    const editButton = screen.getByTestId('edit-button-1');
    fireEvent.click(editButton);

    // El diálogo ahora debe estar visible
    const dialog = screen.getByTestId('add-edit-dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Edit Product')).toBeInTheDocument();
  });
});
