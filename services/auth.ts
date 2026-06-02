import { Platform } from 'react-native';
import { clearLocalList, mergeGuestListIntoUser } from './animeList';

export interface UserInfo {
  uid: string;
  name: string | null;
  email: string | null;
  photo: string | null;
}

// --- CONFIGURACIÓN E INICIALIZACIÓN (Multiplataforma) ---
const getFirebaseConfig = () => ({
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
});

export function asegurarFirebaseApp() {
  const config = getFirebaseConfig();
  
  if (Platform.OS === 'web') {
    const { initializeApp, getApps } = require('firebase/app');
    if (getApps().length === 0) {
      initializeApp(config);
    }
  } else {
    const { initializeApp, getApps } = require('@react-native-firebase/app');
    if (getApps().length === 0) {
      initializeApp(config);
    }
  }
}

// --- CONFIGURACIÓN E INICIALIZACIÓN WEB (Lazy/Retrasada) ---
let webAuth: any = null;
let googleProviderWeb: any = null;

// Función para obtener la instancia web de forma segura
function getWebAuth() {
  if (Platform.OS === 'web' && !webAuth) {
    asegurarFirebaseApp(); // 🔥 ASEGURAMOS INICIALIZACIÓN AQUÍ
    const { getAuth, GoogleAuthProvider } = require('firebase/auth');
    webAuth = getAuth();
    googleProviderWeb = new GoogleAuthProvider();
  }
  return { webAuth, googleProviderWeb };
}

// Configuración de Google Sign-In solo para Móvil
if (Platform.OS !== 'web') {
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  GoogleSignin.configure({
    webClientId: "877372612530-g1sc5s3bq2eo9k6n62akpmeu30a3ufbq.apps.googleusercontent.com",
    offlineAccess: false,
  });
}

/**
 * INICIO DE SESIÓN CON GOOGLE
 */
export async function signInWithGoogle(): Promise<UserInfo | null> {
  try {
    let user: any = null;

    // 🌐 MUNDO WEB
    if (Platform.OS === 'web') {
      const { signInWithPopup } = require('firebase/auth');
      const { webAuth: authInstance, googleProviderWeb: provider } = getWebAuth();

      if (!authInstance || !provider) {
        throw new Error('Firebase Auth Web no se pudo inicializar de forma diferida.');
      }

      const result = await signInWithPopup(authInstance, provider);
      user = result.user;
    } 
    // 📱 MUNDO MÓVIL
    else {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      const authMobile = require('@react-native-firebase/auth').default;
      const { GoogleAuthProvider } = require('@react-native-firebase/auth');

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;

      if (!idToken) {
        throw new Error('No se recibió idToken de Google');
      }

      const googleCredential = GoogleAuthProvider.credential(idToken);
      const userCredential = await authMobile().signInWithCredential(googleCredential);
      user = userCredential.user;
    }

    // --- MIGRACIÓN DE DATOS (Común para ambos mundos) ---
    if (user) {
      await mergeGuestListIntoUser(user.uid);
      return {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photo: user.photoURL,
      };
    }
    return null;
  } catch (error) {
    console.error('Error en signInWithGoogle:', error);
    return null;
  }
}

/**
 * CERRAR SESIÓN
 */
export async function signOutGoogle(): Promise<void> {
  try {
    // 1. Limpiar el caché local del usuario (Común)
    await clearLocalList();

    // 2. Cerrar sesión según plataforma
    if (Platform.OS === 'web') {
      const { signOut } = require('firebase/auth');
      const { webAuth: authInstance } = getWebAuth();
      await signOut(authInstance);
    } else {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      const authMobile = require('@react-native-firebase/auth').default;
      
      await GoogleSignin.signOut();
      await authMobile().signOut();
    }
    
    console.log('Sesión cerrada y caché local limpio');
  } catch (error) {
    console.error('Error en signOutGoogle:', error);
  }
}

/**
 * SUSCRIPCIÓN AL ESTADO DE AUTENTICACIÓN
 */
export function onAuthStateChangedCallback(callback: (user: UserInfo | null) => void) {
  if (Platform.OS === 'web') {
    const { onAuthStateChanged } = require('firebase/auth');
    const { webAuth: authInstance } = getWebAuth();
    return onAuthStateChanged(authInstance, (user: any) => {
      if (user) {
        callback({
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          photo: user.photoURL,
        });
      } else {
        callback(null);
      }
    });
  } else {
    const authMobile = require('@react-native-firebase/auth').default;
    const { onAuthStateChanged } = require('@react-native-firebase/auth');
    return onAuthStateChanged(authMobile(), (user: any) => {
      if (user) {
        callback({
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          photo: user.photoURL,
        });
      } else {
        callback(null);
      }
    });
  }
}

/**
 * OBTENER USUARIO ACTUAL
 */
export function getCurrentUser(): UserInfo | null {
  let user: any = null;

  if (Platform.OS === 'web') {
    const { webAuth: authInstance } = getWebAuth();
    user = authInstance?.currentUser;
  } else {
    const authMobile = require('@react-native-firebase/auth').default;
    user = authMobile().currentUser;
  }

  if (user) {
    return {
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      photo: user.photoURL,
    };
  }
  return null;
}