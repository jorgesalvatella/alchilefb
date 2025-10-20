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
  usePathname: jest.fn(() => '/control/catalogo/unidades-de-negocio/[id]/departamentos/[depId]/grupos'),
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
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock de fetch
global.fetch = jest.fn();

const mockUseUser = useUser as jest.Mock;
const mockUseParams = jest.requireMock('next/navigation').useParams;

let AdminGroupsPage: any;

describe('AdminGroupsPage', () => {
  beforeAll(() => {
    AdminGroupsPage = require('./page').default;
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({
      user: {
        getIdToken: async () => 'test-token',
      },
      isUserLoading: false,
    });
    mockUseParams.mockReturnValue({
      id: 'test-unit-id',
      depId: 'test-dep-id',
    });
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  it('should display a loading message initially', () => {
    (fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));
    render(<AdminGroupsPage />);
    const loadingMessages = screen.getAllByText('Cargando grupos...');
    expect(loadingMessages.length).toBeGreaterThan(0);
  });

  it('should display an error message if data fetching fails', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('No se pudo obtener los grupos.'));
    render(<AdminGroupsPage />);
    await waitFor(() => {
      const errorMessages = screen.getAllByText(/Error: No se pudo obtener los grupos\./);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it('should display the groups when data is fetched successfully', async () => {
    const mockData = [{ id: '1', name: 'Bebidas' }];
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });
    render(<AdminGroupsPage />);
    await waitFor(() => {
      const groupNames = screen.getAllByText('Bebidas');
      expect(groupNames.length).toBeGreaterThan(0);
    });
  });

  it('should call the correct nested API endpoint', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });
    render(<AdminGroupsPage />);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/control/unidades-de-negocio/test-unit-id/departamentos/test-dep-id/grupos',
        expect.any(Object)
      );
    });
  });
});
