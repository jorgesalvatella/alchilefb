import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignupPage from './page';
import { useAuth, useFirestore } from '@/firebase/provider';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { initiateEmailSignUp } from '@/firebase/non-blocking-login';

// Mocks
jest.mock('@/firebase/provider', () => ({
  useAuth: jest.fn(),
  useFirestore: jest.fn(),
  useUser: jest.fn(),
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
  initiateEmailSignUp: jest.fn(),
}));

const mockUseUser = useUser as jest.Mock;
const mockUseToast = useToast as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockInitiateEmailSignUp = initiateEmailSignUp as jest.Mock;
const mockToast = jest.fn();
const mockRouterPush = jest.fn();

describe('SignupPage', () => {
  beforeEach(() => {
    mockUseUser.mockReturnValue({ user: null, isUserLoading: false });
    mockUseToast.mockReturnValue({ toast: mockToast });
    mockUseRouter.mockReturnValue({ push: mockRouterPush });
    mockInitiateEmailSignUp.mockClear();
    mockToast.mockClear();
    mockRouterPush.mockClear();
  });

  it('should render the signup form', () => {
    render(<SignupPage />);
    expect(screen.getByPlaceholderText('Nombre Completo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Correo Electrónico')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Crear Cuenta/i })).toBeInTheDocument();
  });

  it('should not submit with invalid data', async () => {
    render(<SignupPage />);
    const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i });
    
    // Empty form
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(mockInitiateEmailSignUp).not.toHaveBeenCalled();
    });

    // Invalid email
    const emailInput = screen.getByPlaceholderText('Correo Electrónico');
    fireEvent.change(emailInput, { target: { value: 'invalid' } });
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(mockInitiateEmailSignUp).not.toHaveBeenCalled();
    });

    // Short password
    const passwordInput = screen.getByPlaceholderText('Contraseña');
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(mockInitiateEmailSignUp).not.toHaveBeenCalled();
    });
  });

  it('should call initiateEmailSignUp and toast on valid submission', async () => {
    render(<SignupPage />);
    const nameInput = screen.getByPlaceholderText('Nombre Completo');
    const emailInput = screen.getByPlaceholderText('Correo Electrónico');
    const passwordInput = screen.getByPlaceholderText('Contraseña');
    const phoneInput = screen.getByPlaceholderText('998 123 4567');
    const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i });

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(phoneInput, { target: { value: '9981234567' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockInitiateEmailSignUp).toHaveBeenCalledWith(
        undefined, // auth
        undefined, // firestore
        'john@test.com',
        'password123',
        {
          email: 'john@test.com',
          firstName: 'John',
          lastName: 'Doe',
          phoneNumber: '9981234567',
          role: 'customer',
        }
      );
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Cuenta creada',
        description: '¡Bienvenido a Al Chile! Tu cuenta ha sido creada exitosamente.',
      });
    });
  });

  it('should redirect if user is already logged in', async () => {
    mockUseUser.mockReturnValue({ user: { uid: 'test-user' }, isUserLoading: false });
    render(<SignupPage />);
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/');
    }, { timeout: 3000 });
  });
});
