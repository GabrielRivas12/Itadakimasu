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

    // 🌐 ESTRATEGIA PARA WEB: Sin caché local, siempre tiempo real
    if (Platform.OS === 'web') {
      if (user) return await fetchUserListFromFirestore();
      return []; 
    }

    // 📱 ESTRATEGIA PARA MÓVIL: Stale-While-Revalidate (Caché primero, luego red)
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const currentKey = getStorageKey(user);
    
    // 1. Obtener lo que hay en caché local inmediatamente
    const jsonValue = await AsyncStorage.getItem(currentKey);
    const localList: UserListItem[] = jsonValue != null ? JSON.parse(jsonValue) : [];

    // 2. Si el usuario está logueado, sincronizamos con Firestore en segundo plano
    if (user) {
      // Si el caché está vacío, esperamos a la red obligatoriamente para la primera carga
      if (localList.length === 0) {
        console.log(`📱 [Móvil] Cache vacío para ${user.uid}, esperando a Firestore...`);
        const remoteList = await fetchUserListFromFirestore();
        await saveUserListLocally(remoteList, user);
        return remoteList;
      } else {
        // Sincronización silenciosa: disparamos y retornamos el caché actual
        fetchUserListFromFirestore().then(async (remoteList) => {
          const localCompare = JSON.stringify(localList);
          const remoteCompare = JSON.stringify(remoteList);
          
          if (localCompare !== remoteCompare) {
            console.log(`📱 [Móvil] Sincronización completa: Se detectaron cambios en la nube.`);
            await saveUserListLocally(remoteList, user);
            // Notificamos a los componentes (como useProfile) para que se refresquen
            animeListEvents.emit('listUpdated', remoteList);
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
  const updatedList = currentList.filter(item => String(item.anime.id) !== String(animeId));

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
  const existingIndex = currentList.findIndex(item => String(item.anime.id) === String(animeId));

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