import React, { memo } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { Anime } from '../../../../services/anilist';
import { useResponsive } from '../../../hooks/useResponsive';

interface TrendingGridProps {
  trending: Anime[];
  onPress: (id: number) => void;
}

export const TrendingGrid = memo(function TrendingGrid({ trending, onPress }: TrendingGridProps) {
  const { getColumns } = useResponsive();
  const columns = getColumns(2, 3, 4, 5);

  return (
    <View style={styles.trendingGrid}>
      {trending.map((item, index) => (
        <TouchableOpacity
          key={`${item.id}-${index}`}
          style={[styles.trendingCard, { width: `${100 / columns - 2}%` }]}
          onPress={() => onPress(item.id)}
        >
          <Image source={{ uri: item.coverImage.large }} style={styles.trendingImage} />
          {item.averageScore && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>★ {(item.averageScore / 10).toFixed(1)}</Text>
            </View>
          )}
          <View style={styles.trendingContent}>
            <Text style={styles.trendingTitle} numberOfLines={1}>
              {item.title.romaji || item.title.english}
            </Text>
            <Text style={styles.trendingEpisode}>
              {item.episodes ? `${item.episodes} Episodios` : 'En emisión'}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  trendingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    justifyContent: 'flex-start',
  },
  trendingCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginHorizontal: '1%',
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
  },
  trendingImage: {
    width: '100%',
    height: 240,
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: 'bold',
  },
  trendingContent: {
    padding: 10,
  },
  trendingTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  trendingEpisode: {
    color: '#94a3b8',
    fontSize: 12,
  },
});
