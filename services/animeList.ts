import { Platform } from 'react-native';
import { Anime, fetchAnimesByIds } from './anilist';
import {
  syncAnimeToFirestore, fetchUserListFromFirestore,
  removeFromFirestore, updateProgressInFirestore
} from './firestore';
import { getCachedAnimeDetails, cacheAnimeDetails } from './cache';
import { getCurrentUser } from './auth';
import { EventEmitter } from 'eventemitter3';

export const animeListEvents = new EventEmitter();

export type UserListStatus = 'En Proceso' | 'Terminado' | 'Por Ver';

export interface UserListItem {
  animeId: number;
  anime: Anime;
  status: UserListStatus;
  progress: number;
  addedAt: string;
  updatedAt: string;
}

// Función para enriquecer la lista del usuario con detalles completos de anime
async function enrichUserList(minimalList: any[]): Promise<UserListItem[]> {
  if (!minimalList || minimalList.length === 0) return [];

  const enrichedList: UserListItem[] = [];
  const missingIds: number[] = [];

  // 1. Intentar recuperar del caché primero
  for (const item of minimalList) {
    const animeId = item.animeId || (item.anime && item.anime.id);
    if (!animeId) continue;

    const cachedAnime = await getCachedAnimeDetails(Number(animeId));
    if (cachedAnime) {
      enrichedList.push({
        ...item,
        anime: cachedAnime
      });
    } else {
      missingIds.push(Number(animeId));
    }
  }

  // 2. Si faltan datos, pedirlos a AniList
  if (missingIds.length > 0) {
    console.log(`[Sync] Enriqueciendo ${missingIds.length} animes desde la API...`);
    const fetchedAnimes = await fetchAnimesByIds(missingIds);

    // Guardar en caché lo que acabamos de traer
    for (const anime of fetchedAnimes) {
      await cacheAnimeDetails(anime.id, anime);

      const originalItem = minimalList.find(i => (i.animeId || i.anime?.id) == anime.id);
      if (originalItem) {
        enrichedList.push({
          ...originalItem,
          anime: anime
        });
      }
    }
  }

  // Ordenar por updatedAt descendente
  return enrichedList.sort((a, b) =>
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
    const user = getCurrentUser();

    const storage = getAsyncStorage();
    const currentKey = getStorageKey(user);

    // 1. Obtener lo que hay en caché local inmediatamente
    const jsonValue = await storage.getItem(currentKey);
    const localList: UserListItem[] = jsonValue != null ? JSON.parse(jsonValue) : [];

    // 2. Si el usuario está logueado, sincronizamos con Firestore en segundo plano
    if (user) {
      // Si el caché está vacío, esperamos a la red obligatoriamente para la primera carga
      if (localList.length === 0) {
        console.log(`[Cache] Cache vacío para ${user.uid}, esperando a Firestore...`);
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

          const localMap = new Map(currentLocalList.filter(item => item && item.anime).map(item => [String(item.anime.id), item]));
          const remoteIds = new Set(enrichedRemote.filter(item => item && item.anime).map(item => String(item.anime.id)));
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
            if (!remoteItem || !remoteItem.anime) return;
            const animeId = String(remoteItem.anime.id);
            const localItem = localMap.get(animeId);

            if (!localItem) {
              localMap.set(animeId, remoteItem);
              hasChanges = true;
            } else {
              const remoteDate = new Date(remoteItem.updatedAt || 0).getTime();
              const localDate = new Date(localItem.updatedAt || 0).getTime();

              if (remoteDate > localDate) {
                localMap.set(animeId, remoteItem);
                hasChanges = true;
              }
            }
          });

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
    const user = customUser !== undefined ? customUser : getCurrentUser();
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
    const user = getCurrentUser();
    const currentKey = getStorageKey(user);
    await storage.removeItem(currentKey);
    console.log(`Cache local eliminado para la clave: ${currentKey}`);
  } catch (e) {
    console.error('Error al limpiar el caché local:', e);
  }
}

// Métodos para componentes y vistas
export async function getAnimeStatus(animeId: number): Promise<UserListStatus | null> {
  const list = await getUserList();
  const item = list.find(item => String(item.anime.id) === String(animeId));
  return item ? item.status : null;
}

export async function getAnimeProgress(animeId: number): Promise<number> {
  const list = await getUserList();
  const item = list.find(item => String(item.anime.id) === String(animeId));
  return item ? item.progress : 0;
}

export async function addOrUpdateAnimeInList(anime: Anime, status: UserListStatus, progress: number = 0): Promise<UserListItem[]> {
  const currentList = await getUserList();
  const existingIndex = currentList.findIndex(item => String(item.anime.id) === String(anime.id));

  const newItem: UserListItem = {
    animeId: anime.id,
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

  const user = getCurrentUser();

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
  const updatedList = currentList.filter(item => String(item.anime.id) !== String(animeId));

  const user = getCurrentUser();

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
  const existingIndex = currentList.findIndex(item => String(item.anime.id) === String(animeId));

  if (existingIndex > -1) {
    currentList[existingIndex].progress = progress;
    currentList[existingIndex].updatedAt = new Date().toISOString();

    const user = getCurrentUser();

    const promises: Promise<any>[] = [];
    promises.push(saveUserListLocally(currentList, user));
    if (user) {
      promises.push(updateProgressInFirestore(animeId, progress));
    }

    await Promise.all(promises);
  }

  return currentList;
}