import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, LayoutAnimation, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Anime1VEpisode } from '../../../../services/anime1v';

interface EpisodePickerProps {
  episodes: Anime1VEpisode[];
  currentEpisodeNumber: number | null;
  onEpisodePress: (episode: Anime1VEpisode) => void;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export const EpisodePicker: React.FC<EpisodePickerProps> = ({
  episodes,
  currentEpisodeNumber,
  onEpisodePress,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
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

  const handleLoadMore = () => {
    if (onLoadMore && hasMore && !isLoadingMore) {
      onLoadMore();
    }
  };

  const handleScroll = ({ nativeEvent }: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const isNearBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 80;
    if (isNearBottom) handleLoadMore();
  };

  const renderEpisodeItem = (item: Anime1VEpisode, index: number) => {
    const isSelected = item.number === currentEpisodeNumber;
    
    const displayTitle = item.title && (
      item.title.toLowerCase().includes('episodio') || 
      item.title.toLowerCase().includes('capítulo') ||
      item.title.includes(String(item.number))
    ) ? item.title : `Episodio ${item.number}${item.title ? `: ${item.title}` : ''}`;

    return (
      <TouchableOpacity
        key={item.id?.toString() ?? `ep-${item.number}-${index}`}
        style={[styles.episodeItem, isSelected && styles.selectedItem]}
        onPress={() => handleEpisodeSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.episodeInfo}>
          <Text 
            style={[styles.episodeText, isSelected && styles.selectedText]} 
            numberOfLines={1}
          >
            {displayTitle}
          </Text>
          {isSelected && <Ionicons name="play" size={14} color="#ffffff" style={{ marginLeft: 8 }} />}
        </View>
        <Ionicons name="chevron-forward" size={16} color={isSelected ? "#ffffff" : "#475569"} />
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingMore}>
          <ActivityIndicator size="small" color="#8b5cf6" />
          <Text style={styles.loadingMoreText}>Cargando más episodios...</Text>
        </View>
      );
    }

    if (!hasMore && episodes.length > 0) {
      return (
        <View style={styles.endMessage}>
          <Text style={styles.endMessageText}>
            Total: {episodes.length} episodios
          </Text>
        </View>
      );
    }

    return null;
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
            {currentEpisodeNumber
              ? `Viendo: Episodio ${currentEpisodeNumber}`
              : `Seleccionar Episodio (${episodes.length}${hasMore ? '+' : ''})`}
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
          <ScrollView
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
            style={styles.scrollList}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {episodes.map((item, index) => renderEpisodeItem(item, index))}
            {renderFooter()}
          </ScrollView>
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
    flex: 1,
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
    flex: 1,
  },
  dropdown: {
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#334155',
    maxHeight: 400,
  },
  scrollList: {
    maxHeight: 400,
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  episodeText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '500',
  },
  episodeTitle: {
    color: '#64748b',
    fontSize: 12,
    flex: 1,
  },
  selectedText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  loadingMoreText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  endMessage: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  endMessageText: {
    color: '#64748b',
    fontSize: 12,
  },
});