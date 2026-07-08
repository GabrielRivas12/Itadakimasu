import React, { memo } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, DimensionValue } from 'react-native';
import { AnimeWithEpisode } from '../types/airing';
import { getTimeAgo } from '../utils/time';

interface AiringGridCardProps {
  item: AnimeWithEpisode;
  onPress: (id: number) => void;
  width?: DimensionValue;
}

export const AiringGridCard = memo(function AiringGridCard({ item, onPress, width }: AiringGridCardProps) {
  const { anime, episode, dateLabel, timestamp } = item;
  const timeAgo = timestamp ? getTimeAgo(timestamp) : null;

  return (
    <TouchableOpacity
      style={[styles.card, width ? { width } : null]}
      onPress={() => onPress(anime.id)}
    >
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: anime.coverImage.large }}
          style={styles.cardImage}
        />
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>EP {episode}</Text>
        </View>
        {anime.averageScore && (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>★ {(anime.averageScore / 10).toFixed(1)}</Text>
          </View>
        )}
        {timeAgo && (
          <View style={styles.timeBadge}>
            <Text style={styles.timeBadgeText}>{timeAgo}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {anime.title.romaji || anime.title.english}
        </Text>
        {dateLabel && (
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>{dateLabel}</Text>
          </View>
        )}
        <View style={styles.genreTagsContainer}>
          {anime.genres.slice(0, 2).map((g) => (
            <View key={g} style={styles.genreTag}>
              <Text style={styles.genreTagText}>{g}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginHorizontal: '1%',
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
  },
  imageWrapper: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  cardBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardBadgeText: {
    color: '#f97316',
    fontSize: 10,
    fontWeight: 'bold',
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
  timeBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeBadgeText: {
    color: '#a78bfa',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardContent: {
    padding: 10,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dateRow: {
    marginBottom: 4,
  },
  dateLabel: {
    color: '#22d3ee',
    fontSize: 11,
    fontWeight: '600',
  },
  genreTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  genreTag: {
    backgroundColor: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 2,
  },
  genreTagText: {
    color: '#cbd5e1',
    fontSize: 10,
  },
});
