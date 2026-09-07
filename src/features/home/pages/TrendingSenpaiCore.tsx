import React, { memo } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { CatalogAnime, buildImageProxyUrl } from '../../../../services/anime1v';
import { useResponsive } from '../../../hooks/useResponsive';

interface TrendingSenpaiCoreProps {
  catalog: CatalogAnime[];
  title?: string;
  onPress?: (item: CatalogAnime) => void;
}

function getCardSubtitle(item: CatalogAnime): string {
  return [item.type, item.year, item.status].filter(Boolean).join(' • ');
}

export const TrendingSenpaiCore = memo(function TrendingSenpaiCore({
  catalog,
  title = 'Catálogo',
  onPress,
}: TrendingSenpaiCoreProps) {
  const { getColumns } = useResponsive();
  const columns = getColumns(2, 3, 4, 6);

  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.grid}>
        {catalog.map((item) => (
          <TouchableOpacity
            key={String(item.id)}
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
              <Text style={styles.cardSubtitle}>{getCardSubtitle(item)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
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
  cardSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
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