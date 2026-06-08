import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ResponsiveContainer } from '../../../components/common/ResponsiveContainer';
import { getIsAdultContentEnabled, setIsAdultContentEnabled } from '../../../../services/cache';

export const SettingsPage = () => {
  const router = useRouter();
  const [isAdultContentEnabled, setAdultContentEnabled] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const enabled = await getIsAdultContentEnabled();
    setAdultContentEnabled(enabled);
  };

  const handleToggleAdultContent = async (value: boolean) => {
    setAdultContentEnabled(value);
    await setIsAdultContentEnabled(value);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aplicación</Text>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingIconContainer}>
                <Ionicons name="notifications-outline" size={22} color="#8b5cf6" />
              </View>
              <Text style={styles.settingLabel}>Notificaciones</Text>
              <Ionicons name="chevron-forward" size={20} color="#475569" />
            </View>
            <View style={styles.settingItem}>
              <View style={styles.settingIconContainer}>
                <Ionicons name="color-palette-outline" size={22} color="#8b5cf6" />
              </View>
              <Text style={styles.settingLabel}>Apariencia</Text>
              <Ionicons name="chevron-forward" size={20} color="#475569" />
            </View>
            <View style={[styles.settingItem, styles.lastItem]}>
              <View style={styles.settingIconContainer}>
                <Ionicons name="warning-outline" size={22} color="#8b5cf6" />
              </View>
              <Text style={styles.settingLabel}>Contenido +18</Text>
              <Switch
                trackColor={{ false: '#2d3748', true: '#8b5cf6' }}
                thumbColor={isAdultContentEnabled ? '#ffffff' : '#94a3b8'}
                ios_backgroundColor="#2d3748"
                onValueChange={handleToggleAdultContent}
                value={isAdultContentEnabled}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuenta</Text>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingIconContainer}>
                <Ionicons name="person-outline" size={22} color="#8b5cf6" />
              </View>
              <Text style={styles.settingLabel}>Editar Perfil</Text>
              <Ionicons name="chevron-forward" size={20} color="#475569" />
            </View>
            <TouchableOpacity 
              style={[styles.settingItem, styles.lastItem]} 
              onPress={() => router.push('/privacy')}
              activeOpacity={0.7}
            >
              <View style={styles.settingIconContainer}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#8b5cf6" />
              </View>
              <Text style={styles.settingLabel}>Privacidad y Políticas</Text>
              <Ionicons name="chevron-forward" size={20} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acerca de</Text>
          <View style={styles.card}>
            <TouchableOpacity 
              style={[styles.settingItem, styles.lastItem]} 
              onPress={() => router.push('/system-details')}
              activeOpacity={0.7}
            >
              <View style={styles.settingIconContainer}>
                <Ionicons name="information-circle-outline" size={22} color="#8b5cf6" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Versión de la App</Text>
                <View style={styles.versionContainer}>
                  <Text style={styles.settingValue}>1.0.1</Text>
                  <Ionicons name="chevron-forward" size={16} color="#475569" style={{ marginLeft: 4 }} />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
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
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#161b2c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2d3748',
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  settingTextContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '400',
  },
  versionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
