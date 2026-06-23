import { Anime, fetchAnimesByIds } from './anilist';
import { getUserId } from '../src/hooks/userHelper';
import { getCachedTopAnime, cacheTopAnime } from './cache';
import { getCachedAnimeDetails, cacheAnimeDetails } from './cache';
import {
  TopAnimeItem,
  syncTopAnimeToFirestore,
  fetchTopAnimeFromFirestore,
  removeTopAnimeFromFirestore,
} from './firestore';
import { EventEmitter } from 'eventemitter3';

const MAX_TOP = 10;

export const topAnimeEvents = new EventEmitter();

async function enrichTopAnimeList(minimalList: TopAnimeItem[]): Promise<TopAnimeItem[]> {
  if (!minimalList || minimalList.length === 0) return [];

  const enrichedList: TopAnimeItem[] = [];
  const missingIds: number[] = [];

  for (const item of minimalList) {
    const cachedAnime = await getCachedAnimeDetails(item.animeId);
    if (cachedAnime) {
      enrichedList.push({ ...item, anime: cachedAnime });
    } else {
      missingIds.push(item.animeId);
    }
  }

  if (missingIds.length > 0) {
    const fetchedAnimes = await fetchAnimesByIds(missingIds);
    for (const anime of fetchedAnimes) {
      await cacheAnimeDetails(anime.id, anime);
      const originalItem = minimalList.find(i => i.animeId === anime.id);
      if (originalItem) {
        enrichedList.push({ ...originalItem, anime });
      }
    }
  }

  return enrichedList.sort((a, b) => a.rank - b.rank);
}

export async function getTopAnimeList(): Promise<TopAnimeItem[]> {
  const uid = getUserId();

  const cached = await getCachedTopAnime(uid || 'guest');
  if (cached) {
    const localList = cached as TopAnimeItem[];

    if (uid) {
      fetchTopAnimeFromFirestore().then(async (remoteList) => {
        if (!remoteList) return;

        const enrichedRemote = await enrichTopAnimeList(remoteList);

        const latestCached = await getCachedTopAnime(uid || 'guest');
        const currentLocalList: TopAnimeItem[] = latestCached ? latestCached as TopAnimeItem[] : [];

        const localMap = new Map(currentLocalList.map(item => [item.animeId, item]));
        const remoteIds = new Set(enrichedRemote.map(item => item.animeId));
        let hasChanges = false;

        for (const animeId of localMap.keys()) {
          if (!remoteIds.has(animeId)) {
            localMap.delete(animeId);
            hasChanges = true;
          }
        }

        enrichedRemote.forEach(remoteItem => {
          const localItem = localMap.get(remoteItem.animeId);
          if (!localItem) {
            localMap.set(remoteItem.animeId, remoteItem);
            hasChanges = true;
          } else {
            const remoteDate = new Date(remoteItem.updatedAt || 0).getTime();
            const localDate = new Date(localItem.updatedAt || 0).getTime();
            if (remoteDate > localDate) {
              localMap.set(remoteItem.animeId, remoteItem);
              hasChanges = true;
            }
          }
        });

        if (hasChanges) {
          const mergedList = Array.from(localMap.values()).sort((a, b) => a.rank - b.rank);
          await cacheTopAnime(uid, mergedList);
          topAnimeEvents.emit('topUpdated', mergedList);
        }
      }).catch(err => console.error('Error en sincronización de fondo del top:', err));
    }

    return localList;
  }

  if (!uid) return [];

  const remote = await fetchTopAnimeFromFirestore();
  if (remote.length > 0) {
    const enriched = await enrichTopAnimeList(remote);
    await cacheTopAnime(uid, enriched);
    return enriched;
  }

  return [];
}

export async function addToTopAnime(anime: Anime, currentList: TopAnimeItem[]): Promise<TopAnimeItem[]> {
  const uid = getUserId();
  if (!uid) return currentList;

  if (currentList.some(item => item.animeId === anime.id)) return currentList;
  if (currentList.length >= MAX_TOP) return currentList;

  const now = new Date().toISOString();
  const newItem: TopAnimeItem = {
    animeId: anime.id,
    anime,
    rank: currentList.length + 1,
    addedAt: now,
    updatedAt: now,
  };

  const updated = [...currentList, newItem];

  const promises: Promise<any>[] = [];
  promises.push(cacheTopAnime(uid, updated));
  promises.push(syncTopAnimeToFirestore([newItem]));

  await Promise.all(promises);

  topAnimeEvents.emit('topUpdated', updated);
  return updated;
}

export async function updateTopAnimeRank(items: TopAnimeItem[]): Promise<TopAnimeItem[]> {
  const uid = getUserId();
  if (!uid) return items;

  const now = new Date().toISOString();
  const updated = items.map((item, index) => ({ ...item, rank: index + 1, updatedAt: now }));

  const promises: Promise<any>[] = [];
  promises.push(cacheTopAnime(uid, updated));
  promises.push(syncTopAnimeToFirestore(updated));

  await Promise.all(promises);

  topAnimeEvents.emit('topUpdated', updated);
  return updated;
}

export async function removeFromTopAnime(animeId: number, currentList: TopAnimeItem[]): Promise<TopAnimeItem[]> {
  const uid = getUserId();
  if (!uid) return currentList;

  const filtered = currentList.filter(item => item.animeId !== animeId);
  const now = new Date().toISOString();
  const reindexed = filtered.map((item, index) => ({ ...item, rank: index + 1, updatedAt: now }));

  const promises: Promise<any>[] = [];
  promises.push(cacheTopAnime(uid, reindexed));
  promises.push(removeTopAnimeFromFirestore(animeId));
  if (reindexed.length > 0) {
    promises.push(syncTopAnimeToFirestore(reindexed));
  }

  await Promise.all(promises);

  topAnimeEvents.emit('topUpdated', reindexed);
  return reindexed;
}
