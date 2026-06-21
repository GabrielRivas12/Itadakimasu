import { useState, useEffect, useCallback } from 'react';
import { TopAnimeItem } from '../../../../services/firestore';
import { getTopAnimeList, addToTopAnime, removeFromTopAnime, updateTopAnimeRank, topAnimeEvents } from '../../../../services/animeTop';
import { Anime } from '../../../../services/anilist';
import { getUserId } from '../../../hooks/userHelper';
import { getUserList } from '../../../../services/animeList';
import { getPreloadedTopAnime, getPreloadPromise } from '../../../../services/dataPreloader';

export const useTopAnime = () => {
  const [topList, setTopList] = useState<TopAnimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userList, setUserList] = useState<{ animeId: number; anime: Anime }[]>([]);

  const loadTop = useCallback(async () => {
    if (!getUserId()) {
      setTopList([]);
      setLoading(false);
      return;
    }

    // Try preloader cache first
    const preloadPromise = getPreloadPromise();
    if (preloadPromise) {
      await preloadPromise;
      const cached = getPreloadedTopAnime();
      if (cached) {
        setTopList(cached);
        setLoading(false);
        return;
      }
    }

    try {
      const list = await getTopAnimeList();
      setTopList(list);
    } catch (e) {
      console.error('Error loading top anime:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUserList = useCallback(async () => {
    try {
      const list = await getUserList();
      setUserList(list.filter(item => item.anime).map(item => ({ animeId: item.animeId, anime: item.anime })));
    } catch (e) {
      console.error('Error loading user list for top anime:', e);
    }
  }, []);

  useEffect(() => {
    loadTop();
    loadUserList();
  }, [loadTop, loadUserList]);

  useEffect(() => {
    const handler = (updated: TopAnimeItem[]) => {
      setTopList(updated);
    };
    topAnimeEvents.on('topUpdated', handler);
    return () => {
      topAnimeEvents.off('topUpdated', handler);
    };
  }, []);

  const handleAdd = async (anime: Anime) => {
    const updated = await addToTopAnime(anime, topList);
    setTopList(updated);
  };

  const handleRemove = async (animeId: number) => {
    const updated = await removeFromTopAnime(animeId, topList);
    setTopList(updated);
  };

  const handleReorder = async (reordered: TopAnimeItem[]) => {
    const updated = await updateTopAnimeRank(reordered);
    setTopList(updated);
  };

  return {
    topList,
    loading,
    userList,
    handleAdd,
    handleRemove,
    handleReorder,
    loadTop,
  };
};
