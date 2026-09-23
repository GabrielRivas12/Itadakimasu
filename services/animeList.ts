import { Platform } from 'react-native';
import { Anime } from './types';
import { getAnime1VInfoBySlug, getAnime1VDetail, Anime1VInfoBySlug, Anime1VDetail, buildImageProxyUrl } from './anime1v';
import {
  syncAnimeToFirestore, fetchUserListFromFirestore,
  removeFromFirestore, updateProgressInFirestore
} from './firestore';
import { getCachedAnimeDetails, cacheAnimeDetails, getCachedAnimeBySlug, cacheAnimeBySlug } from './cache';
// import { getCurrentUser } from './auth';
import { getUserId } from '../src/hooks/userHelper';
import { EventEmitter } from 'eventemitter3';

export const animeListEvents = new EventEmitter();

export type UserListStatus = 'En Proceso' | 'Terminado' | 'Por Ver';

export interface UserListItem {
  animeId: number;
  anime?: Anime;
  slug?: string;
  status: UserListStatus;
  progress: number;
  addedAt: string;
  updatedAt: string;
}

// Convierte la respuesta reducida de /info-by-slug al shape `Anime` que consume la UI
export function mapSlugInfoToAnime(animeId: number, info: Anime1VInfoBySlug, slug?: string): Anime {
  const image = buildImageProxyUrl(info.image || '');
  return {
    id: animeId,
    slug,
    title: {
      romaji: info.title,
      english: info.title,
      native: info.title,
    },
    coverImage: {
      large: image,
      medium: image,
    },
    bannerImage: null,
    averageScore: info.score != null ? Math.round(info.score * 10) : null,
    episodes: info.totalEpisodes || null,
    genres: (info.genres || []).map((g) => g.name),
    type: 'ANIME',
  };
}

// Convierte el detalle completo de /info al shape `Anime` (fallback cuando info-by-slug no resuelve)
export function mapDetailToAnime(animeId: number, detail: Anime1VDetail, slug?: string): Anime {
  const image = buildImageProxyUrl(detail.image || '');
  const backdrop = buildImageProxyUrl(detail.backdrop || '');
  return {
    id: animeId,
    slug,
    title: {
      romaji: detail.title,
      english: detail.titleJapanese || detail.title,
      native: detail.titleJapanese || detail.title,
    },
    coverImage: {
      large: image,
      medium: image,
    },
    bannerImage: backdrop || null,
    averageScore: detail.score != null ? Math.round(detail.score * 10) : null,
    episodes: detail.totalEpisodes || null,
    genres: (detail.genres || []).map((g) => g.name),
    type: detail.type || 'ANIME',
    status: detail.status || undefined,
    description: detail.description || undefined,
  };
}

