import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ForgotPasswordPage from './page';
import { useAuth } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { sendPasswordResetEmail } from 'firebase/auth';

// Mocks
jest.mock('@/firebase/provider', () => ({
  useAuth: jest.fn(),
}));
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));
jest.mock('firebase/auth', () => ({
  sendPasswordResetEmail: jest.fn(),
}));

const mockUseToast = useToast as jest.Mock;
const mockSendPasswordResetEmail = sendPasswordResetEmail as jest.Mock;
const mockToast = jest.fn();

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    mockUseToast.mockReturnValue({ toast: mockToast });
    mockSendPasswordResetEmail.mockClear();
    mockToast.mockClear();
  });

  it('should render the form correctly', () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByPlaceholderText('Correo Electrónico')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enviar Instrucciones/i })).toBeInTheDocument();
  });

  it('should not call sendPasswordResetEmail with an invalid email', async () => {
    render(<ForgotPasswordPage />);
    const emailInput = screen.getByPlaceholderText('Correo Electrónico');
    const submitButton = screen.getByRole('button', { name: /Enviar Instrucciones/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  it('should call sendPasswordResetEmail and show success message on valid submission', async () => {
    mockSendPasswordResetEmail.mockResolvedValue(undefined);
    render(<ForgotPasswordPage />);
    const emailInput = screen.getByPlaceholderText('Correo Electrónico');
    const submitButton = screen.getByRole('button', { name: /Enviar Instrucciones/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(undefined, 'test@example.com');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Correo enviado',
        description: 'Se han enviado las instrucciones para restablecer tu contraseña a tu correo electrónico.',
      });
    });

    // Verificar que se muestra el mensaje de confirmación
    expect(await screen.findByText(/Se han enviado las instrucciones/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver a Iniciar Sesión/i })).toBeInTheDocument();
  });

  it('should show an error toast if sendPasswordResetEmail fails', async () => {
    mockSendPasswordResetEmail.mockRejectedValue(new Error('Firebase error'));
    render(<ForgotPasswordPage />);
    const emailInput = screen.getByPlaceholderText('Correo Electrónico');
    const submitButton = screen.getByRole('button', { name: /Enviar Instrucciones/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error al enviar el correo',
        description: 'Hubo un problema al enviar el correo de restablecimiento. Por favor, verifica el correo e inténtalo de nuevo.',
        variant: 'destructive',
      });
    });
  });
});
