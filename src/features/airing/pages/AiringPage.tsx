import React, { useState, useEffect, memo } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { fetchAiringAnime, Anime } from '../../../../services/anilist';
import { AnimeGridCard } from '../../explore/components/AnimeGridCard';
import { ExploreLoading } from '../../explore/components/ExploreStates';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity as RNTouchableOpacity } from 'react-native';

export const AiringPage = memo(function AiringPage() {
  const router = useRouter();
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isAdult, setIsAdult] = useState(false);

  const loadAiring = async (pageNum: number, isInitial: boolean = false, adultFilter: boolean = isAdult) => {
    try {
      if (isInitial) {
        setLoading(true);
        setPage(1);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const data = await fetchAiringAnime(pageNum, 20, adultFilter);
      
      if (data) {
        if (isInitial) {
          setResults(data);
        } else {
          setResults(prev => [...prev, ...data]);
        }
        
        if (data.length < 20) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading airing anime:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadAiring(1, true, isAdult);
  }, [isAdult]);

  const toggleAdult = () => {
    setIsAdult(!isAdult);
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadAiring(nextPage, false, isAdult);
    }
  };

  const handleAnimePress = (id: number) => {
    router.push(`/anime/${id}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>En Emisión</Text>
            <Text style={styles.headerSubtitle}>
              {isAdult ? 'Contenido para Adultos' : 'Últimas actualizaciones'}
            </Text>
          </View>
          <RNTouchableOpacity 
            style={[styles.r18Button, isAdult && styles.r18ButtonActive]} 
            onPress={toggleAdult}
          >
            <Text style={[styles.r18Text, isAdult && styles.r18TextActive]}>R18</Text>
            <Ionicons 
              name={isAdult ? "eye" : "eye-off"} 
              size={18} 
              color={isAdult ? "#ffffff" : "#94a3b8"} 
            />
          </RNTouchableOpacity>
        </View>
      </View>

      {loading && results.length === 0 ? (
        <ExploreLoading />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <AnimeGridCard item={item} onPress={handleAnimePress} />
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => 
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#8b5cf6" />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 15,
    backgroundColor: '#0b0f19',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  r18Button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  r18ButtonActive: {
    backgroundColor: '#f43f5e',
    borderColor: '#fb7185',
  },
  r18Text: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  r18TextActive: {
    color: '#ffffff',
  },
  gridContent: {
    paddingHorizontal: 10,
    paddingBottom: 24,
    paddingTop: 8,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
