import { useState, useEffect, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  getAnime1VDetail,
  getAnime1VEpisodeLinks,
  Anime1VDetail,
  Anime1VEpisode,
  Anime1VStreamLink,
  Anime1VVariant,
} from '../../../../services/anime1v';

const EPISODES_PER_PAGE = 50;

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
    servers.find((s) => s.server.toLowerCase().includes('streamwish')) ??
    servers.find((s) => s.server.toLowerCase().includes('mp4upload')) ??
    servers[0]
  );
};

export const useSenpaiCoreDetail = () => {
  const { url } = useLocalSearchParams();
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
      const data = await getAnime1VDetail(animeUrl, 999);
      if (data) {
        setDetail(data);
        setDisplayedEpisodes(data.episodes.slice(0, EPISODES_PER_PAGE));
        setCurrentPage(1);
        setHasMoreEpisodes(data.episodes.length > EPISODES_PER_PAGE);
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
  }, [animeUrl]);

  const handleEpisodeSelect = useCallback(async (episode: Anime1VEpisode) => {
    setCurrentEpisode(episode);
    setLoadingStream(true);
    setContentNotAvailable(false);

    try {
      const links = await getAnime1VEpisodeLinks(episode.url);
      if (links?.streamLinks) {
        const subServers = links.streamLinks.SUB ?? [];
        const dubServers = links.streamLinks.DUB ?? [];

        setSubServers(subServers);
        setDubServers(dubServers);

        // Por defecto SUB; si el episodio solo tiene DUB, usar DUB
        const defaultVariant: Anime1VVariant =
          subServers.length > 0 ? 'SUB' : dubServers.length > 0 ? 'DUB' : 'SUB';
        setSelectedVariant(defaultVariant);

        const variantServers = defaultVariant === 'SUB' ? subServers : dubServers;
        const fallbackServers = variantServers.length > 0 ? variantServers : [...subServers, ...dubServers];
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
  }, [selectedServerName]);

  useEffect(() => {
    if (
      detail &&
      detail.episodes.length > 0 &&
      !currentEpisode &&
      !loading &&
      !error
    ) {
      handleEpisodeSelect(detail.episodes[0]);
    }
  }, [detail, currentEpisode, loading, error, handleEpisodeSelect]);

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
    const servers = variantServers.length > 0 ? variantServers : availableServers;
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
  };
};