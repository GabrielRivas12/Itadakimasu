import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import {
  fetchRecentEpisodesByProvider,
  fetchRecentEpisodesCount,
  fetchLatestEpisodes,
  fetchSchedule,
  ScheduleGroup,
  ScheduleEpisode,
} from '../../../../services/anime1v';
import { getIsAdultContentEnabled } from '../../../../services/cache';
import { AiringSpcItem, ProviderSection } from '../types/airingSpc';
import {
  DEFAULT_RECENT_PROVIDER,
  RECENT_PROVIDER_TABS,
} from '../constants/recentProviders';

function cleanAnimeUrl(url: string): string {
  if (!url) return '';
  return url.replace(/\/\d+$/, '');
}

function groupItemsByProvider(items: AiringSpcItem[]): ProviderSection[] {
  const seen = new Set<string>();
  const map = new Map<string, AiringSpcItem[]>();

  for (const item of items) {
    const prov = item.provider || 'Otros';
    const id = item.slug || item.url || item.title || `${item.episode}`;
    const key = `${prov}::${id}::${item.episode}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (!map.has(prov)) {
      map.set(prov, []);
    }
    map.get(prov)!.push(item);
  }

  return Array.from(map.entries()).map(([provider, list]) => ({
    provider,
    items: list,
  }));
}

export const useAiringSpc = () => {
  const router = useRouter();

  // Adult / HentaiLA state
  const [adultEpisodes, setAdultEpisodes] = useState<AiringSpcItem[]>([]);
  const [loadingAdult, setLoadingAdult] = useState(false);

  // Normal mode: Recientes por proveedor (/recent-episodes-by-provider)
  // El proveedor activo se carga bajo demanda y se cachea en memoria.
  const [recentProvider, setRecentProvider] = useState<string>(DEFAULT_RECENT_PROVIDER);
  const [providerFeeds, setProviderFeeds] = useState<Record<string, AiringSpcItem[]>>({});
  const [loadingProviders, setLoadingProviders] = useState<Record<string, boolean>>({});
  const [recentProviderCounts, setRecentProviderCounts] = useState<Record<string, number>>({});

  // Normal mode: Schedule state (/schedule)
  const [scheduleGroups, setScheduleGroups] = useState<ScheduleGroup[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);

  // General refresh state
  const [refreshing, setRefreshing] = useState(false);

  // R18 settings
  const [isAdult, setIsAdult] = useState(false);
  const [isAdultSettingEnabled, setIsAdultSettingEnabled] = useState(false);

  useEffect(() => {
    const loadSetting = async () => {
      const enabled = await getIsAdultContentEnabled();
      setIsAdultSettingEnabled(enabled);
      if (!enabled) {
        setIsAdult(false);
      }
    };
    loadSetting();
  }, []);

  // Carga de episodios recientes de un proveedor individual
  const loadRecentProvider = useCallback(async (provider: string) => {
    setLoadingProviders((prev) => ({ ...prev, [provider]: true }));
    try {
      const episodes = await fetchRecentEpisodesByProvider(provider);
      setProviderFeeds((prev) => ({
        ...prev,
        [provider]: (episodes || []) as AiringSpcItem[],
      }));
    } catch (error) {
      console.error(`Error loading recent episodes (${provider}):`, error);
      setProviderFeeds((prev) => ({ ...prev, [provider]: [] }));
    } finally {
      setLoadingProviders((prev) => ({ ...prev, [provider]: false }));
    }
  }, []);

  // Carga de los badges (conteo por proveedor)
  const loadRecentCounts = useCallback(async () => {
    try {
      const entries = await Promise.all(
        RECENT_PROVIDER_TABS.map(async ({ id }) => {
          const count = await fetchRecentEpisodesCount(id);
          return [id, count] as const;
        })
      );
      setRecentProviderCounts(Object.fromEntries(entries));
    } catch (error) {
      console.error('Error loading recent episodes counts:', error);
    }
  }, []);

  // Carga del calendario (/api/v1/anime/schedule)
  const loadScheduleData = useCallback(async () => {
    try {
      setLoadingSchedule(true);
      const data = await fetchSchedule();
      setScheduleGroups(data || []);
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoadingSchedule(false);
    }
  }, []);

  // Carga de episodios de HentaiLA (/api/v1/anime/latest-episodes?provider=hentaila)
  const loadAdultData = useCallback(async () => {
    try {
      setLoadingAdult(true);
      const episodes = await fetchLatestEpisodes('hentaila');
      setAdultEpisodes((episodes || []) as AiringSpcItem[]);
    } catch (error) {
      console.error('Error loading adult episodes:', error);
    } finally {
      setLoadingAdult(false);
    }
  }, []);

  // Carga inicial y por cambio de modo (R18 vs Normal)
  useEffect(() => {
    if (isAdult && isAdultSettingEnabled) {
      loadAdultData();
    } else {
      loadScheduleData();
      loadRecentCounts();
    }
  }, [isAdult, isAdultSettingEnabled, loadAdultData, loadScheduleData, loadRecentCounts]);

  // Carga bajo demanda del proveedor activo (AnimeAV1 por defecto)
  useEffect(() => {
    if (isAdult && isAdultSettingEnabled) return;
    if (
      providerFeeds[recentProvider] === undefined &&
      !loadingProviders[recentProvider]
    ) {
      loadRecentProvider(recentProvider);
    }
  }, [
    isAdult,
    isAdultSettingEnabled,
    recentProvider,
    providerFeeds,
    loadingProviders,
    loadRecentProvider,
  ]);

  // Cambiar de etiqueta de proveedor (dispara la solicitud del proveedor elegido)
  const selectRecentProvider = useCallback((provider: string) => {
    setRecentProvider(provider);
  }, []);

  // Recarga manual (Pull to Refresh)
  const refreshData = useCallback(async () => {
    try {
      setRefreshing(true);
      if (isAdult && isAdultSettingEnabled) {
        await loadAdultData();
      } else {
        await Promise.all([
          loadRecentProvider(recentProvider),
          loadRecentCounts(),
          loadScheduleData(),
        ]);
      }
    } catch (error) {
      console.error('Error refreshing airing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [
    isAdult,
    isAdultSettingEnabled,
    recentProvider,
    loadAdultData,
    loadRecentProvider,
    loadRecentCounts,
    loadScheduleData,
  ]);

  const toggleAdult = () => {
    if (isAdultSettingEnabled) {
      setIsAdult((prev) => !prev);
    }
  };

  const handleAnimePress = (item: AiringSpcItem | ScheduleEpisode) => {
    router.push({
      pathname: '/animatedetailsepaicore',
      params: { url: cleanAnimeUrl(item.url), title: item.title },
    });
  };

  // Episodios del proveedor activo
  const recentEpisodes = useMemo(
    () => providerFeeds[recentProvider] ?? [],
    [providerFeeds, recentProvider]
  );

  const loadingRecent = !!loadingProviders[recentProvider];

  const adultSections = useMemo(
    () => groupItemsByProvider(adultEpisodes),
    [adultEpisodes]
  );

  return {
    // Normal mode data
    recentEpisodes,
    recentProvider,
    recentProviderCounts,
    selectRecentProvider,
    loadingRecent,
    scheduleGroups,
    loadingSchedule,

    // Adult mode data
    adultEpisodes,
    adultSections,
    loadingAdult,

    // Controls and handlers
    isAdult,
    isAdultSettingEnabled,
    toggleAdult,
    refreshing,
    refreshData,
    handleAnimePress,
  };
};
