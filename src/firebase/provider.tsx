'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { AppUser } from '@/lib/data'; // Assuming types are in lib/types.ts
import { doc, getDoc } from 'firebase/firestore';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  user: User | null;
  userData: AppUser | null; // Full user profile from Firestore
  claims: any | null; // Added claims
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
  user: User | null;
  userData: AppUser | null;
  claims: any | null; // Added claims
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useUser()
export interface UserHookResult {
  user: User | null;
  userData: AppUser | null;
  claims: any | null; // Added claims
  isUserLoading: boolean;
  userError: Error | null;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
  storage,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [claims, setClaims] = useState<any>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);

  useEffect(() => {
    if (!auth || !firestore) {
      setUser(null);
      setClaims(null);
      setUserData(null);
      setIsUserLoading(false);
      setUserError(new Error("Auth or Firestore service not provided."));
      return;
    }

    setIsUserLoading(true);

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const idTokenResult = await firebaseUser.getIdTokenResult(true);
            const userDocRef = doc(firestore, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);

            setUser(firebaseUser);
            setClaims(idTokenResult.claims);
            setUserData(userDoc.exists() ? (userDoc.data() as AppUser) : null);

          } catch (error) {
            console.error("Error fetching user data:", error);
            setUser(firebaseUser);
            setClaims(null);
            setUserData(null);
            setUserError(error as Error);
          }
        } else {
          setUser(null);
          setClaims(null);
          setUserData(null);
        }
        setIsUserLoading(false);
      },
      (error) => {
        console.error("Auth listener error:", error);
        setUser(null);
        setClaims(null);
        setUserData(null);
        setIsUserLoading(false);
        setUserError(error);
      }
    );

    return () => unsubscribe();
  }, [auth, firestore]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth && storage);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      storage: servicesAvailable ? storage : null,
      user,
      userData,
      claims,
      isUserLoading,
      userError,
    };
  }, [firebaseApp, firestore, auth, storage, user, userData, claims, isUserLoading, userError]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth || !context.storage) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    storage: context.storage,
    user: context.user,
    claims: context.claims,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

export const useStorage = (): FirebaseStorage => {
    const { storage } = useFirebase();
    return storage;
}

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

export const useUser = (): UserHookResult => {
  const { user, userData, claims, isUserLoading, userError } = useFirebase();
  return { user, userData, claims, isUserLoading, userError };
};
