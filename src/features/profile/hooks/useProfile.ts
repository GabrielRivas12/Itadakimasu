import { useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import {
  onAuthStateChangedCallback as onAuthStateChanged,
  signInWithGoogle,
  signOutGoogle,
  UserInfo,
  getCurrentUser
} from '../../../../services/auth';

export const useProfile = () => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initialUser = getCurrentUser();
    if (initialUser) {
      setUser(initialUser);
    }

    const unsubscribe = onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    await signInWithGoogle();
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmar = window.confirm('¿Estás seguro de que deseas cerrar tu sesión de Google?');
      if (confirmar) {
        signOutGoogle();
      }
    } else {
      Alert.alert(
        'Cerrar Sesión',
        '¿Estás seguro de que deseas cerrar tu sesión de Google?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Cerrar Sesión',
            style: 'destructive',
            onPress: async () => {
              await signOutGoogle();
            },
          },
        ]
      );
    }
  };

  return {
    user,
    isLoading,
    handleLogin,
    handleLogout,
  };
};
