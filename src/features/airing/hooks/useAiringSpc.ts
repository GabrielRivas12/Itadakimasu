import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import {
  fetchRecentEpisodes,
  fetchLatestEpisodes,
  fetchSchedule,
  ScheduleGroup,
  ScheduleEpisode,
} from '../../../../services/anime1v';
import { getIsAdultContentEnabled } from '../../../../services/cache';
import { AiringSpcItem, ProviderSection } from '../types/airingSpc';

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

  // Normal mode: Recent episodes state (/recent-episodes)
  const [recentEpisodes, setRecentEpisodes] = useState<AiringSpcItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

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

  // Carga de episodios recientes (/api/v1/anime/recent-episodes)
  const loadRecentData = useCallback(async () => {
    try {
      setLoadingRecent(true);
      const episodes = await fetchRecentEpisodes();
      setRecentEpisodes((episodes || []) as AiringSpcItem[]);
    } catch (error) {
      console.error('Error loading recent episodes:', error);
    } finally {
      setLoadingRecent(false);
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
      loadRecentData();
      loadScheduleData();
    }
  }, [isAdult, isAdultSettingEnabled, loadAdultData, loadRecentData, loadScheduleData]);

  // Recarga manual (Pull to Refresh)
  const refreshData = useCallback(async () => {
    try {
      setRefreshing(true);
      if (isAdult && isAdultSettingEnabled) {
        await loadAdultData();
      } else {
        await Promise.all([loadRecentData(), loadScheduleData()]);
      }
    } catch (error) {
      console.error('Error refreshing airing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [isAdult, isAdultSettingEnabled, loadAdultData, loadRecentData, loadScheduleData]);

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

  // Secciones agrupadas por proveedor
  const recentSections = useMemo(
    () => groupItemsByProvider(recentEpisodes),
    [recentEpisodes]
  );

  const adultSections = useMemo(
    () => groupItemsByProvider(adultEpisodes),
    [adultEpisodes]
  );

  return {
    // Normal mode data
    recentEpisodes,
    recentSections,
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