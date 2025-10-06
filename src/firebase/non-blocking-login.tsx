'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  UserCredential,
} from 'firebase/auth';
import { doc, Firestore, setDoc } from 'firebase/firestore';
import { UserProfile } from '@/lib/data';
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError } from './errors';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance);
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
    .then((userCredential: UserCredential) => {
      // User created, now create their profile document
      const user = userCredential.user;
      const userProfileRef = doc(firestoreInstance, 'users', user.uid);
      const dataToSet = { ...profileData, id: user.uid };

      // Set the document, but don't block the UI thread
      setDoc(userProfileRef, dataToSet)
        .catch(error => {
          // If creating the profile doc fails, emit a detailed error
          const permissionError = new FirestorePermissionError({
            path: userProfileRef.path,
            operation: 'create',
            requestResourceData: dataToSet,
          });
          errorEmitter.emit('permission-error', permissionError);
          console.error("Error creating user profile:", permissionError);
        });
    })
    .catch(error => {
      // Handle potential errors from createUserWithEmailAndPassword,
      // like email-already-in-use. These could be shown in a toast.
      console.error("Error signing up:", error);
    });
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  signInWithEmailAndPassword(authInstance, email, password);
}
