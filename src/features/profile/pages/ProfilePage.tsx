import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { getUserList, UserListItem, UserListStatus, removeAnimeFromList } from '../../../../services/animeList';
import { UserHeader } from '../components/UserHeader';
import { StatsCard } from '../components/StatsCard';
import { StatusTabs } from '../components/StatusTabs';
import { LibraryAnimeCard } from '../components/LibraryAnimeCard';
import { ProfileEmptyList } from '../components/ProfileEmptyList';

export function ProfilePage() {
  const router = useRouter();
  const [list, setList] = useState<UserListItem[]>([]);
  const [activeTab, setActiveTab] = useState<UserListStatus>('En Proceso');

  const loadList = async () => {
    try {
      const userList = await getUserList();
      setList(userList);
    } catch (e) {
      console.error('Error loading profile list:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadList();
    }, [])
  );

  const handleRemove = (animeId: number, title: string) => {
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
  };

  const handleAnimePress = (id: number) => {
    router.push(`/anime/${id}`);
  };

  const filteredList = list.filter((item) => item.status === activeTab);

  const countInProcess = list.filter((item) => item.status === 'En Proceso').length;
  const countCompleted = list.filter((item) => item.status === 'Terminado').length;
  const countPlanToWatch = list.filter((item) => item.status === 'Por Ver').length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <UserHeader
        name="User"
        role="Google"
        avatarUrl="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
      />

      <StatsCard
        inProcess={countInProcess}
        completed={countCompleted}
        planToWatch={countPlanToWatch}
      />

      <StatusTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.anime.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <ProfileEmptyList 
            activeTab={activeTab} 
            onExplorePress={() => router.push('/explore')} 
          />
        }
        renderItem={({ item }) => (
          <LibraryAnimeCard
            item={item}
            onPress={handleAnimePress}
            onRemove={handleRemove}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});
