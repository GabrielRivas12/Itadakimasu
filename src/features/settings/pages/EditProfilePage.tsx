import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  getCurrentUser,
  onAuthStateChangedCallback,
  deleteAccount,
  signOutGoogle,
  UserInfo,
} from '../../../../services/auth';

export const EditProfilePage = () => {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const initialUser = getCurrentUser();
    if (initialUser) setUser(initialUser);

    const unsubscribe = onAuthStateChangedCallback((currentUser) => {
      setUser(currentUser);
    });

    return unsubscribe;
  }, []);

  const handleDeleteAccount = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        '¿Estás seguro de que deseas eliminar tu cuenta? Esta acción es irreversible y todos tus datos se perderán.'
      );
      if (confirmed) confirmDelete();
    } else {
      Alert.alert(
        'Eliminar Cuenta',
        '¿Estás seguro de que deseas eliminar tu cuenta? Esta acción es irreversible y todos tus datos se perderán.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: confirmDelete,
          },
        ]
      );
    }
  };

  const confirmDelete = async () => {
    const result = await deleteAccount();
    if (result.success) {
      await signOutGoogle();
      router.replace('/');
    } else {
      Alert.alert(
        'Error',
        result.error || 'No se pudo eliminar la cuenta. Intenta iniciar sesión nuevamente e intentarlo.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {user ? (
          <>
            <View style={styles.avatarSection}>
              <Image
                source={{
                  uri:
                    user.photo ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                }}
                style={styles.avatar}
              />
              <Text style={styles.userName}>{user.name || 'Usuario'}</Text>
              <Text style={styles.syncLabel}>Cuenta sincronizada con Google</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.infoRow}>
                <View style={styles.iconContainer}>
                  <Ionicons name="person-outline" size={20} color="#8b5cf6" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Nombre</Text>
                  <Text style={styles.infoValue}>{user.name || '—'}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={[styles.infoRow, styles.lastInfoRow]}>
                <View style={styles.iconContainer}>
                  <Ionicons name="mail-outline" size={20} color="#8b5cf6" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Correo electrónico</Text>
                  <Text style={styles.infoValue}>{user.email || '—'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.dangerSection}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteAccount}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={22} color="#ef4444" />
                <Text style={styles.deleteButtonText}>Eliminar cuenta</Text>
              </TouchableOpacity>
              <Text style={styles.deleteDisclaimer}>
                Esta acción eliminará permanentemente tu cuenta y todos tus datos asociados.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="person-circle-outline" size={80} color="#475569" />
            <Text style={styles.emptyText}>Inicia sesión para ver tu perfil</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: '#0b0f19',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#8b5cf6',
    marginBottom: 16,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  syncLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  card: {
    backgroundColor: '#161b2c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2d3748',
    overflow: 'hidden',
    marginBottom: 28,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  lastInfoRow: {
    borderBottomWidth: 0,
  },
  divider: {
    height: 1,
    backgroundColor: '#2d3748',
    marginHorizontal: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  dangerSection: {
    alignItems: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  deleteDisclaimer: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
    marginTop: 16,
  },
});
