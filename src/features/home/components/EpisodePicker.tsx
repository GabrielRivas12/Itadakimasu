import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Anime1VEpisode } from '../../../../services/anime1v';

interface EpisodePickerProps {
  episodes: Anime1VEpisode[];
  currentEpisodeNumber: number | null;
  onEpisodePress: (episode: Anime1VEpisode) => void;
}

export const EpisodePicker: React.FC<EpisodePickerProps> = ({
  episodes,
  currentEpisodeNumber,
  onEpisodePress,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleDropdown = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const handleEpisodeSelect = (episode: Anime1VEpisode) => {
    onEpisodePress(episode);
    setIsExpanded(false);
  };

  const renderEpisodeItem = ({ item }: { item: Anime1VEpisode }) => {
    const isSelected = item.number === currentEpisodeNumber;
    return (
      <TouchableOpacity
        style={[styles.episodeItem, isSelected && styles.selectedItem]}
        onPress={() => handleEpisodeSelect(item)}
      >
        <View style={styles.episodeInfo}>
          <Text style={[styles.episodeText, isSelected && styles.selectedText]}>
            Episodio {item.number}
          </Text>
          {isSelected && <Ionicons name="play" size={16} color="#ffffff" />}
        </View>
        <Ionicons name="chevron-forward" size={16} color={isSelected ? "#ffffff" : "#475569"} />
      </TouchableOpacity>
    );
  };

  if (episodes.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Lista de Capítulos</Text>
      
      <TouchableOpacity 
        style={[styles.trigger, isExpanded && styles.activeTrigger]} 
        onPress={toggleDropdown}
        activeOpacity={0.7}
      >
        <View style={styles.triggerLeft}>
          <View style={styles.iconBadge}>
            <Ionicons name="list" size={18} color="#8b5cf6" />
          </View>
          <Text style={styles.triggerText}>
            {currentEpisodeNumber ? `Viendo: Episodio ${currentEpisodeNumber}` : 'Seleccionar Episodio'}
          </Text>
        </View>
        <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#94a3b8" 
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.dropdown}>
          <FlatList
            data={episodes}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderEpisodeItem}
            scrollEnabled={false} // Para que el ScrollView padre maneje el scroll
            contentContainerStyle={styles.listContent}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  header: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
    paddingLeft: 12,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeTrigger: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: '#8b5cf6',
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  dropdown: {
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#334155',
    maxHeight: 400, // Limitar altura si hay muchos episodios
    overflow: 'hidden',
  },
  listContent: {
    paddingVertical: 8,
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.5)',
  },
  selectedItem: {
    backgroundColor: '#8b5cf6',
  },
  episodeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  episodeText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
