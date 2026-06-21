import { Anime, fetchAnimesByIds } from './anilist';
import { getUserId } from '../src/hooks/userHelper';
import { getCachedTopAnime, cacheTopAnime } from './cache';
import {
  TopAnimeItem,
  syncTopAnimeToFirestore,
  fetchTopAnimeFromFirestore,
  removeTopAnimeFromFirestore,
} from './firestore';

const MAX_TOP = 10;

export function getTopAnimeEvents() {
  const { EventEmitter } = require('eventemitter3');
  return new EventEmitter();
}

export const topAnimeEvents = getTopAnimeEvents();

export async function getTopAnimeList(): Promise<TopAnimeItem[]> {
  const uid = getUserId();
  const cached = await getCachedTopAnime(uid || 'guest');
  if (cached) return cached as TopAnimeItem[];

  if (!uid) return [];

  const remote = await fetchTopAnimeFromFirestore();
  if (remote.length > 0) {
    const sorted = remote.sort((a, b) => a.rank - b.rank);
    const needAnime = sorted.filter(item => !item.anime);
    if (needAnime.length > 0) {
      const ids = needAnime.map(item => item.animeId);
      const animes = await fetchAnimesByIds(ids);
      const animeMap = new Map(animes.map(a => [a.id, a]));
      for (const item of sorted) {
        if (!item.anime) {
          const fetched = animeMap.get(item.animeId);
          if (fetched) item.anime = fetched;
        }
      }
    }
    await cacheTopAnime(uid, sorted);
    return sorted;
  }

  return [];
}

export async function addToTopAnime(anime: Anime, currentList: TopAnimeItem[]): Promise<TopAnimeItem[]> {
  const uid = getUserId();
  if (!uid) return currentList;

  if (currentList.some(item => item.animeId === anime.id)) return currentList;
  if (currentList.length >= MAX_TOP) return currentList;

  const newItem: TopAnimeItem = {
    animeId: anime.id,
    anime,
    rank: currentList.length + 1,
    addedAt: new Date().toISOString(),
  };

  const updated = [...currentList, newItem];
  await cacheTopAnime(uid, updated);
  await syncTopAnimeToFirestore([newItem]);
  topAnimeEvents.emit('topUpdated', updated);
  return updated;
}

export async function updateTopAnimeRank(items: TopAnimeItem[]): Promise<TopAnimeItem[]> {
  const uid = getUserId();
  if (!uid) return items;

  const updated = items.map((item, index) => ({ ...item, rank: index + 1 }));
  await cacheTopAnime(uid, updated);
  await syncTopAnimeToFirestore(updated);
  topAnimeEvents.emit('topUpdated', updated);
  return updated;
}

export async function removeFromTopAnime(animeId: number, currentList: TopAnimeItem[]): Promise<TopAnimeItem[]> {
  const uid = getUserId();
  if (!uid) return currentList;

  const filtered = currentList.filter(item => item.animeId !== animeId);
  const reindexed = filtered.map((item, index) => ({ ...item, rank: index + 1 }));

  await cacheTopAnime(uid, reindexed);
  await removeTopAnimeFromFirestore(animeId);
  if (reindexed.length > 0) {
    await syncTopAnimeToFirestore(reindexed);
  }
  topAnimeEvents.emit('topUpdated', reindexed);
  return reindexed;
}
