import React, { memo } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, DimensionValue } from 'react-native';
import { buildImageProxyUrl } from '../../../../services/anime1v';
import { AiringSpcItem } from '../types/airingSpc';
import { getTimeAgo } from '../utils/time';

interface AiringSpcGridCardProps {
  item: AiringSpcItem;
  onPress: (item: AiringSpcItem) => void;
  width?: DimensionValue;
}

export const AiringSpcGridCard = memo(function AiringSpcGridCard({ item, onPress, width }: AiringSpcGridCardProps) {
  const timeAgo = item.timestamp ? getTimeAgo(item.timestamp) : null;

  return (
    <TouchableOpacity
      style={[styles.card, width ? { width } : null]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.imageWrapper}>
        {item.image && (
          <Image
            source={{ uri: buildImageProxyUrl(item.image) }}
            style={styles.cardImage}
          />
        )}
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>EP {item.episode}</Text>
        </View>
        {timeAgo && (
          <View style={styles.timeBadge}>
            <Text style={styles.timeBadgeText}>{timeAgo}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {item.dateLabel && (
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>{item.dateLabel}</Text>
          </View>
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
});