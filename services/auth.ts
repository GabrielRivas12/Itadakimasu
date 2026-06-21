import { Platform } from 'react-native';
import { clearLocalList, mergeGuestListIntoUser } from './animeList';
import { clearAllCaches } from './dataPreloader';
import { clearStreakCache } from './streak';
import { asegurarFirebaseApp } from './firebaseConfig';

export interface UserInfo {
  uid: string;
  name: string | null;
  email: string | null;
  photo: string | null;
}

// CONFIGURACIÓN E INICIALIZACIÓN WEB (Diferida)
let webAuth: any = null;
let googleProviderWeb: any = null;

// Función para obtener la instancia web
function getWebAuth() {
  if (Platform.OS === 'web' && !webAuth) {
    asegurarFirebaseApp(); // ASEGURAMOS INICIALIZACIÓN
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

// INICIO DE SESIÓN CON GOOGLE
export async function signInWithGoogle(): Promise<UserInfo | null> {
  try {
    let user: any = null;

    // WEB
    if (Platform.OS === 'web') {
      const { signInWithPopup } = require('firebase/auth');
      const { webAuth: authInstance, googleProviderWeb: provider } = getWebAuth();

      if (!authInstance || !provider) {
        throw new Error('Auth Web no se pudo inicializar');
      }

      const result = await signInWithPopup(authInstance, provider);
      user = result.user;
    }
    // MÓVIL
    else {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      // Corrección Modular Nativa
      const { getAuth, GoogleAuthProvider, signInWithCredential } = require('@react-native-firebase/auth');

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;

      if (!idToken) {
        throw new Error('No se recibió idToken de Google');
      }

      const googleCredential = GoogleAuthProvider.credential(idToken);
      // Usamos signInWithCredential pasando getAuth()
      const userCredential = await signInWithCredential(getAuth(), googleCredential);
      user = userCredential.user;
    }

    // MIGRACIÓN DE DATOS DE USUARIOS ANÓNIMOS
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

// CERRAR SESIÓN
export async function signOutGoogle(): Promise<void> {
  try {
    console.log('Iniciando proceso de cierre de sesión...');

    // 1. Limpiar la caché en memoria del preloader
    clearAllCaches();
    clearStreakCache();

    // 2. Limpiar el caché local del usuario (móvil)
    if (Platform.OS !== 'web') {
      try {
        await clearLocalList();
      } catch (e) {
        console.warn('No se pudo limpiar el caché local durante el logout:', e);
      }
    }

    // 3. Cerrar sesión según plataforma
    if (Platform.OS === 'web') {
      const { signOut } = require('firebase/auth');
      const { webAuth: authInstance } = getWebAuth();
      if (authInstance && authInstance.currentUser) {
        await signOut(authInstance);
      }
    } else {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      // Corrección Modular Nativa
      const { getAuth, signOut } = require('@react-native-firebase/auth');

      // Intentar cerrar sesión de Google 
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        console.warn('Error al cerrar sesión en Google Sign-In:', e);
      }

      // Cerrar sesión en Auth Móvil
      try {
        const authMobile = getAuth();
        if (authMobile.currentUser) {
          await signOut(authMobile);
        }
      } catch (e) {
        console.error('Error al cerrar sesión en Firebase Auth Móvil:', e);
      }
    }

    console.log('Sesión cerrada correctamente');
  } catch (error) {
    console.error('Error general en signOutGoogle:', error);
  }
}

// SUSCRIPCIÓN AL ESTADO DE AUTENTICACIÓN
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
    // Corrección Modular Nativa
    const { getAuth, onAuthStateChanged } = require('@react-native-firebase/auth');
    return onAuthStateChanged(getAuth(), (user: any) => {
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

// ELIMINAR CUENTA DE FIREBASE
export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  try {
    if (Platform.OS === 'web') {
      const { deleteUser } = require('firebase/auth');
      const { webAuth: authInstance } = getWebAuth();
      const user = authInstance?.currentUser;
      if (!user) throw new Error('No hay usuario autenticado');
      await deleteUser(user);
    } else {
      // Corrección Modular Nativa
      const { getAuth, deleteUser } = require('@react-native-firebase/auth');
      const authMobile = getAuth();
      const user = authMobile.currentUser;
      if (!user) throw new Error('No hay usuario autenticado');
      await deleteUser(user);
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error al eliminar cuenta:', error);
    return { success: false, error: error.message || 'Error al eliminar la cuenta' };
  }
}

// OBTENER USUARIO ACTUAL
export function getCurrentUser(): UserInfo | null {
  let user: any = null;

  if (Platform.OS === 'web') {
    const { webAuth: authInstance } = getWebAuth();
    user = authInstance?.currentUser;
  } else {
    // Corrección Modular Nativa
    const { getAuth } = require('@react-native-firebase/auth');
    user = getAuth().currentUser;
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