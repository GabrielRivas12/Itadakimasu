import { useState, useEffect, useRef } from 'react';
import { Alert, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchAnimeDetails, Anime } from '../../../../services/anilist';
import { translateDescription } from '../../../../services/kitsu';
import {
  getUserList,
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
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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
      console.log(`[DEBUG] loadDetails START para id: ${id}`);
      setLoading(true);
      
      // Llamamos a getUserList una sola vez para eficiencia
      const [cachedAnime, userList] = await Promise.all([
        getCachedAnimeDetails(id),
        getUserList(),
      ]);

      console.log(`[DEBUG] userList cargada, tamaño: ${userList?.length || 0}`);

      // Buscar el item en la lista del usuario (usando comparación robusta de strings)
      const userItem = userList?.find(item => String(item.anime?.id) === String(id));
      
      if (userItem) {
        console.log(`[DEBUG] Encontrado item en la lista del usuario: status=${userItem.status}, progress=${userItem.progress}`);
      } else {
        console.log(`[DEBUG] No se encontró el id ${id} en la lista del usuario`);
      }

      const status = userItem ? userItem.status : null;
      const progress = userItem ? userItem.progress : 0;

      let currentAnime = cachedAnime;

      // FALLBACK: Si no hay cache de detalles pero está en la lista del usuario, 
      // usamos ese objeto para que la búsqueda de episodios inicie ya mismo.
      if (!currentAnime && userItem?.anime) {
        console.log(`[DEBUG] Usando anime de userItem como fallback para búsqueda de episodios`);
        setAnime(userItem.anime);
        currentAnime = userItem.anime;
      }

      if (cachedAnime) {
        console.log(`[DEBUG] Usando cachedAnime para la vista inicial`);
        setAnime(cachedAnime);
        // Quitamos loading si ya tenemos cache (evita parpadeo de Skeleton)
        setLoading(false);
      }
      
      setUserStatus(status);
      setUserProgress(progress);

      // Si no tenemos la info completa (personajes/relaciones), la buscamos
      if (!currentAnime || !currentAnime.characters || !currentAnime.relations) {
        console.log(`[DEBUG] Buscando detalles completos en AniList...`);
        const details = await fetchAnimeDetails(id);
        
        if (details) {
          console.log(`[DEBUG] Detalles de AniList obtenidos con éxito: ${details.title?.romaji}`);
          setAnime(details);
          currentAnime = details;
          await cacheAnimeDetails(id, details);
        } else {
          console.log(`[DEBUG] No se pudieron obtener detalles de AniList`);
        }
      }

      // Asegurarnos de que el loading se quite
      if (currentAnime) {
        setLoading(false);
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
          console.error('[DEBUG] Error traduciendo sinopsis:', error);
        } finally {
          setLoadingSpanishSynopsis(false);
        }
      }
    } catch (error) {
      console.error('[DEBUG] Error en loadDetails:', error);
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
    if (!anime || matchingAttempted) return;
    
    console.log(`[DEBUG] searchAndLoadAnime1V START para: ${anime.title?.romaji}`);
    setMatchingAttempted(true);

    try {
      setContentNotAvailable(false);

      const domain = anime.isAdult ? "hentaila" : undefined;
      const mainTitle = anime.title?.romaji || anime.title?.english || anime.title?.native || '';
      
      if (mainTitle.length < 2) {
        console.log(`[DEBUG] Título demasiado corto para buscar: "${mainTitle}"`);
        setContentNotAvailable(true);
        return;
      }

      const animeNormalized = normalizeTitleStrict(mainTitle);
      const queries = buildSearchQueriesStrict(anime);
      console.log(`[DEBUG] Queries de búsqueda: ${JSON.stringify(queries)}`);
      
      let bestMatch: SearchResult | null = null;
      let bestMatchInfo: Anime1VInfo | null = null;

      // Limitamos el tiempo total de búsqueda para no quedarnos pegados
      const searchStartTime = Date.now();
      const MAX_SEARCH_TIME = 20000; // 20 segundos máximo para el debug

      for (const query of queries) {
        if (Date.now() - searchStartTime > MAX_SEARCH_TIME) {
          console.log(`[DEBUG] Timeout de búsqueda alcanzado (${MAX_SEARCH_TIME}ms)`);
          break;
        }
        if (!query || query.trim().length < 2) continue;

        console.log(`[DEBUG] Ejecutando búsqueda API para: "${query}"`);
        const results = await searchAnime1V(query, domain);
        
        if (results && results.length > 0) {
          console.log(`[DEBUG] API retornó ${results.length} resultados para "${query}"`);
          
          for (const result of results) {
            const resultNormalized = normalizeTitleStrict(result.title);
            const matchResult = calculateMatchScoreStrict(animeNormalized, resultNormalized);
            
            console.log(`[DEBUG] Comparando: "${result.title}" | Score: ${matchResult.score.toFixed(3)} | Matched: ${matchResult.matched}`);

            if (matchResult.matched || matchResult.score > 0.1) {
              // Usamos un límite razonable basado en los episodios que conocemos de AniList
              const limitHint = anime.episodes ? Math.max(anime.episodes + 10, 50) : 500;
              console.log(`[DEBUG] Obteniendo info de episodios para "${result.title}" (limit: ${limitHint})`);
              const info = await getAnime1VInfo(result.url, limitHint);
              
              if (info && info.episodes && info.episodes.length > 0) {
                const infoNormalized = normalizeTitleStrict(info.title);
                const finalMatch = calculateMatchScoreStrict(animeNormalized, infoNormalized);
                
                console.log(`[DEBUG] Score final con info detallada: ${finalMatch.score.toFixed(3)}`);

                if (finalMatch.matched && finalMatch.score >= 0.25) {
                  if (!bestMatch || finalMatch.score > bestMatch.score) {
                    bestMatch = {
                      item: result,
                      score: finalMatch.score,
                      matchType: finalMatch.matchType
                    };
                    bestMatchInfo = info;
                    console.log(`[DEBUG] Nuevo mejor match encontrado: "${info.title}"`);
                  }
                  // Si es casi perfecto, paramos de buscar en este query
                  if (finalMatch.score >= 0.9) break;
                }
              } else {
                console.log(`[DEBUG] Info de episodes vacía o nula para "${result.title}"`);
              }
            }
          }
          // Si encontramos algo muy bueno, no probamos más queries
          if (bestMatch && bestMatch.score >= 0.8) break;
        } else {
          console.log(`[DEBUG] Sin resultados para query "${query}"`);
        }
      }

      if (!bestMatch || !bestMatchInfo) {
        console.log(`[DEBUG] searchAndLoadAnime1V END: No se encontró match`);
        setContentNotAvailable(true);
        return;
      }

      console.log(`[DEBUG] Match final aceptado: "${bestMatchInfo.title}" (Score: ${bestMatch.score.toFixed(3)})`);
      setAnime1VInfo(bestMatchInfo);

      const initialIndex = userProgress > 0 && userProgress <= bestMatchInfo.episodes.length
        ? userProgress - 1
        : 0;

      const episode = bestMatchInfo.episodes[initialIndex];
      if (episode) {
        console.log(`[DEBUG] Seleccionando episodio inicial: ${episode.number}`);
        handleEpisodeSelect(episode, false);
      }
      
    } catch (error) {
      console.error("[DEBUG] Error en searchAndLoadAnime1V flow:", error);
      setContentNotAvailable(true);
    }
  };

  const handleEpisodeSelect = async (episode: Anime1VEpisode, isManual = false) => {
    setCurrentEpisode(episode);
    setLoadingStream(true);
    setStreamUrl(null);
    
    try {
      if (anime && (isManual || userStatus)) {
        const isLastEpisode = anime.episodes ? episode.number >= anime.episodes : (anime1VInfo?.episodes?.length ? episode.number >= anime1VInfo.episodes.length : false);
        const newStatus = isLastEpisode ? 'Terminado' : (userStatus || 'En Proceso');
        
        addOrUpdateAnimeInList(anime, newStatus, episode.number).catch(err => 
          console.error("Error actualizando progreso al seleccionar episodio:", err)
        );
        setUserStatus(newStatus);
        setUserProgress(episode.number);
      }

      // 2. Esto se ejecuta inmediatamente sin esperar a Firebase
      const links = await getAnime1VEpisodeLinks(episode.url);
      if (links?.streamLinks) {
        const subServers  = links.streamLinks.SUB  ?? [];
        const dubServers  = links.streamLinks.DUB  ?? [];
        const allServers  = [...subServers, ...dubServers];

        const preferred = allServers.find(s => s.server.toLowerCase().includes('streamwish')) 
                       ?? allServers.find(s => s.server === 'HLS')
                       ?? allServers[0];

        if (preferred?.url) {
          setStreamUrl(preferred.url);
        }
      }
    } catch (error) {
      console.error('Error fetching stream links:', error);
    } finally {
      setLoadingStream(false);
    }
  };

  const saveProgress = async (progress: number, isUpdate: boolean = false) => {
    // Keep for backward compatibility / no-op
  };

  const handleUpdateStatus = async (status: UserListStatus) => {
    if (!anime) return;
    
    let progress = userProgress;
    if (status === 'Terminado') {
      progress = anime.episodes || (anime1VInfo?.episodes?.length) || 0;
    } else if (status === 'Por Ver') {
      progress = 0;
    }

    setIsUpdatingStatus(true);
    try {
      await addOrUpdateAnimeInList(anime, status, progress);
      setUserStatus(status);
      setUserProgress(progress);
      setShowStatusSelector(false);
      Alert.alert('¡Éxito!', `Anime actualizado a "${status}" con progreso ${progress}`);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo actualizar el estado del anime');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUpdateProgress = async () => {
    // No-op
  };

  const handleRemove = async () => {
    if (!animeId) return;
    try {
      await removeAnimeFromList(animeId);
      setUserStatus(null);
      setUserProgress(0);
      setCurrentEpisode(null);
      setStreamUrl(null);
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
    isUpdatingStatus,
  };
};