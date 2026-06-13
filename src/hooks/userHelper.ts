import { Platform } from 'react-native';

export function getUserId(): string | null {
  if (Platform.OS === 'web') {
    const { getAuth } = require('firebase/auth');
    return getAuth().currentUser?.uid || null;
  } else {
    const authMobile = require('@react-native-firebase/auth').default;
    return authMobile().currentUser?.uid || null;
  }
}