import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native'; 
import { useRouter } from 'expo-router';
import { 
  getUserList, 
  UserListItem, 
  UserListStatus, 
  removeAnimeFromList, 
  animeListEvents 
} from '../../../../services/animeList';
import { 
  onAuthStateChangedCallback as onAuthStateChanged, 
  signInWithGoogle, 
  signOutGoogle, 
  UserInfo, 
  getCurrentUser 
} from '../../../../services/auth';

// Session cache for profile
let sessionProfileList: UserListItem[] = [];
let profileInitialized = false;

export const useProfile = () => {
  const router = useRouter();
  const [list, setList] = useState<UserListItem[]>(sessionProfileList);
  const [activeTab, setActiveTab] = useState<UserListStatus>('En Proceso');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(!profileInitialized);

  const loadList = useCallback(async (force = false) => {
    if (!force && profileInitialized && sessionProfileList.length > 0) {
      setIsLoading(false);
      return;
    }
    
    try {
      const userList = await getUserList();
      sessionProfileList = userList;
      setList(userList);
      profileInitialized = true;
    } catch (e) {
      console.error('Error loading profile list:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialUser = getCurrentUser();
    if (initialUser) {
      setUser(initialUser);
    }

    const unsubscribe = onAuthStateChanged((currentUser) => {
      if (!currentUser || currentUser.uid !== user?.uid) {
        // Al cerrar sesión o cambiar de usuario, reseteamos todo
        profileInitialized = false;
        sessionProfileList = [];
        setList([]);
      }
      setUser(currentUser);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    if (user) {
      console.log('🔄 [useProfile] Cargando lista para el usuario:', user.uid);
      loadList();
    }
  }, [user, loadList]);

  useEffect(() => {
    const handleListUpdate = (updatedList: UserListItem[]) => {
      sessionProfileList = updatedList;
      setList(updatedList);
    };

    animeListEvents.on('listUpdated', handleListUpdate);
    return () => {
      animeListEvents.off('listUpdated', handleListUpdate);
    };
  }, []);

  const handleLogin = async () => {
    await signInWithGoogle();
  };

  const handleLogout = () => {
    // Confirmación nativa en Web para evitar crasheos
    if (Platform.OS === 'web') {
      const confirmar = window.confirm('¿Estás seguro de que deseas cerrar tu sesión de Google?');
      if (confirmar) {
        signOutGoogle();
      }
    } else {
      // Alerta nativa para Android / iOS
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

  const handleRemove = (animeId: number, title: string) => {
    //  Confirmación nativa en Web para evitar crasheos
    if (Platform.OS === 'web') {
      const confirmar = window.confirm(`¿Estás seguro de que deseas quitar "${title}" de tu lista personal?`);
      if (confirmar) {
        removeAnimeFromList(animeId).then((updated) => {
          setList(updated);
        });
      }
    } else {
      //  Alerta nativa para Android / iOS
      Alert.alert(
        'Quitar de la lista',
        `¿Estás seguro de que deseas quitar "${title}" de tu lista personal?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Quitar',
            style: 'destructive',
            onPress: async () => {
              const updated = await removeAnimeFromList(animeId);
              setList(updated);
            },
          },
        ]
      );
    }
  };

  const handleAnimePress = (id: number) => {
    router.push(`/anime/${id}`);
  };

  const filteredList = list.filter((item) => item.status === activeTab);

  const countInProcess = list.filter((item) => item.status === 'En Proceso').length;
  const countCompleted = list.filter((item) => item.status === 'Terminado').length;
  const countPlanToWatch = list.filter((item) => item.status === 'Por Ver').length;

  return {
    user,
    isLoading,
    activeTab,
    setActiveTab,
    filteredList,
    countInProcess,
    countCompleted,
    countPlanToWatch,
    handleLogin,
    handleLogout,
    handleRemove,
    handleAnimePress,
  };
};