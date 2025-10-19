import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  "projectId": "studio-9824031244-700aa",
  "appId": "1:1073493631859:web:d747356460c06013eb5b06",
  "apiKey": "AIzaSyCetC4ZTnHKQa2Pm_YWfhoMCbYqdaGTqQc",
  "authDomain": "studio-9824031244-700aa.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "1073493631859"
};

// Initialize Firebase (solo si no está inicializado)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Export Firestore instance
export const db = getFirestore(app);
