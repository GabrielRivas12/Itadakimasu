import AsyncStorage from '@react-native-async-storage/async-storage';
import { Anime } from './anilist';
import { cacheAnimeDetails } from './cache';
import { 
  syncAnimeToFirestore,   
  fetchUserListFromFirestore, 
  removeFromFirestore, 
  updateProgressInFirestore 
} from './firestore';
import auth from '@react-native-firebase/auth';
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

// Generamos una clave de almacenamiento única por usuario
const getStorageKey = () => {
  const user = auth().currentUser;
  return user ? `@AnimeLT:user_list:${user.uid}` : GUEST_STORAGE_KEY;
};

export async function getUserList(): Promise<UserListItem[]> {
  try {
    const user = auth().currentUser;
    const currentKey = getStorageKey();
    
    // 1. Intentar obtener de Caché local específico del usuario
    const jsonValue = await AsyncStorage.getItem(currentKey);
    let localList: UserListItem[] = jsonValue != null ? JSON.parse(jsonValue) : [];

    // 2. Si el usuario está logueado y el caché local está vacío, sincronizar con Firestore
    if (user && localList.length === 0) {
      console.log(`Cache vacío para ${user.uid}, sincronizando desde Firestore...`);
      const remoteList = await fetchUserListFromFirestore();
      if (remoteList.length > 0) {
        await saveUserListLocally(remoteList);
        return remoteList;
      }
    }

    return localList;
  } catch (e) {
    console.error('Error al obtener la lista de usuario:', e);
    return [];
  }
}

async function saveUserListLocally(list: UserListItem[]) {
  try {
    const currentKey = getStorageKey();
    const jsonValue = JSON.stringify(list);
    await AsyncStorage.setItem(currentKey, jsonValue);
  } catch (e) {
    console.error('Error al guardar la lista localmente:', e);
  }
}

/**
 * Migración: Pasa los datos de la lista de invitado a la cuenta de usuario logueado
 */
export async function mergeGuestListIntoUser(userUid: string) {
  try {
    // 1. Obtener lista de invitado
    const guestJson = await AsyncStorage.getItem(GUEST_STORAGE_KEY);
    if (!guestJson) return;

    const guestList: UserListItem[] = JSON.parse(guestJson);
    if (guestList.length === 0) {
      await AsyncStorage.removeItem(GUEST_STORAGE_KEY);
      return;
    }

    console.log(`Migrando ${guestList.length} items de la lista de invitado...`);

    // 2. Obtener lista actual de Firestore del usuario
    const remoteList = await fetchUserListFromFirestore();
    const remoteIds = new Set(remoteList.map(item => item.anime.id));

    const mergedList = [...remoteList];

    // 3. Comparar y subir lo que falte
    for (const item of guestList) {
      if (!remoteIds.has(item.anime.id)) {
        await syncAnimeToFirestore(item);
        mergedList.push(item);
      }
    }

    // 4. Guardar lista combinada en el caché del usuario y borrar el de invitado
    const userKey = `@AnimeLT:user_list:${userUid}`;
    await AsyncStorage.setItem(userKey, JSON.stringify(mergedList));
    await AsyncStorage.removeItem(GUEST_STORAGE_KEY);
    
    console.log('Migración completada con éxito');
  } catch (error) {
    console.error('Error durante la migración de la lista:', error);
  }
}

/**
 * Limpia el caché local del usuario actual (útil para logout)
 */
export async function clearLocalList() {
  try {
    const currentKey = getStorageKey();
    await AsyncStorage.removeItem(currentKey);
    console.log(`Cache local eliminado para la clave: ${currentKey}`);
  } catch (e) {
    console.error('Error al limpiar el caché local:', e);
  }
}

/**
 * Métodos para AnimeDetailsPage y otras vistas
 */

export async function getAnimeStatus(animeId: number): Promise<UserListStatus | null> {
  const list = await getUserList();
  const item = list.find(item => item.anime.id === animeId);
  return item ? item.status : null;
}

export async function getAnimeProgress(animeId: number): Promise<number> {
  const list = await getUserList();
  const item = list.find(item => item.anime.id === animeId);
  return item ? item.progress : 0;
}

export async function addOrUpdateAnimeInList(anime: Anime, status: UserListStatus, progress: number = 0): Promise<UserListItem[]> {
  const currentList = await getUserList();
  const existingIndex = currentList.findIndex(item => item.anime.id === anime.id);

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

  await saveUserListLocally(currentList);
  
  if (auth().currentUser) {
    await syncAnimeToFirestore(newItem);
  }

  animeListEvents.emit('listUpdated', currentList);

  return currentList;
}

export async function removeAnimeFromList(animeId: number): Promise<UserListItem[]> {
  const currentList = await getUserList();
  const updatedList = currentList.filter(item => item.anime.id !== animeId);

  await saveUserListLocally(updatedList);

  if (auth().currentUser) {
    await removeFromFirestore(animeId);
  }

  animeListEvents.emit('listUpdated', updatedList);

  return updatedList;
}

export async function updateAnimeProgress(animeId: number, progress: number): Promise<UserListItem[]> {
  const currentList = await getUserList();
  const existingIndex = currentList.findIndex(item => item.anime.id === animeId);

  if (existingIndex > -1) {
    currentList[existingIndex].progress = progress;
    currentList[existingIndex].updatedAt = new Date().toISOString();
    
    await saveUserListLocally(currentList);

    if (auth().currentUser) {
      await updateProgressInFirestore(animeId, progress);
    }

    animeListEvents.emit('listUpdated', currentList);
  }

  return currentList;
}
