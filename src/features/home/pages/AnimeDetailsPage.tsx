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
import { 
  searchAnime1V, 
  getAnime1VInfo, 
  getAnime1VEpisodeLinks, 
  Anime1VEpisode, 
  Anime1VInfo,
  Anime1VStreamLink 
} from '../../../../services/anime1v';
import { EpisodePlayer } from '../components/EpisodePlayer';
import { EpisodePicker } from '../components/EpisodePicker';

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

  // Anime1V states
  const [anime1VInfo, setAnime1VInfo] = useState<Anime1VInfo | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Anime1VEpisode | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loadingStream, setLoadingStream] = useState(false);
  const [contentNotAvailable, setContentNotAvailable] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const animeId = typeof id === 'string' ? parseInt(id, 10) : Array.isArray(id) ? parseInt(id[0], 10) : null;

  useEffect(() => {
    if (animeId) {
      loadDetails(animeId);
    }
  }, [animeId]);

  useEffect(() => {
    if (anime && !anime1VInfo && !contentNotAvailable) {
      searchAndLoadAnime1V();
    }
  }, [anime]);

 const normalizeTitle = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// 🔥 scoring real de similitud (keyword overlap)
const similarityScore = (a: string, b: string) => {
  const aWords = normalizeTitle(a).split(' ');
  const bWords = normalizeTitle(b).split(' ');

  if (aWords.length === 0 || bWords.length === 0) return 0;

  const matches = aWords.filter(w => bWords.includes(w)).length;

  return matches / Math.max(aWords.length, bWords.length);
};

// 🔥 genera variantes de búsqueda
const buildSearchQueries = (anime: any): string[] => {
  const titles = [anime.title.romaji, anime.title.english]
    .filter(Boolean) as string[];

  const queries: string[] = [];

  for (const t of titles) {
    const clean = normalizeTitle(t);

    queries.push(t); // original
    queries.push(clean); // limpio
    queries.push(clean.split(' ').slice(0, 4).join(' ')); // corto
    queries.push(clean.split(' ')[0]); // keyword base
  }

  return [...new Set(queries)]; // remove duplicates
};

const searchAndLoadAnime1V = async () => {
  if (!anime) return;

  try {
    setContentNotAvailable(false);

    const domain = anime.isAdult ? 'hentaila' : undefined;

    const queries = buildSearchQueries(anime);

    let allResults: any[] = [];

    // 🔥 1. probar múltiples queries
    for (const q of queries) {
      const res = await searchAnime1V(q, domain);
      if (res?.length) {
        allResults = res;
        break;
      }
    }

    if (!allResults.length) {
      setContentNotAvailable(true);
      return;
    }

    // 🔥 2. scoring de resultados (MEJOR PARTE)
    const scored = allResults.map(r => {
      const score = Math.max(
        ...queries.map(q => similarityScore(q, r.title))
      );

      return { item: r, score };
    });

    // 🔥 3. ordenar por mejor match
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];

    // 🔥 4. threshold de seguridad (evita falsos positivos)
    if (!best || best.score < 0.25) {
      setContentNotAvailable(true);
      return;
    }

    const bestMatch = best.item;

    const info = await getAnime1VInfo(bestMatch.url);

    if (!info || !info.episodes?.length) {
      setContentNotAvailable(true);
      return;
    }

    setAnime1VInfo(info);

    // 🔥 5. seleccionar episodio inicial seguro
    const initialIndex =
      userProgress > 0 && userProgress <= info.episodes.length
        ? userProgress - 1
        : 0;

    const episode = info.episodes[initialIndex];

    if (episode) {
      handleEpisodeSelect(episode);
    }

  } catch (error) {
    console.error('Error loading Anime1V data:', error);
    setContentNotAvailable(true);
  }
};

  const handleEpisodeSelect = async (episode: Anime1VEpisode) => {
    setCurrentEpisode(episode);
    setLoadingStream(true);
    setStreamUrl(null);
    
    try {
      // Sincronizar progreso con la lista del usuario
      if (anime && userStatus) {
        await updateAnimeProgress(anime.id, episode.number);
        setUserProgress(episode.number);
      }

      const links = await getAnime1VEpisodeLinks(episode.url);
      if (links && links.streamLinks.SUB && links.streamLinks.SUB.length > 0) {
        // Preferir servidor HLS o el primero disponible
        const hlsServer = links.streamLinks.SUB.find(s => s.server === 'HLS');
        setStreamUrl(hlsServer ? hlsServer.url : links.streamLinks.SUB[0].url);
      }
    } catch (error) {
      console.error('Error fetching stream links:', error);
    } finally {
      setLoadingStream(false);
    }
  };

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

            {contentNotAvailable ? (
              <View style={styles.notAvailableContainer}>
                <Ionicons name="videocam-off-outline" size={32} color="#64748b" />
                <Text style={styles.notAvailableText}>Este contenido no está disponible actualmente.</Text>
              </View>
            ) : anime1VInfo && (
              <View style={styles.playerSection}>
                <Text style={styles.sectionHeader}>
                  {currentEpisode ? `Reproduciendo: ${currentEpisode.title}` : 'Reproductor'}
                </Text>
                <EpisodePlayer url={streamUrl} />
                <EpisodePicker
                  episodes={anime1VInfo.episodes}
                  currentEpisodeNumber={currentEpisode?.number || null}
                  onEpisodePress={handleEpisodeSelect}
                />
              </View>
            )}

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
  playerSection: {
    marginBottom: 24,
  },
  streamLoader: {
    marginVertical: 10,
  },
  notAvailableContainer: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  notAvailableText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
