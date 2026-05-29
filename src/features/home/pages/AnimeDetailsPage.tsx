import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchAnimeDetails, Anime } from '../../../../services/anilist';
import { fetchSpanishSynopsisFromJikan, extractSourceAttribution } from '../../../../services/kitsu';
import {
  getAnimeStatus,
  addOrUpdateAnimeInList,
  removeAnimeFromList,
  UserListStatus,
  getAnimeProgress,
  updateAnimeProgress,
} from '../../../../services/animeList';
import { AnimeHeader } from '../components/AnimeHeader';
import { StatusSelector } from '../components/StatusSelector';
import { QuickStats } from '../components/QuickStats';
import { RelatedAnime } from '../components/RelatedAnime';
import { ProgressModal } from '../components/ProgressModal';
import { CharacterList } from '../components/CharacterList';
import { TechnicalSpecs } from '../components/TechnicalSpecs';
import { SkeletonLoader } from '../components/DetailsSkeleton';
import { getCachedAnimeDetails, cacheAnimeDetails } from '../../../../services/cache';

const cleanHtmlText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
};

export function AnimeDetailsPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [spanishSynopsis, setSpanishSynopsis] = useState<string | null>(null);
  const [synopsisSource, setSynopsisSource] = useState<string | null>(null);
  const [loadingSpanishSynopsis, setLoadingSpanishSynopsis] = useState(false);
  const [userStatus, setUserStatus] = useState<UserListStatus | null>(null);
  const [userProgress, setUserProgress] = useState<number>(0);
  const [showStatusSelector, setShowStatusSelector] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<UserListStatus | null>(null);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const animeId = typeof id === 'string' ? parseInt(id, 10) : Array.isArray(id) ? parseInt(id[0], 10) : null;

  useEffect(() => {
    if (animeId) {
      loadDetails(animeId);
    }
  }, [animeId]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [loading]);

  const loadDetails = async (id: number) => {
    try {
      setLoading(true);
      
      // 1. Obtener datos base y estados locales lo más rápido posible
      const [cachedAnime, status, progress] = await Promise.all([
        getCachedAnimeDetails(id),
        getAnimeStatus(id),
        getAnimeProgress(id),
      ]);

      if (cachedAnime) {
        setAnime(cachedAnime);
        // Si el caché ya tiene personajes y relaciones, no necesitamos bloquear con la red
        if (cachedAnime.characters?.edges && cachedAnime.relations?.edges) {
          setLoading(false);
        }
      }
      
      setUserStatus(status);
      setUserProgress(progress);

      // 2. Si tenemos idMal (del caché o de la lista), lanzamos la traducción
      let translationPromise: Promise<{ synopsis: string; source: string | null } | null> | null = null;
      if (cachedAnime?.idMal) {
        translationPromise = fetchSpanishSynopsisFromJikan(cachedAnime.idMal);
      }

      // 3. Solo llamar a la red si no hay caché o si al caché le falta info detallada
      if (!cachedAnime || !cachedAnime.characters || !cachedAnime.relations) {
        const details = await fetchAnimeDetails(id);
        
        if (details) {
          setAnime(details);
          await cacheAnimeDetails(id, details);
          
          if (details.idMal && (!cachedAnime || details.idMal !== cachedAnime.idMal)) {
            translationPromise = fetchSpanishSynopsisFromJikan(details.idMal);
          }
        }
      }

      // 4. Esperar traducción si existe
      if (translationPromise) {
        setLoadingSpanishSynopsis(true);
        try {
          const result = await translationPromise;
          if (result && result.synopsis.trim()) {
            setSpanishSynopsis(result.synopsis);
            setSynopsisSource(result.source);
          }
        } catch (error) {
          console.error('Error fetching synopsis:', error);
        } finally {
          setLoadingSpanishSynopsis(false);
        }
      }
    } catch (error) {
      console.error('Error loading anime details:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async (progress: number, isUpdate: boolean = false) => {
    if (!anime) return;
    
    let finalProgress = progress;
    if (selectedStatus === 'Terminado' && anime.episodes) {
      finalProgress = anime.episodes;
    }
    
    if (anime.episodes && finalProgress > anime.episodes) {
      finalProgress = anime.episodes;
    }
    
    if (isUpdate) {
      await updateAnimeProgress(anime.id, finalProgress);
      setUserProgress(finalProgress);
      Alert.alert('¡Éxito!', `Progreso actualizado a ${finalProgress}/${anime.episodes || '??'} episodios`);
    } else {
      await addOrUpdateAnimeInList(anime, selectedStatus!, finalProgress);
      setUserStatus(selectedStatus);
      setUserProgress(finalProgress);
      Alert.alert('¡Éxito!', `Anime agregado a tu lista como "${selectedStatus}" con ${finalProgress}/${anime.episodes || '??'} episodios`);
    }
    
    setShowProgressModal(false);
    setSelectedStatus(null);
    setShowStatusSelector(false);
    setIsUpdatingProgress(false);
  };

  const handleUpdateStatus = async (status: UserListStatus) => {
    if (!anime) return;
    
    if (status === 'En Proceso' || status === 'Terminado') {
      setSelectedStatus(status);
      setIsUpdatingProgress(false);
      setShowProgressModal(true);
    } else {
      await addOrUpdateAnimeInList(anime, status, 0);
      setUserStatus(status);
      setUserProgress(0);
      setShowStatusSelector(false);
      Alert.alert('¡Éxito!', `Anime agregado a tu lista como "${status}"`);
    }
  };

  const handleUpdateProgress = async () => {
    if (!anime || !userStatus) return;
    setSelectedStatus(userStatus);
    setIsUpdatingProgress(true);
    setShowProgressModal(true);
  };

  const handleRemove = async () => {
    if (!animeId) return;
    try {
      await removeAnimeFromList(animeId);
      setUserStatus(null);
      setUserProgress(0);
      setShowStatusSelector(false);
      Alert.alert('¡Eliminado!', 'Anime quitado de tu lista personal');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo eliminar el anime de tu lista');
    }
  };

  const handleAnimePress = (targetId: number) => {
    router.push(`/anime/${targetId}`);
  };

  const handleShare = async () => {
    if (!anime) return;
    try {
      await Share.share({
        message: `¡Mira este anime en AnimeLT! ${anime.title.english || anime.title.romaji}\nhttps://anilist.co/anime/${anime.id}`,
      });
    } catch (error) {
      console.error('Error sharing anime:', error);
    }
  };

  const cleanDescriptionObj = anime?.description
    ? extractSourceAttribution(cleanHtmlText(anime.description))
    : { cleanText: 'No hay descripción disponible para este anime.', source: null };

  const displaySynopsis = spanishSynopsis || cleanDescriptionObj.cleanText;
  const displaySource = spanishSynopsis ? synopsisSource : cleanDescriptionObj.source;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: loading ? 'Cargando...' : (anime?.title.english || anime?.title.romaji || 'Detalles'),
          headerTransparent: true,
          headerTintColor: '#ffffff',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerIconButton}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
          ),
          headerRight: () => (!loading && anime) ? (
            <TouchableOpacity onPress={handleShare} style={styles.headerIconButton}>
              <Ionicons name="share-social" size={22} color="#ffffff" />
            </TouchableOpacity>
          ) : null,
        }}
      />

      {loading ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <SkeletonLoader />
        </ScrollView>
      ) : !anime ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#f43f5e" />
          <Text style={styles.errorText}>No se pudo cargar la información</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Regresar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <AnimeHeader anime={anime} />

            <StatusSelector
              userStatus={userStatus}
              userProgress={userProgress}
              totalEpisodes={anime.episodes}
              showStatusSelector={showStatusSelector}
              setShowStatusSelector={setShowStatusSelector}
              onUpdateStatus={handleUpdateStatus}
              onUpdateProgress={handleUpdateProgress}
              onRemove={handleRemove}
            />

            <QuickStats
              averageScore={anime.averageScore}
              episodes={anime.episodes}
              status={anime.status || 'UNKNOWN'}
            />

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionHeader}>Sinopsis</Text>
              {loadingSpanishSynopsis ? (
                <View style={styles.synopsisLoading}>
                  <ActivityIndicator size="small" color="#8b5cf6" />
                  <Text style={styles.synopsisLoadingText}>Cargando sinopsis...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.synopsisText}>{displaySynopsis}</Text>
                  {displaySource && (
                    <Text style={styles.synopsisSourceText}>{displaySource}</Text>
                  )}
                </>
              )}
            </View>

            <CharacterList characters={anime.characters} />

            <RelatedAnime relations={anime.relations} onPress={handleAnimePress} />

            <TechnicalSpecs anime={anime} />
          </ScrollView>
        </Animated.View>
      )}

      {anime && (
        <ProgressModal
          visible={showProgressModal}
          animeTitle={anime.title.english || anime.title.romaji || ''}
          initialProgress={userProgress}
          totalEpisodes={anime.episodes || null}
          selectedStatus={selectedStatus}
          isUpdatingProgress={isUpdatingProgress}
          onClose={() => {
            setShowProgressModal(false);
            setSelectedStatus(null);
          }}
          onConfirm={(progress) => {
            saveProgress(progress, isUpdatingProgress);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginRight: 8,
    marginTop: Platform.OS === 'ios' ? 0 : 12,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
    paddingLeft: 12,
  },
  synopsisText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'justify',
  },
  synopsisSourceText: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'right',
  },
  synopsisLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  synopsisLoadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
});
