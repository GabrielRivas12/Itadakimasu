import { Platform } from 'react-native';
import { Anime } from './anilist';
import { 
  syncAnimeToFirestore,   
  fetchUserListFromFirestore, 
  removeFromFirestore, 
  updateProgressInFirestore 
} from './firestore';

// 🔄 Importamos tu servicio de autenticación seguro
import { getCurrentUser } from './auth'; 
import { EventEmitter } from 'eventemitter3';

export const animeListEvents = new EventEmitter();

export type UserListStatus = 'En Proceso' | 'Terminado' | 'Por Ver';

export interface UserListItem {
  anime: Anime;
  status: UserListStatus;
  progress: number;
  addedAt: string;
  updatedAt: string;
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
        if (remoteList) {
          await saveUserListLocally(remoteList, user);
          return remoteList;
        }
      } else {
        // Sincronización inteligente en segundo plano:
        fetchUserListFromFirestore().then(async (remoteList) => {
          if (!remoteList) return; // Si hubo error en red, no tocamos nada

          const latestJson = await storage.getItem(currentKey);
          const currentLocalList: UserListItem[] = latestJson != null ? JSON.parse(latestJson) : [];
          
          const localMap = new Map(currentLocalList.map(item => [String(item.anime.id), item]));
          const remoteIds = new Set(remoteList.map(item => String(item.anime.id)));
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
          remoteList.forEach(remoteItem => {
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

/**
 * Migración: Pasa los datos de la lista de invitado a la cuenta de usuario
 */
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
    const remoteIds = new Set(remoteList.map(item => item.anime.id));
    const mergedList = [...remoteList];

    for (const item of guestList) {
      if (!remoteIds.has(item.anime.id)) {
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

/**
 * Limpia el caché local del usuario actual
 */
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

/**
 * Métodos para componentes y vistas
 */

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