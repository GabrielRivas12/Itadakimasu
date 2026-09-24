import { useState, useEffect, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  getAnime1VDetail,
  getAnime1VEpisodeLinks,
  Anime1VDetail,
  Anime1VEpisode,
  Anime1VStreamLink,
  Anime1VDownloadLink,
  Anime1VVariant,
} from '../../../../services/anime1v';
import {
  getUserList,
  addOrUpdateAnimeInList,
  removeAnimeFromList,
  mapDetailToAnime,
  UserListStatus,
  UserListItem,
  animeListEvents,
} from '../../../../services/animeList';

const EPISODES_PER_PAGE = 50;

const toRawSlug = (value: string | null | undefined): string => {
  if (!value) return '';
  return value.replace(/^https?:\/\/[^/]+\/media\//i, '').replace(/\/+$/, '');
};

const findUserItem = (list: UserListItem[], detail: Anime1VDetail): UserListItem | undefined => {
  const detailId = String(detail.id);
  const detailSlug = toRawSlug(detail?.slug);
  return list.find((item) => {
    if (String(item.animeId ?? item.id ?? item.anime?.id) === detailId) return true;
    if (detailSlug) {
      const itemSlug = toRawSlug(item.slug);
      if (itemSlug && itemSlug === detailSlug) return true;
    }
    if (item.anime && String(item.anime.id) === detailId) return true;
    return false;
  });
};

const isPlayerZillaServer = (s: Anime1VStreamLink): boolean =>
  /streamwish|zilla|strw|awish|playerzilla/i.test(`${s.server} ${s.url}`.toLowerCase());

const isVoeServer = (s: Anime1VStreamLink): boolean =>
  /voe\.|voe\.sx|\bvoe\b/i.test(`${s.server} ${s.url}`.toLowerCase());

const serverPreferenceRank = (s: Anime1VStreamLink): number => {
  if (isVoeServer(s)) return 0;
  if (isPlayerZillaServer(s)) return 1;
  return 2;
};

const sortServersByPreference = (servers: Anime1VStreamLink[]): Anime1VStreamLink[] =>
  [...servers].sort((a, b) => serverPreferenceRank(a) - serverPreferenceRank(b));

const mergeStreamLinks = (
  stream: Anime1VStreamLink[],
  downloads: Anime1VDownloadLink[]
): Anime1VStreamLink[] => {
  const seenUrl = new Set(stream.map((s) => s.url));
  const seenName = new Set(stream.map((s) => s.server.toLowerCase()));
  const merged = [...stream];
  for (const d of downloads) {
    const name = d.server.toLowerCase();
    if (seenUrl.has(d.url) || seenName.has(name)) continue;
    seenUrl.add(d.url);
    seenName.add(name);
    merged.push({ server: d.server, url: d.url });
  }
  return merged;
};

const pickPreferredServer = (
  servers: Anime1VStreamLink[],
  selectedServerName?: string
): Anime1VStreamLink | undefined => {
  if (servers.length === 0) return undefined;

  if (selectedServerName) {
    const userSelected = servers.find((s) =>
      s.server.toLowerCase().includes(selectedServerName.toLowerCase())
    );
    if (userSelected) return userSelected;
  }

  return (
    servers.find((s) => isVoeServer(s)) ??
    servers.find((s) => isPlayerZillaServer(s)) ??
    servers.find((s) => s.server.toLowerCase().includes('mp4upload')) ??
    servers[0]
  );
};

export const useSenpaiCoreDetail = () => {
  const { url, episode } = useLocalSearchParams();
  const [detail, setDetail] = useState<Anime1VDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [currentEpisode, setCurrentEpisode] = useState<Anime1VEpisode | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loadingStream, setLoadingStream] = useState(false);
  const [contentNotAvailable, setContentNotAvailable] = useState(false);
  const [availableServers, setAvailableServers] = useState<Anime1VStreamLink[]>([]);
  const [selectedServerName, setSelectedServerName] = useState<string>('streamwish');
  const [subServers, setSubServers] = useState<Anime1VStreamLink[]>([]);
  const [dubServers, setDubServers] = useState<Anime1VStreamLink[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<Anime1VVariant>('SUB');

  const [displayedEpisodes, setDisplayedEpisodes] = useState<Anime1VEpisode[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreEpisodes, setHasMoreEpisodes] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [userStatus, setUserStatus] = useState<UserListStatus | null>(null);
  const [userProgress, setUserProgress] = useState<number>(0);
  const [showStatusSelector, setShowStatusSelector] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const animeUrl = typeof url === 'string' ? url : Array.isArray(url) ? url[0] : null;

  const loadDetail = useCallback(async () => {
    if (!animeUrl) {
      setLoading(false);
      setError(true);
      return;
    }

    setLoading(true);
    setError(false);

    try {
      // Si es un slug crudo, probar en cascada: slug directo, animeav1 y hentaila
      const candidates = /^https?:\/\//i.test(animeUrl)
        ? [animeUrl]
        : [animeUrl, `https://animeav1.com/media/${animeUrl}`, `https://hentaila.com/media/${animeUrl}`];

      let data: Anime1VDetail | null = null;
      for (const candidate of candidates) {
        data = await getAnime1VDetail(candidate, 999);
        if (data) break;
      }

      if (data) {
        setDetail(data);
        setDisplayedEpisodes(data.episodes.slice(0, EPISODES_PER_PAGE));
        setCurrentPage(1);
        setHasMoreEpisodes(data.episodes.length > EPISODES_PER_PAGE);

        const list = await getUserList();
        const userItem = findUserItem(list, data);
        setUserStatus(userItem?.status ?? null);
        setUserProgress(userItem?.progress ?? 0);
      } else {
        setError(true);
      }
    } catch (e) {
      console.error('Error cargando detalle SenpaiCore:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [animeUrl]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    setCurrentEpisode(null);
    setStreamUrl(null);
    setLoadingStream(false);
    setContentNotAvailable(false);
    setAvailableServers([]);
    setSubServers([]);
    setDubServers([]);
    setSelectedVariant('SUB');
    setDisplayedEpisodes([]);
    setCurrentPage(1);
    setHasMoreEpisodes(true);
    setIsLoadingMore(false);
    setUserStatus(null);
    setUserProgress(0);
    setShowStatusSelector(false);
  }, [animeUrl]);

  // Mantener el estado de la lista en vivo: si cambia (añadir/quitar/actualizar
  // desde cualquier parte), el selector refleja el estado real inmediatamente.
  useEffect(() => {
    if (!detail) return;
    const handleSync = (list: UserListItem[]) => {
      const userItem = findUserItem(list, detail);
      setUserStatus(userItem?.status ?? null);
      setUserProgress(userItem?.progress ?? 0);
    };
    animeListEvents.on('listUpdated', handleSync);
    return () => {
      animeListEvents.off('listUpdated', handleSync);
    };
  }, [detail]);

  const handleEpisodeSelect = useCallback(async (episode: Anime1VEpisode) => {
    setCurrentEpisode(episode);
    setLoadingStream(true);
    setContentNotAvailable(false);

    if (detail && userStatus) {
      const isLastEpisode = detail.totalEpisodes ? episode.number >= detail.totalEpisodes : false;
      const newStatus: UserListStatus = isLastEpisode ? 'Terminado' : userStatus;
      const anime = mapDetailToAnime(detail.id, detail, toRawSlug(detail.slug));

      addOrUpdateAnimeInList(anime, newStatus, episode.number).catch((err) =>
        console.error('Error actualizando progreso al seleccionar episodio:', err)
      );
      setUserStatus(newStatus);
      setUserProgress(episode.number);
    }

    try {
      const links = await getAnime1VEpisodeLinks(episode.url);
      if (links?.streamLinks) {
        const subServers = mergeStreamLinks(links.streamLinks.SUB ?? [], links.downloadLinks?.SUB ?? []);
        const dubServers = mergeStreamLinks(links.streamLinks.DUB ?? [], links.downloadLinks?.DUB ?? []);

        setSubServers(subServers);
        setDubServers(dubServers);

        // Por defecto SUB; si el episodio solo tiene DUB, usar DUB
        const defaultVariant: Anime1VVariant =
          subServers.length > 0 ? 'SUB' : dubServers.length > 0 ? 'DUB' : 'SUB';
        setSelectedVariant(defaultVariant);

        const variantServers = defaultVariant === 'SUB' ? subServers : dubServers;
        const fallbackServers = sortServersByPreference(
          variantServers.length > 0 ? variantServers : [...subServers, ...dubServers]
        );
        setAvailableServers(fallbackServers);

        if (fallbackServers.length === 0) {
          setContentNotAvailable(true);
          setStreamUrl(null);
          return;
        }

        const preferred = pickPreferredServer(fallbackServers, selectedServerName);

        setStreamUrl(preferred?.url ?? null);
        if (!preferred?.url) setContentNotAvailable(true);
      } else {
        setContentNotAvailable(true);
        setStreamUrl(null);
      }
    } catch (error) {
      console.error('Error fetching stream links:', error);
      setContentNotAvailable(true);
      setStreamUrl(null);
    } finally {
      setLoadingStream(false);
    }
  }, [selectedServerName, detail, userStatus]);

  useEffect(() => {
    if (
      detail &&
      detail.episodes.length > 0 &&
      !currentEpisode &&
      !loading &&
      !error
    ) {
      const targetEpisode =
        (typeof episode === 'string' && episode && Number(episode) > 0
          ? detail.episodes.find((e) => e.number === Number(episode))
          : undefined) ??
        (userProgress > 0
          ? detail.episodes.find((e) => e.number === userProgress)
          : undefined) ??
        detail.episodes[0];
      handleEpisodeSelect(targetEpisode);
    }
  }, [detail, currentEpisode, loading, error, handleEpisodeSelect, episode, userProgress]);

  const loadMoreEpisodes = useCallback(async () => {
    if (!detail || !hasMoreEpisodes || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const endIndex = nextPage * EPISODES_PER_PAGE;
      const slice = detail.episodes.slice(currentPage * EPISODES_PER_PAGE, endIndex);
      if (slice.length > 0) {
        setDisplayedEpisodes((prev) => [...prev, ...slice]);
        setCurrentPage(nextPage);
        setHasMoreEpisodes(detail.episodes.length > endIndex);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [detail, hasMoreEpisodes, isLoadingMore, currentPage]);

  const handleServerChange = useCallback((serverName: string) => {
    setSelectedServerName(serverName);
    if (availableServers.length > 0) {
      const server = availableServers.find((s) =>
        s.server.toLowerCase().includes(serverName.toLowerCase())
      );
      if (server) setStreamUrl(server.url);
    }
  }, [availableServers]);

const handleVariantChange = useCallback((variant: Anime1VVariant) => {
    setSelectedVariant(variant);
    const variantServers = variant === 'SUB' ? subServers : dubServers;
    const servers = sortServersByPreference(
      variantServers.length > 0 ? variantServers : availableServers
    );
    setAvailableServers(servers);

    const preferred = pickPreferredServer(servers, selectedServerName);
    setStreamUrl(preferred?.url ?? null);
    if (!preferred?.url) setContentNotAvailable(true);
  }, [subServers, dubServers, availableServers, selectedServerName]);

const hasDub = dubServers.length > 0;

  const handleDownloadEpisode = useCallback(async (episode: Anime1VEpisode) => {
    try {
      const links = await getAnime1VEpisodeLinks(episode.url);

      const subDownloads = links?.downloadLinks?.SUB ?? [];
      const dubDownloads = links?.downloadLinks?.DUB ?? [];
      const allDownloads = [...subDownloads, ...dubDownloads];

      const downloadServer =
        allDownloads.find((s) => s.server.toLowerCase().includes('pdrain')) ??
        allDownloads.find((s) => s.server.toLowerCase().includes('mp4upload')) ??
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
      console.error('Error en handleDownloadEpisode:', error);
      Alert.alert('Error', 'Ocurrió un error al intentar descargar el episodio.');
    }
  }, []);

  const handleUpdateStatus = useCallback(async (status: UserListStatus) => {
    if (!detail) return;

    let progress = userProgress;
    if (status === 'Terminado') {
      progress = detail.totalEpisodes || userProgress;
    } else if (status === 'Por Ver') {
      progress = 0;
    }

    setIsUpdatingStatus(true);
    try {
      const anime = mapDetailToAnime(detail.id, detail, toRawSlug(detail.slug));
      await addOrUpdateAnimeInList(anime, status, progress);
      setUserStatus(status);
      setUserProgress(progress);
      setShowStatusSelector(false);
      Alert.alert(
        '¡Éxito!',
        `Anime actualizado a "${status}"${progress > 0 ? ` con progreso ${progress}` : ''}`
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo actualizar el estado del anime');
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [detail, userProgress]);

  const handleRemove = useCallback(async () => {
    if (!detail) return;
    try {
      await removeAnimeFromList(detail.id);
      setUserStatus(null);
      setUserProgress(0);
      setShowStatusSelector(false);
      Alert.alert('¡Eliminado!', 'Anime quitado de tu lista personal');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo eliminar el anime de tu lista');
    }
  }, [detail]);

  return {
    detail,
    loading,
    error,
    retry: loadDetail,
    displayedEpisodes,
    hasMoreEpisodes,
    isLoadingMore,
    loadMoreEpisodes,
    handleEpisodeSelect,
    handleServerChange,
    handleDownloadEpisode,
    currentEpisode,
    streamUrl,
    loadingStream,
    contentNotAvailable,
    availableServers,
    selectedServerName,
    selectedVariant,
    hasDub,
    handleVariantChange,
    userStatus,
    userProgress,
    showStatusSelector,
    setShowStatusSelector,
    isUpdatingStatus,
    handleUpdateStatus,
    handleRemove,
  };
};