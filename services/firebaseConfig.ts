import { Platform } from 'react-native';

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
