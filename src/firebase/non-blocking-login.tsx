'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  UserCredential,
} from 'firebase/auth';
import { doc, Firestore, setDoc, getDoc } from 'firebase/firestore';
import { UserProfile } from '@/lib/data';
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError } from './errors';
import { toast } from '@/hooks/use-toast';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance).catch(error => {
     toast({
      variant: 'destructive',
      title: 'Error de autenticación',
      description: 'No se pudo iniciar sesión anónimamente.',
    });
    console.error("Anonymous sign-in error:", error);
  });
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(
  authInstance: Auth,
  firestoreInstance: Firestore,
  email: string,
  password: string,
  profileData: Omit<UserProfile, 'id'>
): void {
  createUserWithEmailAndPassword(authInstance, email, password)
    .then(async (userCredential: UserCredential) => {
      // User created, now create their profile document
      const user = userCredential.user;

      // Si se proporcionó phoneNumber, actualizar Firebase Auth
      if (profileData.phoneNumber) {
        try {
          // Formatear a E.164 (+52XXXXXXXXXX)
          const formattedPhone = `+52${profileData.phoneNumber.replace(/\D/g, '')}`;

          // Actualizar el usuario en Firebase Auth con el phoneNumber
          // Nota: updateProfile no soporta phoneNumber, necesitamos llamar al backend
          // Por ahora, solo lo guardamos en Firestore y el admin puede actualizarlo
          // En el futuro, se puede hacer una llamada al backend para actualizar Auth
        } catch (error) {
          console.error("Error updating phone in Auth:", error);
        }
      }

      const userProfileRef = doc(firestoreInstance, 'users', user.uid);
      const dataToSet = {
        ...profileData,
        id: user.uid,
        phoneNumber: profileData.phoneNumber ? `+52${profileData.phoneNumber.replace(/\D/g, '')}` : '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false,
      };

      // Set the document, but don't block the UI thread
      setDoc(userProfileRef, dataToSet)
        .catch(error => {
          const permissionError = new FirestorePermissionError({
            path: userProfileRef.path,
            operation: 'create',
            requestResourceData: dataToSet,
          });
          errorEmitter.emit('permission-error', permissionError);
          console.error("Error creating user profile:", permissionError);
           toast({
            variant: 'destructive',
            title: 'Error de perfil',
            description: 'No se pudo crear tu perfil de usuario.',
          });
        });
    })
    .catch(error => {
       let description = 'Ocurrió un error inesperado.';
        if (error.code === 'auth/email-already-in-use') {
            description = 'Este correo electrónico ya está en uso. Intenta iniciar sesión.';
        }
        toast({
            variant: 'destructive',
            title: 'Error al registrarse',
            description: description,
        });
      console.error("Sign up error:", error);
    });
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  signInWithEmailAndPassword(authInstance, email, password)
    .catch(error => {
        let description = 'Ocurrió un error inesperado.';
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            description = 'Las credenciales son incorrectas. Por favor, verifica tu correo y contraseña.';
        }
        toast({
            variant: 'destructive',
            title: 'Error al iniciar sesión',
            description: description,
        });
        console.error("Sign in error:", error);
    });
}

/** Initiate Google Sign-In (non-blocking). */
export async function initiateGoogleSignIn(
  authInstance: Auth,
  firestoreInstance: Firestore
): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account'
  });

  try {
    const result = await signInWithPopup(authInstance, provider);
    const user = result.user;

    // Check if user profile exists
    const userProfileRef = doc(firestoreInstance, 'users', user.uid);
    const userProfileSnap = await getDoc(userProfileRef);

    if (!userProfileSnap.exists()) {
      // Create new user profile with Google data
      const names = (user.displayName || '').split(' ');
      const firstName = names[0] || '';
      const lastName = names.slice(1).join(' ') || '';

      const userProfile: Omit<UserProfile, 'id'> & { id: string } = {
        id: user.uid,
        email: user.email || '',
        firstName: firstName,
        lastName: lastName,
        role: 'customer',
        phoneNumber: '', // Will be filled in /completar-perfil
        photoURL: user.photoURL || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false,
      };

      await setDoc(userProfileRef, userProfile);

      toast({
        title: 'Cuenta creada',
        description: '¡Bienvenido a Al Chile! Por favor completa tu perfil.',
      });
    } else {
      toast({
        title: 'Bienvenido de vuelta',
        description: 'Has iniciado sesión con Google exitosamente.',
      });
    }
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      // User closed popup, no need to show error
      return;
    }

    let description = 'No se pudo iniciar sesión con Google.';
    if (error.code === 'auth/account-exists-with-different-credential') {
      description = 'Ya existe una cuenta con este correo usando otro método de inicio de sesión.';
    } else if (error.code === 'auth/popup-blocked') {
      description = 'El navegador bloqueó la ventana emergente. Por favor, permite ventanas emergentes para este sitio.';
    }

    toast({
      variant: 'destructive',
      title: 'Error al iniciar sesión con Google',
      description: description,
    });
    console.error("Google Sign-In error:", error);
  }
}
