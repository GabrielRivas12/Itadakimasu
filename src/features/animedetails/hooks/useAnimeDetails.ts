import { useState, useEffect, useRef } from 'react';
import { Alert, Animated, Linking, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchAnimeDetails, Anime } from '../../../../services/anilist';
import { translateDescription } from '../../../../services/kitsu';
import {
  getUserList,
  addOrUpdateAnimeInList,
  removeAnimeFromList,
  UserListStatus,
} from '../../../../services/animeList';
import { getCachedAnimeDetails, cacheAnimeDetails, getIsAdultContentEnabled, getEpisodeOrder } from '../../../../services/cache';
import {
  searchAnime1V,
  getAnime1VInfo,
  getAnime1VEpisodeLinks,
  Anime1VEpisode,
  Anime1VInfo,
  Anime1VStreamLink,
} from '../../../../services/anime1v';
import { recordWatchSession } from '../../../../services/streak';
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
  const [isAdultContentEnabled, setIsAdultContentEnabled] = useState<boolean>(true);
  const [episodeOrder, setEpisodeOrder] = useState<'asc' | 'desc'>('asc');

  // Anime1V states
  const [anime1VInfo, setAnime1VInfo] = useState<Anime1VInfo | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Anime1VEpisode | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loadingStream, setLoadingStream] = useState(false);
  const [contentNotAvailable, setContentNotAvailable] = useState(false);
  const [matchingAttempted, setMatchingAttempted] = useState(false);
  const [availableServers, setAvailableServers] = useState<Anime1VStreamLink[]>([]);
  const [selectedServerName, setSelectedServerName] = useState<string>('streamwish');

  // Pagination states para episodios
  const [displayedEpisodes, setDisplayedEpisodes] = useState<Anime1VEpisode[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreEpisodes, setHasMoreEpisodes] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const EPISODES_PER_PAGE = 50;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const watchSessionStartRef = useRef<number | null>(null);
  const accumulatedWatchTimeRef = useRef(0);

  const animeId = typeof id === 'string' ? parseInt(id, 10) : Array.isArray(id) ? parseInt(id[0], 10) : null;

  useEffect(() => {
    if (animeId) {
      loadDetails(animeId);
    }
  }, [animeId]);

  useEffect(() => {
    if (anime && !anime1VInfo && !contentNotAvailable && !matchingAttempted) {
      // Solo buscar si no es contenido restringido
      if (anime.isAdult && !isAdultContentEnabled) {
        setContentNotAvailable(true);
        return;
      }
      searchAndLoadAnime1V();
    }
  }, [anime, isAdultContentEnabled]);

  // Cargar preferencia de orden de episodios
  useEffect(() => {
    const loadOrder = async () => {
      const order = await getEpisodeOrder();
      setEpisodeOrder(order);
    };
    loadOrder();
  }, []);

  // Inicializar displayedEpisodes cuando se carga anime1VInfo
  useEffect(() => {
    if (anime1VInfo && anime1VInfo.episodes) {
      const total = anime1VInfo.episodes.length;
      if (episodeOrder === 'desc') {
        const totalPages = Math.ceil(total / EPISODES_PER_PAGE);
        const start = Math.max(0, total - EPISODES_PER_PAGE);
        const slice = anime1VInfo.episodes.slice(start).reverse();
        setDisplayedEpisodes(slice);
        setCurrentPage(totalPages);
        setHasMoreEpisodes(start > 0);
      } else {
        const initialEpisodes = anime1VInfo.episodes.slice(0, EPISODES_PER_PAGE);
        setDisplayedEpisodes(initialEpisodes);
        setCurrentPage(1);
        setHasMoreEpisodes(total > EPISODES_PER_PAGE);
      }
    }
  }, [anime1VInfo, episodeOrder]);

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

  useEffect(() => {
    if (watchSessionStartRef.current !== null) {
      const elapsed = (Date.now() - watchSessionStartRef.current) / 1000;
      accumulatedWatchTimeRef.current += elapsed;
    }
    if (streamUrl) {
      watchSessionStartRef.current = Date.now();
    } else {
      watchSessionStartRef.current = null;
    }
  }, [streamUrl]);

  useEffect(() => {
    return () => {
      if (watchSessionStartRef.current !== null) {
        accumulatedWatchTimeRef.current += (Date.now() - watchSessionStartRef.current) / 1000;
      }
      if (accumulatedWatchTimeRef.current >= 120) {
        recordWatchSession(Math.round(accumulatedWatchTimeRef.current));
      }
    };
  }, []);

  const loadDetails = async (id: number) => {
    try {
      console.log(`[DEBUG] loadDetails START para id: ${id}`);
      setLoading(true);

      // Llamamos a getUserList una sola vez para eficiencia
      const [cachedAnime, userList, adultSetting] = await Promise.all([
        getCachedAnimeDetails(id),
        getUserList(),
        getIsAdultContentEnabled()
      ]);

      setIsAdultContentEnabled(adultSetting);

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
      }

      setUserStatus(status);
      setUserProgress(progress);

      // Si no tenemos la info completa (personajes/relaciones/trailer), la buscamos
      if (!currentAnime || !currentAnime.characters || !currentAnime.relations || !currentAnime.trailer) {
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

      if (currentAnime) {
        setLoading(false);
      }
    } catch (error) {
      console.error('[DEBUG] Error en loadDetails:', error);
      setLoading(false);
    }
  };

  const loadMoreEpisodes = async () => {
    if (!anime1VInfo || !hasMoreEpisodes || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      const total = anime1VInfo.episodes.length;

      if (episodeOrder === 'desc') {
        const prevPage = currentPage - 1;
        const totalPages = Math.ceil(total / EPISODES_PER_PAGE);
        const end = total - (totalPages - prevPage) * EPISODES_PER_PAGE;
        const start = Math.max(0, end - EPISODES_PER_PAGE);
        const slice = anime1VInfo.episodes.slice(start, end).reverse();
        setDisplayedEpisodes(prev => [...prev, ...slice]);
        setCurrentPage(prevPage);
        setHasMoreEpisodes(start > 0);
      } else {
        const nextPage = currentPage + 1;
        const endIndex = nextPage * EPISODES_PER_PAGE;
        const slice = anime1VInfo.episodes.slice(currentPage * EPISODES_PER_PAGE, endIndex);
        setDisplayedEpisodes(prev => [...prev, ...slice]);
        setCurrentPage(nextPage);
        setHasMoreEpisodes(total > endIndex);
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

      // Limitamos el tiempo total de búsqueda 
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
        const subServers = links.streamLinks.SUB ?? [];
        const dubServers = links.streamLinks.DUB ?? [];
        const allServers = [...subServers, ...dubServers];
        setAvailableServers(allServers);

        let preferred;

        // Intentar usar el servidor seleccionado por el usuario
        const userSelected = allServers.find(s => s.server.toLowerCase().includes(selectedServerName.toLowerCase()));

        if (userSelected) {
          preferred = userSelected;
        } else {
          if (anime?.isAdult) {
            preferred = allServers.find(s => s.server.toLowerCase().includes('mp4upload'))
              ?? allServers.find(s => s.server === 'streamwish')
              ?? allServers[0];
          } else {
            // Lógica normal: StreamWish > HLS > primero disponible
            preferred = allServers.find(s => s.server.toLowerCase().includes('streamwish'))
              ?? allServers.find(s => s.server === 'mp4upload')
              ?? allServers[0];
          }
        }

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

  const handleServerChange = (serverName: string) => {
    setSelectedServerName(serverName);
    if (availableServers.length > 0) {
      const server = availableServers.find(s => s.server.toLowerCase().includes(serverName.toLowerCase()));
      if (server) {
        setStreamUrl(server.url);
      }
    }
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

  const handleDownloadEpisode = async (episode: Anime1VEpisode) => {
    try {
      const links = await getAnime1VEpisodeLinks(episode.url);

      // Usar downloadLinks en vez de streamLinks
      const subDownloads = links?.downloadLinks?.SUB ?? [];
      const dubDownloads = links?.downloadLinks?.DUB ?? [];
      const allDownloads = [...subDownloads, ...dubDownloads];

      // Preferencia: MP4Upload > PDrain > 1Fichier > primero disponible
      const downloadServer =
        allDownloads.find(s => s.server.toLowerCase().includes('pdrain')) ??
        allDownloads.find(s => s.server.toLowerCase().includes('mp4upload')) ??
        allDownloads[0];

      if (!downloadServer?.url) {
        Alert.alert('Sin enlace', 'No hay servidor de descarga disponible para este episodio.');
        return;
      }

      const supported = await Linking.canOpenURL(downloadServer.url);
      if (supported) {
        await Linking.openURL(downloadServer.url);
      } else {
        Alert.alert('Error', 'No se pudo abrir el enlace de descarga.');
      }
    } catch (error) {
      console.error('[DEBUG] Error en handleDownloadEpisode:', error);
      Alert.alert('Error', 'Ocurrió un error al intentar descargar el episodio.');
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
    handleUpdateStatus,
    handleRemove,
    isUpdatingStatus,
    isAdultContentEnabled,
    handleDownloadEpisode,
    availableServers,
    selectedServerName,
    handleServerChange,
  };
};
