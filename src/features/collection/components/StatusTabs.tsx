import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserListStatus } from '../../../../services/animeList';
import { useResponsive } from '../../../hooks/useResponsive';

interface StatusTabsProps {
  activeTab: UserListStatus;
  onTabChange: (status: UserListStatus) => void;
}

export function StatusTabs({ activeTab, onTabChange }: StatusTabsProps) {
  const { isWeb } = useResponsive();

  return (
    <View style={[styles.tabContainer, isWeb && styles.webTabContainer]}>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'En Proceso' && styles.tabButtonActive]}
        onPress={() => onTabChange('En Proceso')}
      >
        <Ionicons name="play" size={14} color={activeTab === 'En Proceso' ? '#8b5cf6' : '#94a3b8'} style={styles.tabIcon} />
        <Text style={[styles.tabButtonText, activeTab === 'En Proceso' && styles.tabButtonTextActive]}>
          En Proceso
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'Terminado' && styles.tabButtonActive]}
        onPress={() => onTabChange('Terminado')}
      >
        <Ionicons name="checkmark-done" size={14} color={activeTab === 'Terminado' ? '#8b5cf6' : '#94a3b8'} style={styles.tabIcon} />
        <Text style={[styles.tabButtonText, activeTab === 'Terminado' && styles.tabButtonTextActive]}>
          Terminados
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'Por Ver' && styles.tabButtonActive]}
        onPress={() => onTabChange('Por Ver')}
      >
        <Ionicons name="bookmark" size={14} color={activeTab === 'Por Ver' ? '#8b5cf6' : '#94a3b8'} style={styles.tabIcon} />
        <Text style={[styles.tabButtonText, activeTab === 'Por Ver' && styles.tabButtonTextActive]}>
          Por Ver
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginHorizontal: 0,
    padding: 4,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  webTabContainer: {
    marginHorizontal: 0,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#0f172a',
  },
  tabIcon: {
    marginRight: 6,
  },
  tabButtonText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabButtonTextActive: {
    color: '#ffffff',
  },
});
