import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import {
  fetchLatestEpisodes,
  fetchSchedule,
  ScheduleGroup,
  ScheduleEpisode,
} from '../../../../services/anime1v';
import { getIsAdultContentEnabled } from '../../../../services/cache';
import { AiringSpcItem } from '../types/airingSpc';

const PAGE_SIZE = 10;

function stripEpisodeSuffix(url: string): string {
  return url.replace(/\/\d+$/, '');
}

export const useAiringSpc = () => {
  const router = useRouter();

  // Adult / HentaiLA state
  const [allResults, setAllResults] = useState<AiringSpcItem[]>([]);
  const [results, setResults] = useState<AiringSpcItem[]>([]);
  const [loadingAdult, setLoadingAdult] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Schedule state (when !isAdult)
  const [scheduleGroups, setScheduleGroups] = useState<ScheduleGroup[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [refreshingSchedule, setRefreshingSchedule] = useState(false);

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

  // Carga del calendario cuando R18 no está activo
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

  // Recarga manual del calendario
  const refreshSchedule = useCallback(async () => {
    try {
      setRefreshingSchedule(true);
      const data = await fetchSchedule();
      setScheduleGroups(data || []);
    } catch (error) {
      console.error('Error refreshing schedule:', error);
    } finally {
      setRefreshingSchedule(false);
    }
  }, []);

  // Carga de episodios de HentaiLA cuando R18 está activo
  const loadAdultData = useCallback(async () => {
    try {
      setLoadingAdult(true);
      setPage(1);
      setHasMore(true);

      const episodes = await fetchLatestEpisodes(true);

      const latestBySlug = new Map<string, AiringSpcItem>();
      for (const ep of episodes) {
        const existing = latestBySlug.get(ep.slug);
        if (!existing || ep.episode > existing.episode) {
          latestBySlug.set(ep.slug, ep);
        }
      }
      const uniqueEpisodes = Array.from(latestBySlug.values());

      setAllResults(uniqueEpisodes);
      setResults(uniqueEpisodes.slice(0, PAGE_SIZE));
      setHasMore(uniqueEpisodes.length > PAGE_SIZE);
    } catch (error) {
      console.error('Error loading adult episodes:', error);
    } finally {
      setLoadingAdult(false);
    }
  }, []);

  useEffect(() => {
    if (isAdult && isAdultSettingEnabled) {
      loadAdultData();
    } else {
      loadScheduleData();
    }
  }, [isAdult, isAdultSettingEnabled, loadAdultData, loadScheduleData]);

  useEffect(() => {
    setLoadingMore(false);
  }, [results]);

  const toggleAdult = () => {
    if (isAdultSettingEnabled) {
      setIsAdult((prev) => !prev);
    }
  };

  const handleLoadMore = () => {
    if (!loadingAdult && results.length < allResults.length) {
      setLoadingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      const sliced = allResults.slice(0, nextPage * PAGE_SIZE);
      setResults(sliced);
      setHasMore(allResults.length > sliced.length);
    }
  };

  const handleAnimePress = (item: AiringSpcItem) => {
    router.push({
      pathname: '/animatedetailsepaicore',
      params: { url: stripEpisodeSuffix(item.url), title: item.title },
    });
  };

  const handleScheduleEpisodePress = (episode: ScheduleEpisode) => {
    router.push({
      pathname: '/animatedetailsepaicore',
      params: { url: stripEpisodeSuffix(episode.url), title: episode.title },
    });
  };

  return {
    results,
    loadingAdult,
    loadingMore,
    hasMore,
    scheduleGroups,
    loadingSchedule,
    refreshingSchedule,
    refreshSchedule,
    isAdult,
    isAdultSettingEnabled,
    toggleAdult,
    handleLoadMore,
    handleAnimePress,
    handleScheduleEpisodePress,
  };
};