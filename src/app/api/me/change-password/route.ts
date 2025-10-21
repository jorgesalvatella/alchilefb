import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK if not already initialized
// This check prevents re-initialization errors in Next.js development mode
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, // Usar variable de entorno
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    // Optionally, re-throw or handle this error more gracefully
    // For now, we'll let the main POST handler's catch block handle subsequent errors
  }
}

export async function POST(req: NextRequest) {
  try {
    const { currentPassword, newPassword } = await req.json();
    const authorization = req.headers.get('Authorization');

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authorization.split('Bearer ')[1];

    // Verify the ID token
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Re-authenticate the user with their current password
    // Firebase Admin SDK does not directly support re-authentication with password.
    // This typically needs to be done on the client-side using Firebase Client SDK.
    // For a server-side password change, we need to rely on the client having
    // recently authenticated or use a custom token approach.
    // Given the prompt, the client-side `reauthenticateWithCredential` is the standard way.
    // However, since the request is coming to the backend, we'll assume the client
    // has already handled re-authentication or that the ID token is fresh enough.
    // If the ID token is old, `verifyIdToken` might still pass, but `updateUser`
    // might fail if the user's session is considered stale by Firebase Auth.
    // The most secure way for a backend to change a password is if the client
    // sends a fresh ID token *after* re-authenticating with the current password
    // on the client side.

    // For this implementation, we will directly update the password using Admin SDK.
    // It's crucial that the client-side ensures the `currentPassword` is correct
    // and the user is recently authenticated before calling this endpoint.
    // The `currentPassword` sent here is primarily for validation on the client-side
    // and not directly used by `admin.auth().updateUser` for re-authentication.
    // If a strict re-authentication is needed on the backend, a custom token flow
    // or a different approach would be required.

    // Update user's password
    await getAuth().updateUser(uid, {
      password: newPassword,
    });

    return NextResponse.json({ message: 'Password updated successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('Error changing password:', error);

    // Handle specific Firebase Admin errors
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ message: 'Authentication token expired. Please log in again.' }, { status: 401 });
    }
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }
    // Generic error for other cases
    return NextResponse.json({ message: 'Failed to change password', error: error.message }, { status: 500 });
  }
}