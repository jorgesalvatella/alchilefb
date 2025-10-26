import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import VerificarTelefonoPage from './page';

// Mock de dependencias
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@/firebase/provider', () => ({
  useUser: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

// Mock de componentes hijos
jest.mock('@/components/verification/VerificationCodeDisplay', () => {
  return function MockVerificationCodeDisplay({ code }: { code: string }) {
    return <div data-testid="code-display">{code}</div>;
  };
});

jest.mock('@/components/verification/VerificationCodeInput', () => {
  return function MockVerificationCodeInput({
    value,
    onChange,
    disabled
  }: {
    value: string;
    onChange: (code: string) => void;
    disabled?: boolean;
  }) {
    return (
      <input
        data-testid="code-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    );
  };
});

jest.mock('@/components/verification/VerificationTimer', () => {
  return function MockVerificationTimer({
    expiresAt,
    onExpire
  }: {
    expiresAt: Date;
    onExpire?: () => void;
  }) {
    return <div data-testid="timer">10:00</div>;
  };
});

describe('VerificarTelefonoPage', () => {
  const mockPush = jest.fn();
  const mockToast = jest.fn();
  const mockGetIdToken = jest.fn();
  const mockGetIdTokenResult = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn((key) => (key === 'returnTo' ? null : null)),
    });

    (useToast as jest.Mock).mockReturnValue({
      toast: mockToast,
    });

    mockGetIdToken.mockResolvedValue('mock-token');
    mockGetIdTokenResult.mockResolvedValue({ claims: {} });

    (useUser as jest.Mock).mockReturnValue({
      user: {
        uid: 'test-user-id',
        getIdToken: mockGetIdToken,
        getIdTokenResult: mockGetIdTokenResult,
      },
      isUserLoading: false,
    });

    // Mock global fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('genera código automáticamente al montar', async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        code: '123456',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }),
    });

    render(<VerificarTelefonoPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/verification/generate-code',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer mock-token',
          },
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('code-display')).toHaveTextContent('123456');
    });
  });

  it('verifica código correctamente y redirige', async () => {
    const mockFetch = global.fetch as jest.Mock;

    // Mock para generate-code
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        code: '123456',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }),
    });

    render(<VerificarTelefonoPage />);

    await waitFor(() => {
      expect(screen.getByTestId('code-display')).toHaveTextContent('123456');
    });

    // Ingresar código
    const input = screen.getByTestId('code-input');
    fireEvent.change(input, { target: { value: '123456' } });

    // Mock para verify-code
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
      }),
    });

    // Click en verificar
    const verifyButton = screen.getByRole('button', { name: /verificar código/i });
    fireEvent.click(verifyButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/verification/verify-code',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: '123456' }),
        })
      );
    });

    // Debe refrescar token (decisión 3B)
    await waitFor(() => {
      expect(mockGetIdTokenResult).toHaveBeenCalledWith(true);
    });

    // Debe redirigir
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/menu');
    });
  });

  it('maneja código incorrecto y muestra intentos restantes', async () => {
    const mockFetch = global.fetch as jest.Mock;

    // Mock para generate-code
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        code: '123456',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }),
    });

    render(<VerificarTelefonoPage />);

    await waitFor(() => {
      expect(screen.getByTestId('code-display')).toHaveTextContent('123456');
    });

    // Ingresar código incorrecto
    const input = screen.getByTestId('code-input');
    fireEvent.change(input, { target: { value: '999999' } });

    // Mock para verify-code con error
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        error: 'invalid_code',
        attemptsRemaining: 2,
      }),
    });

    // Click en verificar
    const verifyButton = screen.getByRole('button', { name: /verificar código/i });
    fireEvent.click(verifyButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Código incorrecto',
          description: 'Te quedan 2 intentos',
          variant: 'destructive',
        })
      );
    });

    // El input debe limpiarse
    await waitFor(() => {
      expect(input).toHaveValue('');
    });

    // Debe mostrar intentos restantes
    await waitFor(() => {
      expect(screen.getByText(/intentos restantes: 2\/3/i)).toBeInTheDocument();
    });
  });

  it('genera nuevo código cuando no quedan intentos', async () => {
    jest.useFakeTimers();
    const mockFetch = global.fetch as jest.Mock;

    // Mock para generate-code inicial
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        code: '123456',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }),
    });

    render(<VerificarTelefonoPage />);

    await waitFor(() => {
      expect(screen.getByTestId('code-display')).toHaveTextContent('123456');
    });

    // Ingresar código incorrecto
    const input = screen.getByTestId('code-input');
    fireEvent.change(input, { target: { value: '999999' } });

    // Mock para verify-code sin intentos restantes
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        error: 'max_attempts',
        attemptsRemaining: 0,
      }),
    });

    // Mock para nuevo generate-code
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        code: '789012',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }),
    });

    // Click en verificar
    const verifyButton = screen.getByRole('button', { name: /verificar código/i });
    fireEvent.click(verifyButton);

    // Avanzar timer para que se ejecute el setTimeout
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Código incorrecto',
          description: 'No quedan intentos. Genera un nuevo código.',
        })
      );
    });

    jest.advanceTimersByTime(2000);

    // Debe generar nuevo código automáticamente
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    jest.useRealTimers();
  });

  it('permite generar nuevo código manualmente', async () => {
    const mockFetch = global.fetch as jest.Mock;

    // Mock para generate-code inicial
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        code: '123456',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }),
    });

    render(<VerificarTelefonoPage />);

    await waitFor(() => {
      expect(screen.getByTestId('code-display')).toHaveTextContent('123456');
    });

    // Mock para nuevo generate-code
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        code: '789012',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }),
    });

    // Click en "Nuevo Código"
    const newCodeButton = screen.getByRole('button', { name: /nuevo código/i });
    fireEvent.click(newCodeButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.getByTestId('code-display')).toHaveTextContent('789012');
    });
  });

  it('muestra loading cuando el usuario está cargando', () => {
    (useUser as jest.Mock).mockReturnValue({
      user: null,
      isUserLoading: true,
    });

    render(<VerificarTelefonoPage />);

    expect(screen.getByText(/cargando\.\.\./i)).toBeInTheDocument();
  });

  it('redirige a /ingresar si no hay usuario autenticado', () => {
    (useUser as jest.Mock).mockReturnValue({
      user: null,
      isUserLoading: false,
    });

    render(<VerificarTelefonoPage />);

    expect(mockPush).toHaveBeenCalledWith('/ingresar');
  });

  it('respeta el parámetro returnTo al redirigir después de verificar', async () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn((key) => (key === 'returnTo' ? '/pago' : null)),
    });

    const mockFetch = global.fetch as jest.Mock;

    // Mock para generate-code
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        code: '123456',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }),
    });

    render(<VerificarTelefonoPage />);

    await waitFor(() => {
      expect(screen.getByTestId('code-display')).toHaveTextContent('123456');
    });

    // Ingresar código
    const input = screen.getByTestId('code-input');
    fireEvent.change(input, { target: { value: '123456' } });

    // Mock para verify-code
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
      }),
    });

    // Click en verificar
    const verifyButton = screen.getByRole('button', { name: /verificar código/i });
    fireEvent.click(verifyButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/pago');
    });
  });

  it('no permite verificar si el código no tiene 6 dígitos', async () => {
    const mockFetch = global.fetch as jest.Mock;

    // Mock para generate-code
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        code: '123456',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }),
    });

    render(<VerificarTelefonoPage />);

    await waitFor(() => {
      expect(screen.getByTestId('code-display')).toHaveTextContent('123456');
    });

    // Ingresar código incompleto
    const input = screen.getByTestId('code-input');
    fireEvent.change(input, { target: { value: '123' } });

    // El botón debe estar deshabilitado cuando el código no tiene 6 dígitos
    const verifyButton = screen.getByRole('button', { name: /verificar código/i });
    await waitFor(() => {
      expect(verifyButton).toBeDisabled();
    });

    // No debe llamar a verify-code
    expect(mockFetch).toHaveBeenCalledTimes(1); // Solo generate-code
  });
});
