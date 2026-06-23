import React, { memo, useCallback } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Anime } from '../../../../services/anilist';
import { useResponsive } from '../../../hooks/useResponsive';

export function getSeasonLabel(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  let season: string;
  if (month >= 1 && month <= 3) season = 'Invierno';
  else if (month >= 4 && month <= 6) season = 'Primavera';
  else if (month >= 7 && month <= 9) season = 'Verano';
  else season = 'Otoño';
  return `${season} ${now.getFullYear()}`;
}

interface TrendingSeasonProps {
  trending: Anime[];
  onPress: (id: number) => void;
  onLoadMore?: () => void;
}

function WebTrendingSeason({ trending, onPress }: { trending: Anime[]; onPress: (id: number) => void }) {
  const router = useRouter();
  const { getColumns } = useResponsive();
  const columns = getColumns(2, 4, 4, 5);
  const display = trending.slice(0, columns * 2);

  return (
    <View style={styles.webContainer}>
      <View style={styles.webHeader}>
        <Text style={styles.sectionTitle}>Tendencias de temporada {getSeasonLabel()}</Text>
        <TouchableOpacity style={styles.verMasButton} onPress={() => router.push('/trending-season')}>
          <Text style={styles.verMasText}>Ver más</Text>
          <Ionicons name="chevron-forward" size={14} color="#8b5cf6" />
        </TouchableOpacity>
      </View>
      <View style={styles.webGrid}>
        {display.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.card, { width: `${100 / columns - 2}%` }]}
            onPress={() => onPress(item.id)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: item.coverImage.large }}
              style={styles.cardImage}
            />
            {item.averageScore && (
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>★ {(item.averageScore / 10).toFixed(1)}</Text>
              </View>
            )}
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title.romaji || item.title.english}
              </Text>
              <Text style={styles.cardEpisodeInfo}>
                {item.episodes ? `${item.episodes} episodios` : 'En emisión'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function MobileTrendingSeason({ trending, onPress, onLoadMore }: TrendingSeasonProps) {
  const handleScroll = useCallback((event: any) => {
    if (!onLoadMore) return;
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const threshold = contentSize.width - layoutMeasurement.width - 250;
    if (contentOffset.x >= threshold) {
      onLoadMore();
    }
  }, [onLoadMore]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={Platform.OS === 'web'}
      contentContainerStyle={styles.scrollContent}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      {trending.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.mobileCard}
          onPress={() => onPress(item.id)}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: item.coverImage.large }}
            style={styles.mobileImage}
          />
          {item.averageScore && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>★ {(item.averageScore / 10).toFixed(1)}</Text>
            </View>
          )}
          <View style={styles.mobileContent}>
            <Text style={styles.mobileTitle} numberOfLines={1}>
              {item.title.romaji || item.title.english}
            </Text>
            <Text style={styles.mobileEpisodeInfo}>
              {item.episodes ? `${item.episodes} episodios` : 'En emisión'}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

export const TrendingSeason = memo(function TrendingSeason(props: TrendingSeasonProps) {
  const { isWeb } = useResponsive();

  if (isWeb) {
    return <WebTrendingSeason trending={props.trending} onPress={props.onPress} />;
  }

  return <MobileTrendingSeason {...props} />;
});

const styles = StyleSheet.create({
  webContainer: {
    marginBottom: 8,
  },
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  verMasButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verMasText: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '600',
  },
  webGrid: {
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
  cardEpisodeInfo: {
    color: '#94a3b8',
    fontSize: 12,
  },
  scrollContent: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  mobileCard: {
    width: 155,
    marginRight: 12,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  mobileImage: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  mobileContent: {
    padding: 10,
  },
  mobileTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  mobileEpisodeInfo: {
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
