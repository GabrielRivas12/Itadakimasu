import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EpisodeNavigationProps {
  currentEpisodeNumber: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function EpisodeNavigation({
  currentEpisodeNumber,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: EpisodeNavigationProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.prevButton, !hasPrevious && styles.buttonDisabled]}
        onPress={onPrevious}
        disabled={!hasPrevious}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={20} color={hasPrevious ? '#a78bfa' : '#475569'} />
        <Text style={[styles.buttonText, !hasPrevious && styles.buttonTextDisabled]}>
          Anterior
        </Text>
      </TouchableOpacity>

      <Text style={styles.episodeLabel}>Episodio {currentEpisodeNumber}</Text>

      <TouchableOpacity
        style={[styles.button, styles.nextButton, !hasNext && styles.buttonDisabled]}
        onPress={onNext}
        disabled={!hasNext}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, !hasNext && styles.buttonTextDisabled]}>
          Siguiente
        </Text>
        <Ionicons name="chevron-forward" size={20} color={hasNext ? '#a78bfa' : '#475569'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  prevButton: {
    minWidth: 110,
  },
  nextButton: {
    minWidth: 110,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: 'bold',
  },
  buttonTextDisabled: {
    color: '#475569',
  },
  episodeLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
});