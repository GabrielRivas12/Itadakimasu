import React, { memo } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, DimensionValue } from 'react-native';
import { buildImageProxyUrl } from '../../../../services/anime1v';
import { ExploreSpcItem } from '../types/exploreSpc';

interface AnimeSpcGridCardProps {
  item: ExploreSpcItem;
  onPress: (item: ExploreSpcItem) => void;
  width?: DimensionValue;
}

export const AnimeSpcGridCard = memo(function AnimeSpcGridCard({ item, onPress, width }: AnimeSpcGridCardProps) {
  const score = 'score' in item && item.score != null ? item.score : null;
  const year = 'year' in item && item.year ? item.year : null;

  return (
    <TouchableOpacity
      style={[styles.card, width ? { width } : null]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      {item.image && (
        <Image
          source={{ uri: buildImageProxyUrl(item.image) }}
          style={styles.cardImage}
        />
      )}
      <View style={styles.cardBadge}>
        <Text style={styles.cardBadgeText}>{String(item.type)}</Text>
      </View>
      {score != null && (
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>★ {score.toFixed(1)}</Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {year && (
          <Text style={styles.cardYear}>{year}</Text>
        )}
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
    color: '#38bdf8',
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
  cardContent: {
    padding: 10,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardYear: {
    color: '#64748b',
    fontSize: 12,
  },
});