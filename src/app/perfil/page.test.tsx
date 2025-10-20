import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { getAuth, signOut } from 'firebase/auth';

// Mock withAuth to return the component directly with a mock user
jest.mock('@/firebase/withAuth', () => ({
  withAuth: (Component: any) => {
    return function MockedComponent(props: any) {
      const mockUser = {
        uid: 'test-user-123',
        email: 'test@test.com',
        getIdToken: jest.fn(() => Promise.resolve('test-token')),
      };
      const mockClaims = {};
      return <Component {...props} user={mockUser} claims={mockClaims} />;
    };
  },
}));

// Import ProfilePage AFTER mocking withAuth
let ProfilePage: any;

// Mocks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  signOut: jest.fn(),
}));

global.fetch = jest.fn();
const mockUseRouter = useRouter as jest.Mock;
const mockFetch = global.fetch as jest.Mock;
const mockSignOut = signOut as jest.Mock;
const mockRouterPush = jest.fn();

describe('ProfilePage', () => {
  beforeAll(() => {
    // Import ProfilePage after all mocks are set up
    ProfilePage = require('./page').default;
  });

  beforeEach(() => {
    mockUseRouter.mockReturnValue({ push: mockRouterPush });
    mockFetch.mockClear();
    mockRouterPush.mockClear();
    mockSignOut.mockClear();
    window.alert = jest.fn(); // Mock alert
  });

  // These tests are not applicable anymore because withAuth handles authentication
  // The component always receives a user prop from withAuth
  it.skip('should redirect to login if user is not authenticated', () => {
    // withAuth handles this at a higher level
  });

  it.skip('should render loading skeletons when user is loading', () => {
    // withAuth handles loading state
  });

  it('should fetch and display user profile data', async () => {
    const mockProfile = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      phoneNumber: '123456789',
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockProfile),
    });

    render(<ProfilePage />);

    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(await screen.findByText('john@test.com')).toBeInTheDocument();
    expect(await screen.findByText('123456789')).toBeInTheDocument();
  });

  it('should enter edit mode, update profile, and exit edit mode', async () => {
    const mockProfile = { firstName: 'John', lastName: 'Doe', phoneNumber: '123456789' };
    mockFetch.mockResolvedValue({ // Mock for both initial fetch and update
      ok: true,
      json: () => Promise.resolve(mockProfile),
    });

    render(<ProfilePage />);
    
    // Wait for initial data to load
    await screen.findByText('John Doe');

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /Editar Perfil/i });
    fireEvent.click(editButton);

    // Verify edit fields are visible
    const firstNameInput = screen.getByLabelText(/Nombre/i);
    expect(firstNameInput).toBeInTheDocument();
    
    // Change a value
    fireEvent.change(firstNameInput, { target: { value: 'Jane' } });

    // Save changes
    const saveButton = screen.getByRole('button', { name: /Guardar Cambios/i });
    fireEvent.click(saveButton);

    // Verify API call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/me/profile', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ firstName: 'Jane', lastName: 'Doe', phoneNumber: '123456789' }),
      }));
    });

    // Verify it exits edit mode (edit button is visible again)
    expect(await screen.findByRole('button', { name: /Editar Perfil/i })).toBeInTheDocument();
  });

  it('should call signOut when "Cerrar Sesión" is clicked', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    render(<ProfilePage />);

    const signOutButton = await screen.findByRole('button', { name: /Cerrar Sesión/i });
    fireEvent.click(signOutButton);

    expect(mockSignOut).toHaveBeenCalled();
  });
});
