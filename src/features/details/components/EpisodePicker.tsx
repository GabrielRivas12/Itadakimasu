import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Anime1VEpisode, buildImageProxyUrl } from '../../../../services/anime1v';

interface EpisodePickerProps {
  episodes: Anime1VEpisode[];
  currentEpisodeNumber: number | null;
  onEpisodePress: (episode: Anime1VEpisode) => void;
  onDownloadPress?: (episode: Anime1VEpisode) => void;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export const EpisodePicker: React.FC<EpisodePickerProps> = ({
  episodes,
  currentEpisodeNumber,
  onEpisodePress,
  onDownloadPress,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}) => {
  const renderEpisodeItem = (item: Anime1VEpisode, index: number) => {
    const isSelected = item.number === currentEpisodeNumber;

    const displayTitle = item.title && (
      item.title.toLowerCase().includes('episodio') ||
      item.title.toLowerCase().includes('capítulo') ||
      item.title.includes(String(item.number))
    ) ? item.title : `Episodio ${item.number}${item.title ? `: ${item.title}` : ''}`;

    const thumbnailUri = item.miniature ? buildImageProxyUrl(item.miniature) : null;

    return (
      <TouchableOpacity
        key={item.id?.toString() ?? `ep-${item.number}-${index}`}
        style={[
          styles.episodeItem,
          isSelected && styles.selectedItem,
          index < episodes.length - 1 && styles.itemDivider,
        ]}
        onPress={() => onEpisodePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.thumbnailWrap}>
          {thumbnailUri ? (
            <Image source={{ uri: thumbnailUri }} style={styles.thumbnail} resizeMode="cover" />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Ionicons name="film-outline" size={20} color="#475569" />
            </View>
          )}
          {isSelected && (
            <View style={styles.thumbnailOverlay}>
              <Ionicons name="play" size={18} color="#ffffff" />
            </View>
          )}
          <View style={styles.numberBadge}>
            <Text style={styles.numberBadgeText}>{item.number}</Text>
          </View>
        </View>

        <View style={styles.episodeInfo}>
          <Text
            style={[styles.episodeText, isSelected && styles.selectedText]}
            numberOfLines={2}
          >
            {displayTitle}
          </Text>
          {isSelected && (
            <Text style={styles.episodeMeta}>Reproduciendo</Text>
          )}
        </View>

        <View style={styles.episodeActions}>
          {onDownloadPress && Platform.OS !== 'web' && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                onDownloadPress(item);
              }}
              style={styles.downloadButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="download-outline"
                size={18}
                color={isSelected ? '#ffffff' : '#8b5cf6'}
              />
            </TouchableOpacity>
          )}
          <Ionicons
            name="chevron-forward"
            size={16}
            color={isSelected ? '#ffffff' : '#475569'}
          />
        </View>
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

    if (hasMore && onLoadMore) {
      return (
        <TouchableOpacity
          style={styles.loadMoreButton}
          onPress={onLoadMore}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={18} color="#a78bfa" />
          <Text style={styles.loadMoreText}>Cargar más episodios</Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  if (episodes.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Lista de Capítulos</Text>
        <Text style={styles.headerCount}>
          {episodes.length}
          {hasMore ? '+' : ''} episodios
        </Text>
      </View>

      <View style={styles.list}>
        {episodes.map((item, index) => renderEpisodeItem(item, index))}
      </View>

      {renderFooter()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  header: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
    paddingLeft: 12,
  },
  headerCount: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
  },
  selectedItem: {
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
  },
  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  thumbnailWrap: {
    width: 96,
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0b0f19',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    minWidth: 20,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  episodeInfo: {
    flex: 1,
  },
  episodeText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  episodeMeta: {
    color: '#c4b5fd',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  episodeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  downloadButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  loadingMoreText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8b5cf6',
    backgroundColor: '#161b2c',
  },
  loadMoreText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
