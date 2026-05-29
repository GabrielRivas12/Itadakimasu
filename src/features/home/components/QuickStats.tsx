import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface QuickStatsProps {
  averageScore: number | null;
  episodes: number | null;
  status: string;
}

export function QuickStats({ averageScore, episodes, status }: QuickStatsProps) {
  return (
    <View style={styles.statsRow}>
      <View style={styles.statBox}>
        <Text style={styles.statLabel}>Calificación</Text>
        <Text style={styles.statValue}>
          {averageScore ? `★ ${(averageScore / 10).toFixed(1)}` : 'N/A'}
        </Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statBox}>
        <Text style={styles.statLabel}>Episodios</Text>
        <Text style={styles.statValue}>{episodes || 'En emisión'}</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statBox}>
        <Text style={styles.statLabel}>Estado</Text>
        <Text style={styles.statValue} numberOfLines={1}>
          {status === 'FINISHED' ? 'Finalizado' : status === 'RELEASING' ? 'En Emisión' : 'Próximo'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#334155',
    height: '100%',
  },
});
