import { Platform } from 'react-native';
import { UserListItem } from './animeList';
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

/**
 * Sincroniza un anime a Firestore
 */
export async function syncAnimeToFirestore(item: UserListItem): Promise<void> {
  try {
    const { getCurrentUser } = require('./auth');
    const user = getCurrentUser();
    if (!user) return;

    const cleanItem = sanitizeObject(item);
    if (cleanItem && cleanItem.anime) {
      delete cleanItem.anime.characters;
      delete cleanItem.anime.relations;
    }

    if (Platform.OS === 'web') {
      const { doc, setDoc, serverTimestamp } = require('firebase/firestore');
      const db = getWebFirestore();
      
      const docRef = doc(db, ROOT_COLLECTION, user.uid, SUB_COLLECTION, String(item.anime.id));
      await setDoc(docRef, {
        ...cleanItem,
        userId: user.uid,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      const firestoreMobile = require('@react-native-firebase/firestore').default;

      await firestoreMobile()
        .collection(ROOT_COLLECTION)
        .doc(user.uid)
        .collection(SUB_COLLECTION)
        .doc(String(item.anime.id))
        .set({
          ...cleanItem,
          userId: user.uid,
          updatedAt: firestoreMobile.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
  } catch (error) {
    console.error('Error syncing to Firestore:', error);
  }
}

/**
 * Obtiene la lista de usuario de Firestore
 */
export async function fetchUserListFromFirestore(): Promise<UserListItem[]> {
  try {
    const { getCurrentUser } = require('./auth');
    const user = getCurrentUser();
    if (!user) return [];

    asegurarFirebaseApp();

    if (Platform.OS === 'web') {
      const { collection, getDocs } = require('firebase/firestore');
      const db = getWebFirestore();
      
      console.log(`🔥 [Firestore Web] Buscando en subcolección: ${ROOT_COLLECTION}/${user.uid}/${SUB_COLLECTION}`);
      
      const q = collection(db, ROOT_COLLECTION, user.uid, SUB_COLLECTION);
      const querySnapshot = await getDocs(q);
      console.log(`🔥 [Firestore Web] Documentos encontrados: ${querySnapshot.size}`);
      
      const list: UserListItem[] = [];
      querySnapshot.forEach((docSnapshot: any) => {
        const data = docSnapshot.data();
        console.log(`✅ [Firestore Web] Anime encontrado: ${data.anime?.title?.romaji || data.anime?.id}`);
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
      const firestoreMobile = require('@react-native-firebase/firestore').default;
      console.log(`🔥 [Firestore Móvil] Buscando en subcolección: ${ROOT_COLLECTION}/${user.uid}/${SUB_COLLECTION}`);
      
      const snapshot = await firestoreMobile()
        .collection(ROOT_COLLECTION)
        .doc(user.uid)
        .collection(SUB_COLLECTION)
        .get();

      console.log(`🔥 [Firestore Móvil] Documentos encontrados: ${snapshot.size}`);

      return snapshot.docs.map((docSnapshot: any) => {
        const data = docSnapshot.data();
        console.log(`✅ [Firestore Móvil] Anime encontrado: ${data.anime?.title?.romaji || data.anime?.id}`);
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
    console.error('Error fetching from Firestore:', error);
    return [];
  }
}

/**
 * Elimina un anime de Firestore
 */
export async function removeFromFirestore(animeId: number): Promise<void> {
  try {
    const { getCurrentUser } = require('./auth');
    const user = getCurrentUser();
    if (!user) return;

    asegurarFirebaseApp();

    if (Platform.OS === 'web') {
      const { doc, deleteDoc } = require('firebase/firestore');
      const db = getWebFirestore();
      const docRef = doc(db, ROOT_COLLECTION, user.uid, SUB_COLLECTION, String(animeId));
      await deleteDoc(docRef);
    } else {
      const firestoreMobile = require('@react-native-firebase/firestore').default;
      await firestoreMobile()
        .collection(ROOT_COLLECTION)
        .doc(user.uid)
        .collection(SUB_COLLECTION)
        .doc(String(animeId))
        .delete();
    }
  } catch (error) {
    console.error('Error removing from Firestore:', error);
  }
}

/**
 * Actualiza el progreso de un anime en Firestore
 */
export async function updateProgressInFirestore(animeId: number, progress: number): Promise<void> {
  try {
    const { getCurrentUser } = require('./auth');
    const user = getCurrentUser();
    if (!user) return;

    asegurarFirebaseApp();

    if (Platform.OS === 'web') {
      const { doc, updateDoc, serverTimestamp } = require('firebase/firestore');
      const db = getWebFirestore();
      const docRef = doc(db, ROOT_COLLECTION, user.uid, SUB_COLLECTION, String(animeId));
      await updateDoc(docRef, {
        progress,
        updatedAt: serverTimestamp(),
      });
    } else {
      const firestoreMobile = require('@react-native-firebase/firestore').default;

      await firestoreMobile()
        .collection(ROOT_COLLECTION)
        .doc(user.uid)
        .collection(SUB_COLLECTION)
        .doc(String(animeId))
        .update({
          progress,
          updatedAt: firestoreMobile.FieldValue.serverTimestamp(),
        });
    }
  } catch (error) {
    console.error('Error updating progress in Firestore:', error);
  }
}
