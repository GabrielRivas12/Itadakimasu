import { Platform } from 'react-native';

const getFirebaseConfig = () => ({
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
});

// Inicialización inmediata en Web para evitar condiciones de carrera
if (Platform.OS === 'web') {
  try {
    const { initializeApp, getApps } = require('firebase/app');
    if (getApps().length === 0) {
      const config = getFirebaseConfig();
      // Solo inicializar si al menos el apiKey existe
      if (config.apiKey) {
        initializeApp(config);
      } else {
        console.warn('[Firebase] No se pudo inicializar en Web: Faltan variables de entorno EXPO_PUBLIC_');
      }
    }
  } catch (error) {
    console.error('[Firebase] Error durante la inicialización en Web:', error);
  }
}

export function asegurarFirebaseApp() {
  // En Web ya se intentó arriba, pero esto sirve de respaldo y para móvil
  const config = getFirebaseConfig();
  
  if (Platform.OS === 'web') {
    const { initializeApp, getApps } = require('firebase/app');
    if (getApps().length === 0 && config.apiKey) {
      initializeApp(config);
    }
  } else {
    const { initializeApp, getApps } = require('@react-native-firebase/app');
    if (getApps().length === 0) {
      initializeApp(config);
    }
  }
}
