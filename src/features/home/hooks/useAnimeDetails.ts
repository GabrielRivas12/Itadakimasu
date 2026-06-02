import { useState, useEffect, useRef } from 'react';
import { Alert, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchAnimeDetails, Anime } from '../../../../services/anilist';
import { translateDescription } from '../../../../services/kitsu';
import {
  getAnimeStatus,
  addOrUpdateAnimeInList,
  removeAnimeFromList,
  UserListStatus,
  getAnimeProgress,
  updateAnimeProgress,
} from '../../../../services/animeList';
import { getCachedAnimeDetails, cacheAnimeDetails } from '../../../../services/cache';
import { 
  searchAnime1V, 
  getAnime1VInfo, 
  getAnime1VEpisodeLinks, 
  Anime1VEpisode, 
  Anime1VInfo,
} from '../../../../services/anime1v';
import { SearchResult } from '../types/animeDetails';
import { 
  normalizeTitleStrict, 
  buildSearchQueriesStrict, 
  calculateMatchScoreStrict 
} from '../utils/animeMatching';

export const useAnimeDetails = () => {
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
  const [matchingAttempted, setMatchingAttempted] = useState(false);
  
  // Pagination states para episodios
  const [displayedEpisodes, setDisplayedEpisodes] = useState<Anime1VEpisode[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreEpisodes, setHasMoreEpisodes] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const EPISODES_PER_PAGE = 50;

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const animeId = typeof id === 'string' ? parseInt(id, 10) : Array.isArray(id) ? parseInt(id[0], 10) : null;

  useEffect(() => {
    if (animeId) {
      loadDetails(animeId);
    }
  }, [animeId]);

  useEffect(() => {
    if (anime && !anime1VInfo && !contentNotAvailable && !matchingAttempted) {
      searchAndLoadAnime1V();
    }
  }, [anime]);

  // Inicializar displayedEpisodes cuando se carga anime1VInfo
  useEffect(() => {
    if (anime1VInfo && anime1VInfo.episodes) {
      const initialEpisodes = anime1VInfo.episodes.slice(0, EPISODES_PER_PAGE);
      setDisplayedEpisodes(initialEpisodes);
      setCurrentPage(1);
      setHasMoreEpisodes(anime1VInfo.episodes.length > EPISODES_PER_PAGE);
    }
  }, [anime1VInfo]);

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
      
      const [cachedAnime, status, progress] = await Promise.all([
        getCachedAnimeDetails(id),
        getAnimeStatus(id),
        getAnimeProgress(id),
      ]);

      let currentAnime = cachedAnime;

      if (cachedAnime) {
        setAnime(cachedAnime);
        if (cachedAnime.characters?.edges && cachedAnime.relations?.edges) {
          setLoading(false);
        }
      }
      
      setUserStatus(status);
      setUserProgress(progress);

      if (!cachedAnime || !cachedAnime.characters || !cachedAnime.relations) {
        const details = await fetchAnimeDetails(id);
        
        if (details) {
          setAnime(details);
          currentAnime = details;
          await cacheAnimeDetails(id, details);
        }
      }

      if (currentAnime?.description) {
        setLoadingSpanishSynopsis(true);
        try {
          const result = await translateDescription(currentAnime.description);
          if (result && result.synopsis.trim()) {
            setSpanishSynopsis(result.synopsis);
            setSynopsisSource(result.source);
          }
        } catch (error) {
          console.error('Error translating synopsis:', error);
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


  const loadMoreEpisodes = async () => {
    if (!anime1VInfo || !hasMoreEpisodes || isLoadingMore) return;
    
    setIsLoadingMore(true);
    
    try {
      const nextPage = currentPage + 1;
      const endIndex = nextPage * EPISODES_PER_PAGE;
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (anime1VInfo.episodes.length > endIndex) {
        const newEpisodes = anime1VInfo.episodes.slice(0, endIndex);
        setDisplayedEpisodes(newEpisodes);
        setCurrentPage(nextPage);
        setHasMoreEpisodes(anime1VInfo.episodes.length > endIndex);
      } else {
        setDisplayedEpisodes(anime1VInfo.episodes);
        setHasMoreEpisodes(false);
      }
    } catch (error) {
      console.error('Error loading more episodes:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const searchAndLoadAnime1V = async () => {
    if (!anime) return;
    
    setMatchingAttempted(true);

    try {
      setContentNotAvailable(false);

      const domain = anime.isAdult ? "hentaila" : undefined;

      // Usar Romaji como prioridad máxima para el matching
      const mainTitle = anime.title.romaji || anime.title.english || '';
      const animeNormalized = normalizeTitleStrict(mainTitle);
      
      if (animeNormalized.significantWords.length === 0 && mainTitle.length < 3) {
        setContentNotAvailable(true);
        return;
      }
      
      const queries = buildSearchQueriesStrict(anime);
      
      let bestMatch: SearchResult | null = null;
      let bestMatchInfo: Anime1VInfo | null = null;

      for (const query of queries) {
        // Evitar queries que puedan romper el backend (muy cortas o vacías)
        if (!query || query.trim().length < 3) continue;

        const results = await searchAnime1V(query, domain);
        
        if (results && results.length > 0) {
          for (const result of results) {
            const resultNormalized = normalizeTitleStrict(result.title);
            const matchResult = calculateMatchScoreStrict(animeNormalized, resultNormalized);
            
            if (matchResult.matched) {
              // Si es un match aceptable, verificamos info detallada
              const info = await getAnime1VInfo(result.url, 999);
              
              if (info && info.episodes && info.episodes.length > 0) {
                const infoNormalized = normalizeTitleStrict(info.title);
                const finalMatch = calculateMatchScoreStrict(animeNormalized, infoNormalized);
                
                // Umbral más permisivo (0.5) para asegurar que encontramos el contenido
                if (finalMatch.matched && finalMatch.score >= 0.5) {
                  const candidateScore = finalMatch.score;
                  
                  if (!bestMatch || candidateScore > bestMatch.score) {
                    bestMatch = {
                      item: result,
                      score: candidateScore,
                      matchType: finalMatch.matchType
                    };
                    bestMatchInfo = info;
                  }
                }
              }
            }
          }
          
          // Si encontramos un match muy bueno (exacto o casi exacto), no seguimos buscando
          if (bestMatch && bestMatch.score >= 0.85) {
            break;
          }
        }
      }

      // Validar si encontramos algo con un mínimo de confianza
      if (!bestMatch || !bestMatchInfo || bestMatch.score < 0.45) {
        console.log(`No valid match found for: ${mainTitle}`);
        setContentNotAvailable(true);
        return;
      }

      setAnime1VInfo(bestMatchInfo);

      const initialIndex = userProgress > 0 && userProgress <= bestMatchInfo.episodes.length
        ? userProgress - 1
        : 0;

      const episode = bestMatchInfo.episodes[initialIndex];
      if (episode) {
        handleEpisodeSelect(episode);
      }
      
    } catch (error) {
      console.error("Error loading Anime1V data:", error);
      setContentNotAvailable(true);
    }
  };

  const handleEpisodeSelect = async (episode: Anime1VEpisode) => {
    setCurrentEpisode(episode);
    setLoadingStream(true);
    setStreamUrl(null);
    
    try {
      if (anime && userStatus) {
        await updateAnimeProgress(anime.id, episode.number);
        setUserProgress(episode.number);
      }

      const links = await getAnime1VEpisodeLinks(episode.url);
      if (links && links.streamLinks.SUB && links.streamLinks.SUB.length > 0) {
        const hlsServer = links.streamLinks.SUB.find(s => s.server === 'HLS');
        setStreamUrl(hlsServer ? hlsServer.url : links.streamLinks.SUB[0].url);
      }
    } catch (error) {
      console.error('Error fetching stream links:', error);
    } finally {
      setLoadingStream(false);
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

  return {
    anime,
    loading,
    spanishSynopsis,
    synopsisSource,
    loadingSpanishSynopsis,
    userStatus,
    userProgress,
    showStatusSelector,
    setShowStatusSelector,
    showProgressModal,
    setShowProgressModal,
    selectedStatus,
    setSelectedStatus,
    isUpdatingProgress,
    anime1VInfo,
    currentEpisode,
    streamUrl,
    loadingStream,
    contentNotAvailable,
    displayedEpisodes,
    hasMoreEpisodes,
    isLoadingMore,
    fadeAnim,
    loadMoreEpisodes,
    handleEpisodeSelect,
    saveProgress,
    handleUpdateStatus,
    handleUpdateProgress,
    handleRemove,
  };
};
