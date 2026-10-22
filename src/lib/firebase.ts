import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDqXaURs_yBL_cwyaTijeOyy-zklK9yP3Y",
  authDomain: "developer-onboarding-6f953.firebaseapp.com",
  projectId: "developer-onboarding-6f953",
  storageBucket: "developer-onboarding-6f953.firebasestorage.app",
  messagingSenderId: "694681711458",
  appId: "1:694681711458:web:b470a3eef7408359ce323b",
  measurementId: "G-DHJ5TGX3GR",
};

// Initialize Firebase only if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { signInWithPopup, signInWithRedirect, getRedirectResult, signOut };
