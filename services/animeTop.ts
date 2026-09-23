import { Anime } from './types';
import { getAnime1VInfoBySlug, getAnime1VDetail, Anime1VInfoBySlug, Anime1VDetail } from './anime1v';
import { mapSlugInfoToAnime, mapDetailToAnime } from './animeList';
import { getUserId } from '../src/hooks/userHelper';
import { getCachedTopAnime, cacheTopAnime } from './cache';
import { getCachedAnimeDetails, cacheAnimeDetails, getCachedAnimeBySlug, cacheAnimeBySlug } from './cache';
import {
  TopAnimeItem,
  syncTopAnimeToFirestore,
  fetchTopAnimeFromFirestore,
  removeTopAnimeFromFirestore,
} from './firestore';
import { EventEmitter } from 'eventemitter3';

const MAX_TOP = 10;

export const topAnimeEvents = new EventEmitter();

async function resolveTopAnime(item: TopAnimeItem): Promise<TopAnimeItem> {
  const animeId = Number(item.animeId ?? item.anime?.id);
  if (!animeId) {
    return { ...item };
  }

  const slug = item.slug || item.anime?.slug;

  if (slug) {
    const cachedAnime = await getCachedAnimeBySlug(slug);
    if (cachedAnime) {
      return { ...item, anime: cachedAnime };
    }

    const info: Anime1VInfoBySlug | null = await getAnime1VInfoBySlug(slug)
      ?? await getAnime1VInfoBySlug(slug, 'hentaila');

    if (!info) {
      const candidates = /^https?:\/\//i.test(slug)
        ? [slug]
        : [`https://animeav1.com/media/${slug}`, `https://hentaila.com/media/${slug}`];

      let detail: Anime1VDetail | null = null;
      for (const candidate of candidates) {
        detail = await getAnime1VDetail(candidate, 1);
        if (detail) break;
      }

      if (detail) {
        const anime = mapDetailToAnime(animeId, detail, slug);
        await cacheAnimeBySlug(slug, anime);
        await cacheAnimeDetails(animeId, anime);
        return { ...item, anime };
      }

      console.warn(`[Top] No se pudo resolver slug "${slug}" en el backend, se muestra como placeholder.`);
      return { ...item };
    }

    const anime = mapSlugInfoToAnime(animeId, info, slug);
    await cacheAnimeBySlug(slug, anime);
    await cacheAnimeDetails(animeId, anime);
    return { ...item, anime };
  }

  // Sin slug (items legacy): intentar caché por id, si no placeholder
  const cachedAnime = await getCachedAnimeDetails(animeId);
  if (cachedAnime) {
    return { ...item, anime: cachedAnime };
  }
  console.warn(`[Top] Item ${animeId} sin slug, se muestra como placeholder.`);
  return { ...item };
}

async function enrichTopAnimeList(minimalList: TopAnimeItem[]): Promise<TopAnimeItem[]> {
  if (!minimalList || minimalList.length === 0) return [];

  const enrichedList: TopAnimeItem[] = [];

  for (const item of minimalList) {
    const resolved = await resolveTopAnime(item);
    enrichedList.push(resolved);
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
            const remoteHasSlug = !!remoteItem.slug;
            const localHasSlug = !!localItem.slug;
            const remoteDate = new Date(remoteItem.updatedAt || 0).getTime();
            const localDate = new Date(localItem.updatedAt || 0).getTime();
            const remoteHasAnime = !!remoteItem.anime;
            const localHasAnime = !!localItem.anime;

            // El dato backend (con slug) siempre gana sobre caché legacy de AniList
            if ((remoteHasSlug && !localHasSlug) || remoteDate > localDate || (remoteHasAnime && !localHasAnime)) {
              localMap.set(remoteItem.animeId, remoteItem);
              hasChanges = true;
            }
          }
        });

        // Re-enriquecer items cacheados con slug aún sin `anime` (placeholder de AniList/caché viejo)
        const placeholderIds = Array.from(localMap.entries())
          .filter(([, item]) => item && !!item.slug && !item.anime)
          .map(([animeId]) => animeId);

        if (placeholderIds.length > 0) {
          for (const animeId of placeholderIds) {
            const placeholder = localMap.get(animeId)!;
            const resolved = await resolveTopAnime(placeholder);
            if (resolved.anime) {
              localMap.set(animeId, resolved);
              hasChanges = true;
            }
          }
        }

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
    slug: anime.slug,
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
