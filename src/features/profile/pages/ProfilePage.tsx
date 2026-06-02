import React, { memo } from 'react';
import {
  StyleSheet,
  FlatList,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { UserHeader } from '../components/UserHeader';
import { StatsCard } from '../components/StatsCard';
import { StatusTabs } from '../components/StatusTabs';
import { LibraryAnimeCard } from '../components/LibraryAnimeCard';
import { ProfileEmptyList } from '../components/ProfileEmptyList';
import { useProfile } from '../hooks/useProfile';

export const ProfilePage = memo(function ProfilePage() {
  const router = useRouter();
  const {
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
  } = useProfile();

  if (isLoading) {
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
