import React, { memo, useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { UserHeader } from '../components/UserHeader';
import { SettingsButton } from '../../settings/components/SettingsButton';
import { UpdateNotification } from '../components/UpdateNotification/UpdateNotification';
import { StatsCard } from '../components/StatsCard';
import { StatusTabs } from '../components/StatusTabs';
import { LibraryAnimeCard } from '../components/LibraryAnimeCard';
import { ProfileEmptyList } from '../components/ProfileEmptyList';
import { useProfile } from '../hooks/useProfile';
import { useResponsive } from '../../../hooks/useResponsive';

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
    loadList,
  } = useProfile();

  useFocusEffect(
    useCallback(() => {
      loadList(true);
    }, [loadList])
  );

  const { isWeb, getContentWidth, getColumns, isMobile } = useResponsive();
  const columns = getColumns(1, 1, 2, 2);

  if (isLoading) {
    return <View style={styles.container} />;
  }

  const contentWidth = isWeb ? getContentWidth() : '100%';

  return (
    <View style={styles.container}>
      <FlatList
        key={columns}
        data={filteredList}
        keyExtractor={(item) => item.anime.id.toString()}
        numColumns={columns}
        contentContainerStyle={[
          styles.listContent,
          isWeb && { maxWidth: contentWidth, alignSelf: 'center', width: '100%' },
          isWeb && isMobile && { paddingHorizontal: 16 }
        ]}
        columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={isWeb && { width: '100%', marginBottom: 10 }}>
            <View style={[
              styles.header,
              isWeb && { paddingHorizontal: 0 },
              isWeb && isMobile && { paddingTop: 20 }
            ]}>
              <View style={styles.headerTop}>
                <Text style={styles.headerTitle}>Mi Perfil</Text>
                <SettingsButton />
              </View>
              <Text style={styles.headerSubtitle}>Gestiona tu colección</Text>
            </View>

            {user ? (
              <View style={[styles.headerContainer, isWeb && { paddingHorizontal: 0 }]}>
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
              <View style={[styles.loginContainer, isWeb && { paddingHorizontal: 0 }]}>
                <View style={[styles.loginCard, isWeb && { maxWidth: 600, marginHorizontal: 'auto', width: '100%' }]}>
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

            <UpdateNotification />

            <View style={isWeb && { paddingHorizontal: 0 }}>
              <StatsCard
                inProcess={countInProcess}
                completed={countCompleted}
                planToWatch={countPlanToWatch}
              />

              <StatusTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </View>
          </View>
        }
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
            width={columns > 1 ? `${100 / columns - 1}%` : undefined}
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
  flex: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 0,
  },
  logoutButton: {
    padding: 8,
  },
  header: {
    paddingHorizontal: 0,
    paddingTop: 45,
    paddingBottom: 15,
    backgroundColor: '#0b0f19',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
  gridRow: {
    justifyContent: 'space-between',
  },
  loginContainer: {
    paddingVertical: 10,
    paddingHorizontal: 0,
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
