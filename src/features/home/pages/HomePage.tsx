import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { fetchTrendingAnime, fetchPopularAnime, Anime } from '../../../../services/anilist';
import { FeaturedBanner } from '../components/FeaturedBanner';
import { SectionHeader } from '../components/SectionHeader';
import { ContinueWatching } from '../components/ContinueWatching';
import { TrendingGrid } from '../components/TrendingGrid';

interface ContinueAnime extends Anime {
  mockProgress: number;
  mockEpisode: string;
}

export function HomePage() {
  const router = useRouter();
  const [trending, setTrending] = useState<Anime[]>([]);
  const [popular, setPopular] = useState<ContinueAnime[]>([]);
  const [featured, setFeatured] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [trendingData, popularData] = await Promise.all([
        fetchTrendingAnime(1, 10),
        fetchPopularAnime(1, 10),
      ]);

      setTrending(trendingData);
      
      if (trendingData.length > 0) {
        setFeatured(trendingData[0]);
      }

      const popularWithProgress: ContinueAnime[] = popularData.slice(0, 5).map((item, index) => {
        const progressValues = [0.75, 0.4, 0.95, 0.2, 0.6];
        const episodeValues = ['Episodio 4', 'Episodio 21', 'Episodio 2', 'Episodio 8', 'Episodio 12'];
        return {
          ...item,
          mockProgress: progressValues[index % progressValues.length],
          mockEpisode: episodeValues[index % episodeValues.length],
        };
      });
      setPopular(popularWithProgress);
    } catch (error) {
      console.error('Error loading AnimeLT home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAnimePress = (id: number) => {
    router.push(`/anime/${id}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Cargando AnimeLT...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
        }
      >
        {featured && (
          <FeaturedBanner featured={featured} onPress={handleAnimePress} />
        )}

        {popular.length > 0 && (
          <>
            <SectionHeader title="Continuar Viendo" onSeeAll={() => {}} />
            <ContinueWatching popular={popular} onPress={handleAnimePress} />
          </>
        )}

        <SectionHeader title="Tendencias de la Semana" />
        <TrendingGrid trending={trending} onPress={handleAnimePress} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: 24,
  },
});
