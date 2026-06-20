import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  getUserList,
  UserListItem,
  UserListStatus,
  removeAnimeFromList,
  animeListEvents
} from '../../../../services/animeList';
import { getCurrentUser } from '../../../../services/auth';

let sessionList: UserListItem[] = [];
let initialized = false;

export const useCollection = () => {
  const router = useRouter();
  const [list, setList] = useState<UserListItem[]>(sessionList);
  const [activeTab, setActiveTab] = useState<UserListStatus>('En Proceso');
  const [isLoading, setIsLoading] = useState(!initialized);
  const user = getCurrentUser();

  const loadList = useCallback(async (force = false) => {
    if (!force && initialized && sessionList.length > 0) {
      return;
    }

    if (force && sessionList.length === 0) {
      setIsLoading(true);
    }

    try {
      const userList = await getUserList();
      sessionList = userList;
      setList(userList);
      initialized = true;
    } catch (e) {
      console.error('Error loading collection list:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      loadList(true);
    }, [user, loadList])
  );

  useEffect(() => {
    const handleListUpdate = (updatedList: UserListItem[]) => {
      sessionList = updatedList;
      setList(updatedList);
    };

    animeListEvents.on('listUpdated', handleListUpdate);
    return () => {
      animeListEvents.off('listUpdated', handleListUpdate);
    };
  }, []);

  const handleRemove = (animeId: number, title: string) => {
    if (Platform.OS === 'web') {
      const confirmar = window.confirm(`¿Estás seguro de que deseas quitar "${title}" de tu lista personal?`);
      if (confirmar) {
        removeAnimeFromList(animeId).then((updated) => {
          setList(updated);
        });
      }
    } else {
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
    router.push({ pathname: '/animedetails', params: { id } });
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
    handleRemove,
    handleAnimePress,
    loadList,
  };
};
