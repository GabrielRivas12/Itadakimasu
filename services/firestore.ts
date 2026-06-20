import { Platform } from 'react-native';
import { UserListItem } from './animeList';
import { Anime } from './anilist';
import { asegurarFirebaseApp } from './firebaseConfig';

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
      const { doc, setDoc, serverTimestamp } = require('firebase/firestore');
      const db = getWebFirestore();
      
      const docRef = doc(db, ROOT_COLLECTION, user.uid, SUB_COLLECTION, animeId);
      await setDoc(docRef, {
        ...cleanItem,
        animeId: Number(animeId),
        userId: user.uid,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      const firestore = require('@react-native-firebase/firestore').default;

      await firestore()
        .collection(ROOT_COLLECTION)
        .doc(user.uid)
        .collection(SUB_COLLECTION)
        .doc(animeId)
        .set({
          ...cleanItem,
          animeId: Number(animeId),
          userId: user.uid,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    console.log(`Sincronización exitosa para ID: ${animeId}`);
  } catch (error) {
    console.error('Error sincronizando anime:', error);
  }
}

//Obtiene la lista de usuario de Firestore
export async function fetchUserListFromFirestore(): Promise<UserListItem[]> {
  try {
    const { getCurrentUser } = require('./auth');
    const user = getCurrentUser();
    if (!user) return [];

    asegurarFirebaseApp();

    if (Platform.OS === 'web') {
      const { collection, getDocs } = require('firebase/firestore');
      const db = getWebFirestore();
      
      const q = collection(db, ROOT_COLLECTION, user.uid, SUB_COLLECTION);
      const querySnapshot = await getDocs(q);
      
      const list: UserListItem[] = [];
      querySnapshot.forEach((docSnapshot: any) => {
        const data = docSnapshot.data();
        // Convertir Timestamp a string ISO si es necesario
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
      const firestore = require('@react-native-firebase/firestore').default;
      
      const snapshot = await firestore()
        .collection(ROOT_COLLECTION)
        .doc(user.uid)
        .collection(SUB_COLLECTION)
        .get();

      return snapshot.docs.map((docSnapshot: any) => {
        const data = docSnapshot.data();
        // Convertir Timestamp a string ISO si es necesario en móvil también
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
      const { doc, deleteDoc } = require('firebase/firestore');
      const db = getWebFirestore();
      const docRef = doc(db, ROOT_COLLECTION, user.uid, SUB_COLLECTION, id);
      await deleteDoc(docRef);
    } else {
      const firestore = require('@react-native-firebase/firestore').default;
      await firestore()
        .collection(ROOT_COLLECTION)
        .doc(user.uid)
        .collection(SUB_COLLECTION)
        .doc(id)
        .delete();
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
      const { doc, updateDoc, serverTimestamp } = require('firebase/firestore');
      const db = getWebFirestore();
      const docRef = doc(db, ROOT_COLLECTION, user.uid, SUB_COLLECTION, id);
      await updateDoc(docRef, {
        progress,
        updatedAt: serverTimestamp(),
      });
    } else {
      const firestore = require('@react-native-firebase/firestore').default;

      await firestore()
        .collection(ROOT_COLLECTION)
        .doc(user.uid)
        .collection(SUB_COLLECTION)
        .doc(id)
        .update({
          progress,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    }
    console.log(`Progreso actualizado para ID: ${id}`);
  } catch (error) {
    console.error('Error actualizando progreso:', error);
  }
}

export interface TopAnimeItem {
  animeId: number;
  anime: Anime;
  rank: number;
  addedAt: string;
}

export async function syncTopAnimeToFirestore(items: TopAnimeItem[]): Promise<void> {
  try {
    const { getCurrentUser } = require('./auth');
    const user = getCurrentUser();
    if (!user) return;

    asegurarFirebaseApp();

    if (Platform.OS === 'web') {
      const { doc, setDoc, serverTimestamp } = require('firebase/firestore');
      const db = getWebFirestore();
      const batch = items.map(item => {
        const clean = sanitizeObject(item);
        const ref = doc(db, ROOT_COLLECTION, user.uid, TOP_SUB_COLLECTION, String(item.animeId));
        return setDoc(ref, { ...clean, userId: user.uid, updatedAt: serverTimestamp() }, { merge: true });
      });
      await Promise.all(batch);
    } else {
      const firestore = require('@react-native-firebase/firestore').default;
      const batch = items.map(item => {
        const clean = sanitizeObject(item);
        return firestore()
          .collection(ROOT_COLLECTION)
          .doc(user.uid)
          .collection(TOP_SUB_COLLECTION)
          .doc(String(item.animeId))
          .set({ ...clean, userId: user.uid, updatedAt: firestore.FieldValue.serverTimestamp() }, { merge: true });
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
      const { collection, getDocs } = require('firebase/firestore');
      const db = getWebFirestore();
      const q = collection(db, ROOT_COLLECTION, user.uid, TOP_SUB_COLLECTION);
      const querySnapshot = await getDocs(q);
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
      const firestore = require('@react-native-firebase/firestore').default;
      const snapshot = await firestore()
        .collection(ROOT_COLLECTION)
        .doc(user.uid)
        .collection(TOP_SUB_COLLECTION)
        .get();
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
      const { doc, deleteDoc } = require('firebase/firestore');
      const db = getWebFirestore();
      await deleteDoc(doc(db, ROOT_COLLECTION, user.uid, TOP_SUB_COLLECTION, String(animeId)));
    } else {
      const firestore = require('@react-native-firebase/firestore').default;
      await firestore()
        .collection(ROOT_COLLECTION)
        .doc(user.uid)
        .collection(TOP_SUB_COLLECTION)
        .doc(String(animeId))
        .delete();
    }
  } catch (error) {
    console.error('Error eliminando top anime:', error);
  }
}
