import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './page';
import { useAuth } from '@/firebase/provider';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';

// Mocks
jest.mock('@/firebase/provider', () => ({
  useAuth: jest.fn(),
}));
jest.mock('@/firebase', () => ({
  useUser: jest.fn(),
}));
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@/firebase/non-blocking-login', () => ({
  initiateEmailSignIn: jest.fn(),
}));

const mockUseUser = useUser as jest.Mock;
const mockUseToast = useToast as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockInitiateEmailSignIn = initiateEmailSignIn as jest.Mock;
const mockToast = jest.fn();
const mockRouterPush = jest.fn();

describe('LoginPage', () => {
  beforeEach(() => {
    mockUseUser.mockReturnValue({ user: null, isUserLoading: false });
    mockUseToast.mockReturnValue({ toast: mockToast });
    mockUseRouter.mockReturnValue({ push: mockRouterPush });
    mockInitiateEmailSignIn.mockClear();
    mockToast.mockClear();
    mockRouterPush.mockClear();
  });

  it('should render the login form', () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText('Correo Electrónico')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar Sesión/i })).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    render(<LoginPage />);
    const submitButton = screen.getByRole('button', { name: /Iniciar Sesión/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockInitiateEmailSignIn).not.toHaveBeenCalled();
    });
  });

  it('should show validation error for invalid email', async () => {
    render(<LoginPage />);
    const emailInput = screen.getByPlaceholderText('Correo Electrónico');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    const submitButton = screen.getByRole('button', { name: /Iniciar Sesión/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockInitiateEmailSignIn).not.toHaveBeenCalled();
    });
  });

  it('should call initiateEmailSignIn and toast on valid submission', async () => {
    render(<LoginPage />);
    const emailInput = screen.getByPlaceholderText('Correo Electrónico');
    const passwordInput = screen.getByPlaceholderText('Contraseña');
    const submitButton = screen.getByRole('button', { name: /Iniciar Sesión/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockInitiateEmailSignIn).toHaveBeenCalledWith(undefined, 'test@example.com', 'password123');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Iniciando sesión...',
        description: 'Serás redirigido en un momento si tus credenciales son correctas.',
      });
    });
  });

  it('should redirect if user is already logged in', () => {
    mockUseUser.mockReturnValue({ user: { uid: 'test-user' }, isUserLoading: false });
    render(<LoginPage />);
    expect(mockRouterPush).toHaveBeenCalledWith('/');
  });

  it('should not redirect if user is loading', () => {
    mockUseUser.mockReturnValue({ user: null, isUserLoading: true });
    render(<LoginPage />);
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
