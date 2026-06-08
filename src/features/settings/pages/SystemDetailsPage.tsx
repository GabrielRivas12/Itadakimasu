import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export const SystemDetailsPage = () => {
  const router = useRouter();

  // Detect New Architecture (Fabric)
  const isNewArchitecture = (global as any).nativeFabricUIManager != null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalles del Sistema</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Arquitectura React Native</Text>
          <View style={styles.card}>
            <View style={styles.item}>
              <Text style={styles.label}>Versión React Native</Text>
              <Text style={styles.value}>0.83.6</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.label}>New Architecture (Fabric)</Text>
              <View style={[styles.badge, { backgroundColor: isNewArchitecture ? '#22c55e' : '#64748b' }]}>
                <Text style={styles.badgeText}>{isNewArchitecture ? 'Activada' : 'Desactivada'}</Text>
              </View>
            </View>
            <View style={[styles.item, styles.lastItem]}>
              <Text style={styles.label}>Plataforma</Text>
              <Text style={styles.value}>{Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entorno Expo</Text>
          <View style={styles.card}>
            <View style={styles.item}>
              <Text style={styles.label}>Expo SDK</Text>
              <Text style={styles.value}>v55.0.26</Text>
            </View>
            <View style={[styles.item, styles.lastItem]}>
              <Text style={styles.label}>Expo Router</Text>
              <Text style={styles.value}>v55.0.16</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Motor de JavaScript</Text>
          <View style={styles.card}>
            <View style={[styles.item, styles.lastItem]}>
              <Text style={styles.label}>Motor</Text>
              <Text style={styles.value}>Hermes</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footerText}>
          Esta información es útil para depuración y soporte técnico.
        </Text>
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
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#94a3b8',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footerText: {
    color: '#475569',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
});
