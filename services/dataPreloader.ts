import { getUserList, UserListItem, animeListEvents } from './animeList';
import { getTopAnimeList } from './animeTop';
import { getUserId } from '../src/hooks/userHelper';

let cachedUserList: UserListItem[] | null = null;
let cachedTopAnime: any[] | null = null;
let preloaded = false;
let preloadPromise: Promise<void> | null = null;

// Mantener la caché del preloader en sincronía: cada cambio de la lista
// (añadir/quitar/actualizar) actualiza el snapshot en memoria para que
// Colección muestre el dato inmediatamente, sin reiniciar la app.
const syncCacheFromList = (list: UserListItem[]) => {
  cachedUserList = list;
};
animeListEvents.on('listUpdated', syncCacheFromList);

export async function preloadAllData(): Promise<void> {
  if (preloadPromise) return preloadPromise;

  const uid = getUserId();
  if (!uid) {
    preloaded = true;
    return;
  }

  preloadPromise = (async () => {
    try {
      const [userList, topAnime] = await Promise.all([
        getUserList(),
        getTopAnimeList(),
      ]);
      cachedUserList = userList;
      cachedTopAnime = topAnime;
      preloaded = true;
    } catch (e) {
      console.error('[Preloader] Error:', e);
      preloaded = true;
    }
  })();

  return preloadPromise;
}

export function getPreloadedUserList(): UserListItem[] | null {
  return cachedUserList;
}

export function getPreloadedTopAnime(): any[] | null {
  return cachedTopAnime;
}

export function isPreloaded(): boolean {
  return preloaded;
}

export function getPreloadPromise(): Promise<void> | null {
  return preloadPromise;
}

export function clearAllCaches(): void {
  cachedUserList = null;
  cachedTopAnime = null;
  preloaded = false;
  preloadPromise = null;
}
