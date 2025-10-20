import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useUser } from '@/firebase/provider';
import { useParams } from 'next/navigation';

// Mock de next/navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => '/control/catalogo/unidades-de-negocio/[id]/departamentos'),
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

// Mock de Firebase
jest.mock('@/firebase/provider', () => ({
  useUser: jest.fn(),
  useFirestore: jest.fn(() => null),
}));
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock de fetch
global.fetch = jest.fn();

const mockUseUser = useUser as jest.Mock;

let AdminDepartmentsPage: any;
const mockUseParams = useParams as jest.Mock;

describe('AdminDepartmentsPage', () => {
  beforeAll(() => {
    AdminDepartmentsPage = require('./page').default;
  });
  beforeEach(() => {
    jest.clearAllMocks();
    // Simulamos un usuario y un ID de unidad de negocio por defecto
    mockUseUser.mockReturnValue({
      user: {
        getIdToken: () => Promise.resolve('test-token'),
      },
      isUserLoading: false,
    });
    mockUseParams.mockReturnValue({
      id: 'test-business-unit-id',
    });
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  it('should display a loading message initially', () => {
    (fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {})); // Petición pendiente
    render(<AdminDepartmentsPage />);
    const loadingMessages = screen.getAllByText('Cargando departamentos...');
    expect(loadingMessages.length).toBeGreaterThan(0);
  });

  it('should display an error message if data fetching fails', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('No se pudo obtener los departamentos.'));
    render(<AdminDepartmentsPage />);

    await waitFor(() => {
      const errorMessages = screen.getAllByText(/Error: No se pudo obtener los departamentos\./);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it('should display the departments when data is fetched successfully', async () => {
    const mockData = [
      { id: '1', name: 'Cocina' },
      { id: '2', name: 'Barra' },
    ];
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(<AdminDepartmentsPage />);

    await waitFor(() => {
      const cocinaNames = screen.getAllByText('Cocina');
      const barraNames = screen.getAllByText('Barra');
      expect(cocinaNames.length).toBeGreaterThan(0);
      expect(barraNames.length).toBeGreaterThan(0);
    });
  });

  it('should call the correct nested API endpoint', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<AdminDepartmentsPage />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/control/unidades-de-negocio/test-business-unit-id/departamentos',
        expect.any(Object)
      );
    });
  });
});
