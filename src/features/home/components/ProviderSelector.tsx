import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Anime1VStreamLink } from '../../../../services/anime1v';

interface ProviderSelectorProps {
  availableServers: Anime1VStreamLink[];
  selectedServerName: string;
  onServerChange: (serverName: string) => void;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  availableServers,
  selectedServerName,
  onServerChange,
}) => {
  // Solo mostrar los servidores que el usuario pidió si están disponibles
  const targetServers = ['streamwish', 'mp4upload'];

  // Usar un Set para evitar duplicados por nombre de servidor
  const seenServers = new Set<string>();
  const filteredServers = availableServers.filter(s => {
    const serverLower = s.server.toLowerCase();
    const isTarget = targetServers.some(target => serverLower.includes(target));
    if (isTarget && !seenServers.has(serverLower)) {
      seenServers.add(serverLower);
      return true;
    }
    return false;
  });

  if (filteredServers.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="server-outline" size={16} color="#8b5cf6" />
        <Text style={styles.title}>Servidor de video:</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {filteredServers.map((server, index) => {
          const isSelected = server.server.toLowerCase().includes(selectedServerName.toLowerCase());

          let displayName = server.server;
          if (server.server.toLowerCase().includes('streamwish')) displayName = 'StreamWish';
          else if (server.server.toLowerCase().includes('mp4upload')) displayName = 'MP4Upload';

          return (
            <TouchableOpacity
              key={`${server.server}-${index}`}
              style={[styles.button, isSelected && styles.buttonSelected]}
              onPress={() => onServerChange(server.server)}
            >
              <Text style={[styles.buttonText, isSelected && styles.buttonTextSelected]}>
                {displayName}
              </Text>
              {isSelected && <Ionicons name="checkmark-circle" size={14} color="#ffffff" style={styles.checkIcon} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 20,
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161b2c',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  buttonSelected: {
    backgroundColor: '#8b5cf6',
    borderColor: '#a78bfa',
  },
  buttonText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  checkIcon: {
    marginLeft: 6,
  },
});
