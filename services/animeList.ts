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

export async function getUserList(): Promise<UserListItem[]> {
  try {
    const user = getCurrentUser(); 

    // 🌐 ESTRATEGIA PARA WEB: Llamada directa a Firebase sin usar AsyncStorage
    if (Platform.OS === 'web') {
      if (user) {
        console.log(`🌐 [Web] Obteniendo lista directamente de Firestore para: ${user.uid}`);
        return await fetchUserListFromFirestore();
      }
      return []; // Si no hay usuario logueado en Web, retorna lista vacía
    }

    // 📱 ESTRATEGIA PARA MÓVIL: Persistencia local con AsyncStorage mediante require dinámico
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const currentKey = getStorageKey(user);
    
    const jsonValue = await AsyncStorage.getItem(currentKey);
    let localList: UserListItem[] = jsonValue != null ? JSON.parse(jsonValue) : [];

    // Si el móvil no tiene caché pero el usuario está logueado, descarga de Firestore
    if (user && localList.length === 0) {
      console.log(`📱 [Móvil] Caché vacío para ${user.uid}, sincronizando desde Firestore...`);
      const remoteList = await fetchUserListFromFirestore();
      if (remoteList.length > 0) {
        await saveUserListLocally(remoteList, user);
        return remoteList;
      }
    }

    return localList;
  } catch (e) {
    console.error('Error al obtener la lista de usuario:', e);
    return [];
  }
}

// Guarda en caché local (Solo ejecutable en Móvil)
async function saveUserListLocally(list: UserListItem[], customUser?: any) {
  if (Platform.OS === 'web') return; // En la web ignoramos por completo el almacenamiento local
  
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const user = customUser !== undefined ? customUser : getCurrentUser();
    const currentKey = getStorageKey(user);
    const jsonValue = JSON.stringify(list);
    await AsyncStorage.setItem(currentKey, jsonValue);
  } catch (e) {
    console.error('Error al guardar la lista localmente:', e);
  }
}

/**
 * Migración: Pasa los datos de la lista de invitado a la cuenta de usuario (Solo Móvil)
 */
export async function mergeGuestListIntoUser(userUid: string) {
  if (Platform.OS === 'web') return; // Desactivado en Web

  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const guestJson = await AsyncStorage.getItem(GUEST_STORAGE_KEY);
    if (!guestJson) return;

    const guestList: UserListItem[] = JSON.parse(guestJson);
    if (guestList.length === 0) {
      await AsyncStorage.removeItem(GUEST_STORAGE_KEY);
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
    await AsyncStorage.setItem(userKey, JSON.stringify(mergedList));
    await AsyncStorage.removeItem(GUEST_STORAGE_KEY);
    
    console.log('Migración completada con éxito');
  } catch (error) {
    console.error('Error durante la migración de la lista:', error);
  }
}

/**
 * Limpia el caché local del usuario actual (Solo Móvil)
 */
export async function clearLocalList() {
  if (Platform.OS === 'web') return; // Desactivado en Web

  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const user = getCurrentUser();
    const currentKey = getStorageKey(user);
    await AsyncStorage.removeItem(currentKey);
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

  const user = getCurrentUser();
  
  // Guardamos localmente solo si no es entorno Web
  if (Platform.OS !== 'web') {
    await saveUserListLocally(currentList, user);
  }
  
  if (user) { 
    await syncAnimeToFirestore(newItem);
  }

  animeListEvents.emit('listUpdated', currentList);
  return currentList;
}

export async function removeAnimeFromList(animeId: number): Promise<UserListItem[]> {
  const currentList = await getUserList();
  const updatedList = currentList.filter(item => item.anime.id !== animeId);

  const user = getCurrentUser();
  
  if (Platform.OS !== 'web') {
    await saveUserListLocally(updatedList, user);
  }

  if (user) { 
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
    
    const user = getCurrentUser();
    
    if (Platform.OS !== 'web') {
      await saveUserListLocally(currentList, user);
    }

    if (user) { 
      await updateProgressInFirestore(animeId, progress);
    }
  }

  return currentList;
}