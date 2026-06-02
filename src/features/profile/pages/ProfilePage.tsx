import React, { useState, useEffect, memo } from 'react';
import {
  StyleSheet,
  FlatList,
  Alert,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getUserList, UserListItem, UserListStatus, removeAnimeFromList, animeListEvents } from '../../../../services/animeList';
import { UserHeader } from '../components/UserHeader';
import { StatsCard } from '../components/StatsCard';
import { StatusTabs } from '../components/StatusTabs';
import { LibraryAnimeCard } from '../components/LibraryAnimeCard';
import { ProfileEmptyList } from '../components/ProfileEmptyList';
import { onAuthStateChangedCallback as onAuthStateChanged, signInWithGoogle, signOutGoogle, UserInfo, getCurrentUser } from '../../../../services/auth';

// Session cache for profile
let sessionProfileList: UserListItem[] = [];
let profileInitialized = false;

export const ProfilePage = memo(function ProfilePage() {
  const router = useRouter();
  const [list, setList] = useState<UserListItem[]>(sessionProfileList);
  const [activeTab, setActiveTab] = useState<UserListStatus>('En Proceso');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(!profileInitialized);

  // Load list when component is focused or user changes
  const loadList = async (force = false) => {
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
  };

  useEffect(() => {
    const initialUser = getCurrentUser();
    if (initialUser) {
      setUser(initialUser);
    }

    const unsubscribe = onAuthStateChanged((currentUser) => {
      if (currentUser?.id !== user?.id) {
        profileInitialized = false;
      }
      setUser(currentUser);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [user?.id]);

  useEffect(() => {
    loadList();
  }, [user]);

  // Listen for list updates in the background
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

  // We keep loadList available for manual actions, but remove useFocusEffect
  // to prevent re-fetching every time the tab is swiped into view.

  const handleLogin = async () => {
    await signInWithGoogle();
  };

  const handleLogout = () => {
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
  };

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

  if (isLoading && !profileInitialized) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <Text style={styles.headerSubtitle}>Gestiona tu colección</Text>
      </View>
      {user ? (
        <View style={styles.headerContainer}>
          <UserHeader
            name={user.name || 'Usuario'}
            role="Cuenta sincronizada con Google"
            avatarUrl={user.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
          />
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.loginContainer}>
          <View style={styles.loginCard}>
            <Text style={styles.loginText}>
              Inicia sesión con tu cuenta de Google para tener tu lista en todos tus dispositivos
            </Text>
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Ionicons name="logo-google" size={20} color="#ffffff" style={styles.buttonIcon} />
              <Text style={styles.loginButtonText}>Iniciar sesión con Google</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
  },
  logoutButton: {
    padding: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 15,
    backgroundColor: '#0b0f19',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 12,
  },
  loginContainer: {
    padding: 20,
    paddingTop: 10,
  },
  loginCard: {
    backgroundColor: '#161b2c',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d3748',
  },
  googleIcon: {
    marginBottom: 16,
  },
  loginTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  loginText: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#8b5cf6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 10,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
