import { Platform } from 'react-native';
import { UserListItem } from './animeList';
import { Anime } from './anilist';
import { asegurarFirebaseApp } from './firebaseConfig';

// Importaciones modulares para React Native Firebase (Elimina las advertencias)
import { 
  getFirestore,
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp 
} from '@react-native-firebase/firestore';

// Instancia de Firestore para Web diferida
let webDb: any = null;
function getWebFirestore() {
  if (Platform.OS === 'web') {
    asegurarFirebaseApp();
    if (!webDb) {
      const { getFirestore } = require('firebase/firestore');
      webDb = getFirestore();
    }
  }
  return webDb;
}

const ROOT_COLLECTION = 'userList';
const SUB_COLLECTION = 'animes';
const TOP_SUB_COLLECTION = 'topAnime';

function sanitizeObject(obj: any): any {
  if (obj === null) return null;
  if (obj === undefined) return "N/A";
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  if (typeof obj === 'object') {
    const clean: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        clean[key] = val === undefined ? "N/A" : sanitizeObject(val);
      }
    }
    return clean;
  }
  return obj;
}

// Sincroniza un anime a Firestore
export async function syncAnimeToFirestore(item: UserListItem): Promise<void> {
  try {
    const { getCurrentUser } = require('./auth');
    const user = getCurrentUser();
    if (!user) {
      console.warn('No se puede sincronizar: No hay usuario autenticado.');
      return;
    }

    asegurarFirebaseApp();

    const cleanItem = sanitizeObject(item);
    if (cleanItem) {
      delete cleanItem.anime;
    }

    const animeId = String(item.anime.id);
    console.log(`Sincronizando anime ${animeId} (${item.anime.title?.romaji})...`);

    if (Platform.OS === 'web') {
      const { doc: webDoc, setDoc: webSetDoc, serverTimestamp: webServerTimestamp } = require('firebase/firestore');
      const db = getWebFirestore();
      
      const docRef = webDoc(db, ROOT_COLLECTION, user.uid, SUB_COLLECTION, animeId);
      await webSetDoc(docRef, {
        ...cleanItem,
        animeId: Number(animeId),
        userId: user.uid,
        updatedAt: webServerTimestamp(),
      }, { merge: true });
    } else {
      // Uso de la API modular nativa
      const db = getFirestore();
      const docRef = doc(db, ROOT_COLLECTION, user.uid, SUB_COLLECTION, animeId);
      
      await setDoc(docRef, {
        ...cleanItem,
        animeId: Number(animeId),
        userId: user.uid,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
    console.log(`Sincronización exitosa para ID: ${animeId}`);
  } catch (error) {
    console.error('Error sincronizando anime:', error);
  }
}

// Obtiene la lista de usuario de Firestore
export async function fetchUserListFromFirestore(): Promise<UserListItem[]> {
  try {
    const { getCurrentUser } = require('./auth');
    const user = getCurrentUser();
    if (!user) return [];

    asegurarFirebaseApp();

    if (Platform.OS === 'web') {
      const { collection: webCollection, getDocs: webGetDocs } = require('firebase/firestore');
      const db = getWebFirestore();
      
      const q = webCollection(db, ROOT_COLLECTION, user.uid, SUB_COLLECTION);
      const querySnapshot = await webGetDocs(q);
      
      const list: UserListItem[] = [];
      querySnapshot.forEach((docSnapshot: any) => {
        const data = docSnapshot.data();
        if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
          data.updatedAt = data.updatedAt.toDate().toISOString();
        }
        if (data.addedAt && typeof data.addedAt.toDate === 'function') {
          data.addedAt = data.addedAt.toDate().toISOString();
        }
        list.push(data as UserListItem);
      });
      return list;
    } else {
      // Uso de la API modular nativa
      const db = getFirestore();
      const q = collection(db, ROOT_COLLECTION, user.uid, SUB_COLLECTION);
      const snapshot = await getDocs(q);

      return snapshot.docs.map((docSnapshot: any) => {
        const data = docSnapshot.data();
        if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
          data.updatedAt = data.updatedAt.toDate().toISOString();
        }
        if (data.addedAt && typeof data.addedAt.toDate === 'function') {
          data.addedAt = data.addedAt.toDate().toISOString();
        }
        return data as UserListItem;
      });
    }
  } catch (error) {
    console.error('Error obteniendo lista:', error);
    return [];
  }
}

// Elimina un anime de Firestore
export async function removeFromFirestore(animeId: number): Promise<void> {
  try {
    const { getCurrentUser } = require('./auth');
    const user = getCurrentUser();
    if (!user) return;

    asegurarFirebaseApp();

    const id = String(animeId);
    console.log(`Eliminando anime ${id}...`);

    if (Platform.OS === 'web') {
      const { doc: webDoc, deleteDoc: webDeleteDoc } = require('firebase/firestore');
      const db = getWebFirestore();
      const docRef = webDoc(db, ROOT_COLLECTION, user.uid, SUB_COLLECTION, id);
      await webDeleteDoc(docRef);
    } else {
      // Uso de la API modular nativa
     const db = getFirestore();
      const docRef = doc(db, ROOT_COLLECTION, user.uid, SUB_COLLECTION, id);
      await deleteDoc(docRef);
    }
    console.log(`Anime eliminado con éxito.`);
  } catch (error) {
    console.error('Error eliminando anime:', error);
  }
}

// Actualiza el progreso de un anime en Firestore
export async function updateProgressInFirestore(animeId: number, progress: number): Promise<void> {
  try {
    const { getCurrentUser } = require('./auth');
    const user = getCurrentUser();
    if (!user) return;

    asegurarFirebaseApp();

    const id = String(animeId);
    console.log(`⏳ [Firestore] Actualizando progreso de ${id} a ${progress}...`);

    if (Platform.OS === 'web') {
      const { doc: webDoc, updateDoc: webUpdateDoc, serverTimestamp: webServerTimestamp } = require('firebase/firestore');
      const db = getWebFirestore();
      const docRef = webDoc(db, ROOT_COLLECTION, user.uid, SUB_COLLECTION, id);
      await webUpdateDoc(docRef, {
        progress,
        updatedAt: webServerTimestamp(),
      });
    } else {
      // Uso de la API modular nativa
      const db = getFirestore();
      const docRef = doc(db, ROOT_COLLECTION, user.uid, SUB_COLLECTION, id);
      await updateDoc(docRef, {
        progress,
        updatedAt: serverTimestamp(),
      });
    }
    console.log(`Progreso actualizado para ID: ${id}`);
  } catch (error) {
    console.error('Error actualizando progreso:', error);
  }
}

export interface TopAnimeItem {
  animeId: number;
  rank: number;
  addedAt: string;
  updatedAt: string;
  anime?: Anime;
}

export async function syncTopAnimeToFirestore(items: TopAnimeItem[]): Promise<void> {
  try {
    const { getCurrentUser } = require('./auth');
    const user = getCurrentUser();
    if (!user) return;

    asegurarFirebaseApp();

    if (Platform.OS === 'web') {
      const { doc: webDoc, setDoc: webSetDoc, serverTimestamp: webServerTimestamp } = require('firebase/firestore');
      const db = getWebFirestore();
      const batch = items.map(item => {
        const { anime, ...cleanData } = item;
        const clean = sanitizeObject(cleanData);
        const ref = webDoc(db, ROOT_COLLECTION, user.uid, TOP_SUB_COLLECTION, String(item.animeId));
        return webSetDoc(ref, { ...clean, userId: user.uid, updatedAt: webServerTimestamp() }, { merge: true });
      });
      await Promise.all(batch);
    } else {
      // Uso de la API modular nativa
      const db = getFirestore();
      const batch = items.map(item => {
        const { anime, ...cleanData } = item;
        const clean = sanitizeObject(cleanData);
        const docRef = doc(db, ROOT_COLLECTION, user.uid, TOP_SUB_COLLECTION, String(item.animeId));
        return setDoc(docRef, { 
          ...clean, 
          userId: user.uid, 
          updatedAt: serverTimestamp() 
        }, { merge: true });
      });
      await Promise.all(batch);
    }
  } catch (error) {
    console.error('Error sincronizando top anime:', error);
  }
}

export async function fetchTopAnimeFromFirestore(): Promise<TopAnimeItem[]> {
  try {
    const { getCurrentUser } = require('./auth');
    const user = getCurrentUser();
    if (!user) return [];

    asegurarFirebaseApp();

    if (Platform.OS === 'web') {
      const { collection: webCollection, getDocs: webGetDocs } = require('firebase/firestore');
      const db = getWebFirestore();
      const q = webCollection(db, ROOT_COLLECTION, user.uid, TOP_SUB_COLLECTION);
      const querySnapshot = await webGetDocs(q);
      const list: TopAnimeItem[] = [];
      querySnapshot.forEach((docSnapshot: any) => {
        const data = docSnapshot.data();
        if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
          data.updatedAt = data.updatedAt.toDate().toISOString();
        }
        if (data.addedAt && typeof data.addedAt.toDate === 'function') {
          data.addedAt = data.addedAt.toDate().toISOString();
        }
        list.push(data as TopAnimeItem);
      });
      return list;
    } else {
      // Uso de la API modular nativa
      const db = getFirestore();
      const q = collection(db, ROOT_COLLECTION, user.uid, TOP_SUB_COLLECTION);
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map((docSnapshot: any) => {
        const data = docSnapshot.data();
        if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
          data.updatedAt = data.updatedAt.toDate().toISOString();
        }
        if (data.addedAt && typeof data.addedAt.toDate === 'function') {
          data.addedAt = data.addedAt.toDate().toISOString();
        }
        return data as TopAnimeItem;
      });
    }
  } catch (error) {
    console.error('Error obteniendo top anime:', error);
    return [];
  }
}

export async function removeTopAnimeFromFirestore(animeId: number): Promise<void> {
  try {
    const { getCurrentUser } = require('./auth');
    const user = getCurrentUser();
    if (!user) return;

    asegurarFirebaseApp();

    if (Platform.OS === 'web') {
      const { doc: webDoc, deleteDoc: webDeleteDoc } = require('firebase/firestore');
      const db = getWebFirestore();
      await webDeleteDoc(webDoc(db, ROOT_COLLECTION, user.uid, TOP_SUB_COLLECTION, String(animeId)));
    } else {
      // Uso de la API modular nativa
      const db = getFirestore();
      const docRef = doc(db, ROOT_COLLECTION, user.uid, TOP_SUB_COLLECTION, String(animeId));
      await deleteDoc(docRef);
    }
  } catch (error) {
    console.error('Error eliminando top anime:', error);
  }
}