import React from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function ExploreLoading() {
  return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#8b5cf6" />
      <Text style={styles.loadingText}>Buscando contenido...</Text>
    </View>
  );
}

export function ExploreEmpty() {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={48} color="#475569" />
      <Text style={styles.emptyText}>No se encontraron resultados</Text>
      <Text style={styles.emptySubtext}>Intenta buscar con otros términos o filtros</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
});
