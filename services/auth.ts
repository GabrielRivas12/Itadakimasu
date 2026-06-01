import auth, { 
  onAuthStateChanged, 
  signInWithCredential, 
  signOut,
  GoogleAuthProvider 
} from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { clearLocalList, mergeGuestListIntoUser } from './animeList';

/**
 * SERVICIO DE AUTENTICACIÓN - API MODULAR ESTRICTA
 */

export interface UserInfo {
  uid: string;
  name: string | null;
  email: string | null;
  photo: string | null;
}

// Configuración de Google Sign-In
GoogleSignin.configure({
  webClientId: "877372612530-g1sc5s3bq2eo9k6n62akpmeu30a3ufbq.apps.googleusercontent.com",
  offlineAccess: false,
});

export async function signInWithGoogle(): Promise<UserInfo | null> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    
    const response = await GoogleSignin.signIn();
    const idToken = response.data?.idToken;

    if (!idToken) {
      throw new Error('No se recibió idToken de Google');
    }

    const googleCredential = GoogleAuthProvider.credential(idToken);
    const userCredential = await auth().signInWithCredential(googleCredential);
    
    const user = userCredential.user;

    // --- MIGRACIÓN DE DATOS ---
    // Si el usuario tenía una lista como invitado, la migramos a su nueva cuenta
    await mergeGuestListIntoUser(user.uid);

    return {
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      photo: user.photoURL,
    };
  } catch (error) {
    console.error('Error en signInWithGoogle:', error);
    return null;
  }
}

export async function signOutGoogle(): Promise<void> {
  try {
    // 1. Limpiar el caché local del usuario antes de cerrar sesión en Firebase
    await clearLocalList();

    // 2. Cerrar sesión en Google y Firebase
    await GoogleSignin.signOut();
    await signOut(auth());
    
    console.log('Sesión cerrada y caché local limpio');
  } catch (error) {
    console.error('Error en signOutGoogle:', error);
  }
}

/**
 * Suscripción al estado de autenticación
 */
export function onAuthStateChangedCallback(callback: (user: UserInfo | null) => void) {
  return onAuthStateChanged(auth(), (user) => {
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

export function getCurrentUser(): UserInfo | null {
  const user = auth().currentUser;
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
