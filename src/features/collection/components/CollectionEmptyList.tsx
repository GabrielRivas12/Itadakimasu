import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CollectionEmptyListProps {
  activeTab: string;
  onExplorePress: () => void;
}

export function CollectionEmptyList({ activeTab, onExplorePress }: CollectionEmptyListProps) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={
          activeTab === 'En Proceso'
            ? 'play-circle-outline'
            : activeTab === 'Terminado'
              ? 'ribbon-outline'
              : 'bookmark-outline'
        }
        size={64}
        color="#475569"
      />
      <Text style={styles.emptyText}>Tu lista está vacía</Text>
      <Text style={styles.emptySubtext}>
        {activeTab === 'En Proceso'
          ? 'No tienes ningún anime en reproducción en este momento.'
          : activeTab === 'Terminado'
            ? '¡Empieza a ver animes y márcalos como terminados aquí!'
            : 'Agrega animes que planeas ver más tarde.'}
      </Text>
      <TouchableOpacity style={styles.exploreButton} onPress={onExplorePress}>
        <Text style={styles.exploreButtonText}>Explorar Catálogo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
