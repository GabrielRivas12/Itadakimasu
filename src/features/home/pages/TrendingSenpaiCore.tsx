import React, { memo } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { TrendingAnime, buildImageProxyUrl } from '../../../../services/anime1v';
import { useResponsive } from '../../../hooks/useResponsive';

interface TrendingSenpaiCoreProps {
  trending: TrendingAnime[];
  onPress?: (item: TrendingAnime) => void;
}

function getStatusColor(status: string | null): string {
  if (!status) return '#64748b';
  const lower = status.toLowerCase();
  if (lower.includes('emisión') || lower.includes('emision') || lower.includes('airing')) return '#a78bfa';
  if (lower.includes('finalizado') || lower.includes('completed') || lower.includes('finished')) return '#94a3b8';
  if (lower.includes('próximamente') || lower.includes('upcoming')) return '#f59e0b';
  return '#64748b';
}

export const TrendingSenpaiCore = memo(function TrendingSenpaiCore({
  trending,
  onPress,
}: TrendingSenpaiCoreProps) {
  const { getColumns } = useResponsive();
  const columns = getColumns(2, 3, 4, 6);

  return (
    <View>
      <View style={styles.grid}>
        {trending.map((item) => (
          <TouchableOpacity
            key={item.url ?? item.title}
            style={[styles.card, { width: `${100 / columns - 2}%` }]}
            onPress={() => onPress?.(item)}
            activeOpacity={0.8}
          >
            {item.image && (
              <Image source={{ uri: buildImageProxyUrl(item.image) }} style={styles.cardImage} />
            )}
            {!!item.score && (
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>★ {item.score.toFixed(1)}</Text>
              </View>
            )}
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.cardType}>
                {[item.type, item.year].filter(Boolean).join(' • ')}
              </Text>
              {item.status && (
                <View style={styles.statusBadge}>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]} numberOfLines={1}>
                    {item.status}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    justifyContent: 'flex-start',
  },
  card: {
    marginHorizontal: '1%',
    marginBottom: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 2 / 3,
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
  cardType: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
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
});