// Función para enriquecer la lista del usuario con detalles completos de anime
async function enrichUserList(minimalList: any[]): Promise<UserListItem[]> {
  if (!minimalList || minimalList.length === 0) return [];

  const resolvedItems = await Promise.all(
    minimalList.map(async (item) => {
      const animeId = Number(item.animeId ?? item.anime?.id);
      if (!animeId) {
        // Sin id, solo placeholder
        return { ...item };
      }

      const slug = item.slug;

      // Con slug: siempre datos del backend (caché por slug), nunca AniList
      if (slug) {
        const cachedAnime = await getCachedAnimeBySlug(slug);
        if (cachedAnime) {
          return { ...item, anime: cachedAnime };
        }

        const info = await getAnime1VInfoBySlug(slug)
          ?? await getAnime1VInfoBySlug(slug, 'hentaila');

        if (!info) {
          // Fallback: intentar resolver por /info con URL derivada del slug
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

          console.warn(`[Sync] No se pudo resolver slug "${slug}" en el backend, se muestra como placeholder.`);
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
      console.warn(`[Sync] Item ${animeId} sin slug, se muestra como placeholder.`);
      return { ...item };
    })
  );

  // Ordenar por updatedAt descendente
  return resolvedItems.sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

const GUEST_STORAGE_KEY = '@AnimeLT:guest_list';

// Helper para obtener la clave de AsyncStorage (Solo se usa en Móvil)
const getStorageKey = (currentUser: any) => {
  return currentUser ? `@AnimeLT:user_list:${currentUser.uid}` : GUEST_STORAGE_KEY;
};

// Helper para obtener AsyncStorage de forma segura en todas las plataformas
const getAsyncStorage = () => {
  const storage = require('@react-native-async-storage/async-storage');
  return storage.default || storage;
};

// Obtiene la lista del usuario, primero del caché local y luego sincroniza con Firestore si el usuario está logueado
export async function getUserList(): Promise<UserListItem[]> {
  try {
    const user = getUserId();

    const storage = getAsyncStorage();
    const currentKey = getStorageKey(user);

    // 1. Obtener lo que hay en caché local inmediatamente
    const jsonValue = await storage.getItem(currentKey);
    const localList: UserListItem[] = jsonValue != null ? JSON.parse(jsonValue) : [];

    // 2. Si el usuario está logueado, sincronizamos con Firestore en segundo plano
    if (user) {
      // Si el caché está vacío, esperamos a la red obligatoriamente para la primera carga
      if (localList.length === 0) {
        const remoteList = await fetchUserListFromFirestore();
        if (remoteList && remoteList.length > 0) {
          const enrichedRemote = await enrichUserList(remoteList);
          await saveUserListLocally(enrichedRemote, user);
          return enrichedRemote;
        }
      } else {
        // Sincronización en segundo plano:
        fetchUserListFromFirestore().then(async (remoteList) => {
          if (!remoteList) return; // Si hubo error en red, no tocamos nada

          // Enriquecemos la lista remota antes de comparar
          const enrichedRemote = await enrichUserList(remoteList);

          const latestJson = await storage.getItem(currentKey);
          const currentLocalList: UserListItem[] = latestJson != null ? JSON.parse(latestJson) : [];

          const localMap = new Map(currentLocalList.filter(item => item && (item.animeId != null || item.anime?.id != null)).map(item => [String(item.animeId ?? item.anime?.id), item]));
          const remoteIds = new Set(enrichedRemote.filter(item => item && (item.animeId != null || item.anime?.id != null)).map(item => String(item.animeId ?? item.anime?.id)));
          let hasChanges = false;

          // 1. Detectar eliminaciones: Si está local pero NO en remoto, se borró en otro dispositivo
          for (const animeId of localMap.keys()) {
            if (!remoteIds.has(animeId)) {
              console.log(`[Sync] Detectada eliminación remota de anime ID: ${animeId}`);
              localMap.delete(animeId);
              hasChanges = true;
            }
          }

          // 2. Fusionar cambios: Agregar nuevos o actualizar existentes
          enrichedRemote.forEach(remoteItem => {
            if (!remoteItem || (remoteItem.animeId == null && (!remoteItem.anime || !remoteItem.anime.id))) return;
            const animeId = String(remoteItem.animeId ?? remoteItem.anime?.id);
            const localItem = localMap.get(animeId);

            if (!localItem) {
              localMap.set(animeId, remoteItem);
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
                localMap.set(animeId, remoteItem);
                hasChanges = true;
              }
            }
          });

          // 3. Re-enriquecer items locales con slug aún sin `anime` (placeholder
          //    que quedó cacheado en web) resolviendo contra el backend
          const placeholderIds = Array.from(localMap.entries())
            .filter(([, item]) => item && !!item.slug && !item.anime)
            .map(([animeId]) => animeId);

          if (placeholderIds.length > 0) {
            const placeholders = placeholderIds.map(id => localMap.get(id)!);
            const enrichedPlaceholders = await enrichUserList(placeholders);
            const localMapCopy = new Map(localMap);
            enrichedPlaceholders.forEach((item) => {
              if (!item || !item.anime) return;
              const animeId = String(item.animeId ?? item.anime?.id);
              localMapCopy.set(animeId, item);
              hasChanges = true;
            });
            localMap.clear();
            for (const [k, v] of localMapCopy) localMap.set(k, v);
          }

          if (hasChanges) {
            const mergedList = Array.from(localMap.values());
            console.log(`[Cache] Sincronización completa: Se aplicaron cambios y eliminaciones desde la nube.`);
            await saveUserListLocally(mergedList, user);
            animeListEvents.emit('listUpdated', mergedList);
          }
        }).catch(err => console.error('Error en sincronización de fondo:', err));
      }
    }

    return localList;
  } catch (e) {
    console.error('Error al obtener la lista de usuario:', e);
    return [];
  }
}

// Guarda en caché local
async function saveUserListLocally(list: UserListItem[], customUser?: any) {
  try {
    const storage = getAsyncStorage();
    const user = customUser !== undefined ? customUser : getUserId();
    const currentKey = getStorageKey(user);
    const jsonValue = JSON.stringify(list);
    await storage.setItem(currentKey, jsonValue);
  } catch (e) {
    console.error('Error al guardar la lista localmente:', e);
  }
}

// Migración: Pasa los datos de la lista de invitado a la cuenta de usuario
export async function mergeGuestListIntoUser(userUid: string) {
  try {
    const storage = getAsyncStorage();
    const guestJson = await storage.getItem(GUEST_STORAGE_KEY);
    if (!guestJson) return;

    const guestList: UserListItem[] = JSON.parse(guestJson);
    if (guestList.length === 0) {
      await storage.removeItem(GUEST_STORAGE_KEY);
      return;
    }

    console.log(`Migrando ${guestList.length} items de la lista de invitado...`);

    const remoteList = await fetchUserListFromFirestore();
    const remoteIds = new Set(remoteList.map(item => item.animeId || item.anime?.id));
    const mergedList = [...remoteList];

    for (const item of guestList) {
      const animeId = item.animeId || item.anime?.id;
      if (!remoteIds.has(animeId)) {
        await syncAnimeToFirestore(item);
        mergedList.push(item);
      }
    }

    const userKey = `@AnimeLT:user_list:${userUid}`;
    await storage.setItem(userKey, JSON.stringify(mergedList));
    await storage.removeItem(GUEST_STORAGE_KEY);

    console.log('Migración completada con éxito');
  } catch (error) {
    console.error('Error durante la migración de la lista:', error);
  }
}

//Limpia el caché local del usuario actual
export async function clearLocalList() {
  try {
    const storage = getAsyncStorage();
    const user = getUserId();
    const currentKey = getStorageKey(user);
    await storage.removeItem(currentKey);
  } catch (e) {
    console.error('Error al limpiar el caché local:', e);
  }
}

// Métodos para componentes y vistas
export async function getAnimeStatus(animeId: number): Promise<UserListStatus | null> {
  const list = await getUserList();
  const item = list.find(item => String(item.animeId ?? item.anime?.id) === String(animeId));
  return item ? item.status : null;
}

export async function getAnimeProgress(animeId: number): Promise<number> {
  const list = await getUserList();
  const item = list.find(item => String(item.animeId ?? item.anime?.id) === String(animeId));
  return item ? item.progress : 0;
}

export async function addOrUpdateAnimeInList(anime: Anime, status: UserListStatus, progress: number = 0): Promise<UserListItem[]> {
  const currentList = await getUserList();
  const existingIndex = currentList.findIndex(item => String(item.animeId ?? item.anime?.id) === String(anime.id));

  const newItem: UserListItem = {
    animeId: anime.id,
    slug: anime.slug,
    anime,
    status,
    progress,
    addedAt: existingIndex > -1 ? currentList[existingIndex].addedAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex > -1) {
    currentList[existingIndex] = newItem;
  } else {
    currentList.push(newItem);
  }

  const user = getUserId();

  // Guardamos al mismo tiempo en cache y firestore
  const promises: Promise<any>[] = [];
  promises.push(saveUserListLocally(currentList, user));
  if (user) {
    promises.push(syncAnimeToFirestore(newItem));
  }

  await Promise.all(promises);

  animeListEvents.emit('listUpdated', currentList);
  return currentList;
}

export async function removeAnimeFromList(animeId: number): Promise<UserListItem[]> {
  const currentList = await getUserList();
  const updatedList = currentList.filter(item => String(item.animeId ?? item.anime?.id) !== String(animeId));

  const user = getUserId();

  const promises: Promise<any>[] = [];
  promises.push(saveUserListLocally(updatedList, user));
  if (user) {
    promises.push(removeFromFirestore(animeId));
  }

  await Promise.all(promises);

  animeListEvents.emit('listUpdated', updatedList);
  return updatedList;
}

export async function updateAnimeProgress(animeId: number, progress: number): Promise<UserListItem[]> {
  const currentList = await getUserList();
  const existingIndex = currentList.findIndex(item => String(item.animeId ?? item.anime?.id) === String(animeId));

  if (existingIndex > -1) {
    currentList[existingIndex].progress = progress;
    currentList[existingIndex].updatedAt = new Date().toISOString();

    const user = getUserId();

    const promises: Promise<any>[] = [];
    promises.push(saveUserListLocally(currentList, user));
    if (user) {
      promises.push(updateProgressInFirestore(animeId, progress));
    }

    await Promise.all(promises);
  }

  return currentList;
}