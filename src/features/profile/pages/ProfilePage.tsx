import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserHeader } from '../components/UserHeader';
import { ProfileSkeleton } from '../components/ProfileSkeleton';
import { SettingsButton } from '../../settings/components/SettingsButton';
import { UpdateNotification } from '../components/UpdateNotification/UpdateNotification';
import { TopAnime } from '../components/TopAnime';
import { useProfile } from '../hooks/useProfile';
import { useResponsive } from '../../../hooks/useResponsive';
import { usePortraitOrientation } from '../../../hooks/usePortraitOrientation';

export const ProfilePage = () => {
  usePortraitOrientation();
  const {
    user,
    isLoading,
    handleLogin,
    handleLogout,
  } = useProfile();

  const { isWeb, getContentWidth, isMobile } = useResponsive();
  const contentWidth = isWeb ? getContentWidth() : '100%';

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isWeb && { maxWidth: contentWidth, alignSelf: 'center', width: '100%' },
          isWeb && isMobile && { paddingHorizontal: 16 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[
          styles.header,
          isWeb && { maxWidth: contentWidth, alignSelf: 'center', width: '100%' },
          isWeb && isMobile && { paddingTop: 20, paddingHorizontal: 16 }
        ]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Mi Perfil</Text>
              <Text style={styles.headerSubtitle}>Configuración de la cuenta</Text>
            </View>
            <SettingsButton />
          </View>
        </View>

        {user ? (
          <View style={[styles.sectionContainer, isWeb && { paddingHorizontal: 0 }]}>
            <View style={styles.userRow}>
              <UserHeader
                name={user.name || 'Usuario'}
                role="Cuenta sincronizada con Google"
                avatarUrl={user.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
              />
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Ionicons name="log-out-outline" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>

            <TopAnime />

          </View>
        ) : (
          <View style={[styles.loginContainer, isWeb && { paddingHorizontal: 0 }]}>
            <View style={[styles.loginCard, isWeb && { maxWidth: 600, marginHorizontal: 'auto', width: '100%' }]}>
              <Ionicons name="person-circle-outline" size={64} color="#475569" />
              <Text style={styles.loginTitle}>Bienvenido</Text>
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 4,
    paddingTop: 45,
    paddingBottom: 15,
    backgroundColor: '#0b0f19',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  sectionContainer: {
    marginBottom: 24,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoutButton: {
    padding: 8,
  },
  infoCard: {
    backgroundColor: '#161b2c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2d3748',
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
    gap: 12,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoText: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  loginContainer: {
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  loginCard: {
    backgroundColor: '#161b2c',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d3748',
  },
  loginTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
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
