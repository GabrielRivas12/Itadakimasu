import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useResponsive } from '../../../hooks/useResponsive';

interface StatBoxProps {
  value: number;
  label: string;
}

function StatBox({ value, label }: StatBoxProps) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface StatsCardProps {
  inProcess: number;
  completed: number;
  planToWatch: number;
}

export function StatsCard({ inProcess, completed, planToWatch }: StatsCardProps) {
  const { isWeb } = useResponsive();

  return (
    <View style={[styles.statsCard, isWeb && styles.webStatsCard]}>
      <StatBox value={inProcess} label="En Proceso" />
      <View style={styles.statDivider} />
      <StatBox value={completed} label="Terminados" />
      <View style={styles.statDivider} />
      <StatBox value={planToWatch} label="Por Ver" />
    </View>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    marginHorizontal: 0,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  webStatsCard: {
    marginHorizontal: 0,
    marginTop: 10,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#334155',
    height: '100%',
  },
});
