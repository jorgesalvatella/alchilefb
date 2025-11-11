/**
 * @jest-environment jsdom
 */
import { initiateGoogleSignIn } from '../non-blocking-login';
import { Auth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Firestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  signInWithPopup: jest.fn(),
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({
    setCustomParameters: jest.fn(),
  })),
}));

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

describe('initiateGoogleSignIn', () => {
  let mockAuth: Auth;
  let mockFirestore: Firestore;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = {} as Auth;
    mockFirestore = {} as Firestore;
  });

  it('should create a new user profile when user does not exist', async () => {
    const mockUser = {
      uid: 'test-uid-123',
      email: 'test@gmail.com',
      displayName: 'John Doe',
      photoURL: 'https://example.com/photo.jpg',
    };

    const mockUserCredential = {
      user: mockUser,
    };

    (signInWithPopup as jest.Mock).mockResolvedValue(mockUserCredential);
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => false,
    });
    (doc as jest.Mock).mockReturnValue({ path: 'users/test-uid-123' });

    await initiateGoogleSignIn(mockAuth, mockFirestore);

    expect(signInWithPopup).toHaveBeenCalledWith(mockAuth, expect.any(Object));
    expect(getDoc).toHaveBeenCalled();
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: 'test-uid-123',
        email: 'test@gmail.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
        phoneNumber: '',
        photoURL: 'https://example.com/photo.jpg',
      })
    );
    expect(toast).toHaveBeenCalledWith({
      title: 'Cuenta creada',
      description: '¡Bienvenido a Al Chile! Por favor completa tu perfil.',
    });
  });

  it('should welcome back existing user', async () => {
    const mockUser = {
      uid: 'test-uid-456',
      email: 'existing@gmail.com',
      displayName: 'Jane Smith',
      photoURL: null,
    };

    const mockUserCredential = {
      user: mockUser,
    };

    (signInWithPopup as jest.Mock).mockResolvedValue(mockUserCredential);
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
    });

    await initiateGoogleSignIn(mockAuth, mockFirestore);

    expect(signInWithPopup).toHaveBeenCalled();
    expect(getDoc).toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({
      title: 'Bienvenido de vuelta',
      description: 'Has iniciado sesión con Google exitosamente.',
    });
  });

  it('should handle popup closed by user silently', async () => {
    const error = {
      code: 'auth/popup-closed-by-user',
    };

    (signInWithPopup as jest.Mock).mockRejectedValue(error);

    await initiateGoogleSignIn(mockAuth, mockFirestore);

    expect(toast).not.toHaveBeenCalled();
  });

  it('should handle account exists with different credential error', async () => {
    const error = {
      code: 'auth/account-exists-with-different-credential',
    };

    (signInWithPopup as jest.Mock).mockRejectedValue(error);

    await initiateGoogleSignIn(mockAuth, mockFirestore);

    expect(toast).toHaveBeenCalledWith({
      variant: 'destructive',
      title: 'Error al iniciar sesión con Google',
      description: 'Ya existe una cuenta con este correo usando otro método de inicio de sesión.',
    });
  });

  it('should handle popup blocked error', async () => {
    const error = {
      code: 'auth/popup-blocked',
    };

    (signInWithPopup as jest.Mock).mockRejectedValue(error);

    await initiateGoogleSignIn(mockAuth, mockFirestore);

    expect(toast).toHaveBeenCalledWith({
      variant: 'destructive',
      title: 'Error al iniciar sesión con Google',
      description: 'El navegador bloqueó la ventana emergente. Por favor, permite ventanas emergentes para este sitio.',
    });
  });

  it('should handle generic error', async () => {
    const error = {
      code: 'auth/unknown-error',
    };

    (signInWithPopup as jest.Mock).mockRejectedValue(error);

    await initiateGoogleSignIn(mockAuth, mockFirestore);

    expect(toast).toHaveBeenCalledWith({
      variant: 'destructive',
      title: 'Error al iniciar sesión con Google',
      description: 'No se pudo iniciar sesión con Google.',
    });
  });

  it('should split displayName correctly', async () => {
    const mockUser = {
      uid: 'test-uid-789',
      email: 'multi@gmail.com',
      displayName: 'Mary Jane Watson Parker',
      photoURL: null,
    };

    const mockUserCredential = {
      user: mockUser,
    };

    (signInWithPopup as jest.Mock).mockResolvedValue(mockUserCredential);
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => false,
    });

    await initiateGoogleSignIn(mockAuth, mockFirestore);

    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        firstName: 'Mary',
        lastName: 'Jane Watson Parker',
      })
    );
  });

  it('should handle user with no displayName', async () => {
    const mockUser = {
      uid: 'test-uid-999',
      email: 'nodisplay@gmail.com',
      displayName: null,
      photoURL: null,
    };

    const mockUserCredential = {
      user: mockUser,
    };

    (signInWithPopup as jest.Mock).mockResolvedValue(mockUserCredential);
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => false,
    });

    await initiateGoogleSignIn(mockAuth, mockFirestore);

    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        firstName: '',
        lastName: '',
      })
    );
  });
});
