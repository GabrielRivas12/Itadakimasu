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

const LIST_COLLECTION = 'userLists';

/**
 * Sincroniza un anime a Firestore
 */
export async function syncAnimeToFirestore(item: UserListItem): Promise<void> {
  try {
    const { getCurrentUser } = require('./auth');
    const user = getCurrentUser();
    if (!user) return;

    asegurarFirebaseApp();

    if (Platform.OS === 'web') {
      const { doc, setDoc, serverTimestamp } = require('firebase/firestore');
      const db = getWebFirestore();
      
      const docId = `${user.uid}_${item.anime.id}`;
      const docRef = doc(db, LIST_COLLECTION, docId);
      await setDoc(docRef, {
        ...item,
        userId: user.uid,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      const firestoreMobile = require('@react-native-firebase/firestore').default;
      const { firebase } = require('@react-native-firebase/firestore');

      const docId = `${user.uid}_${item.anime.id}`;
      await firestoreMobile()
        .collection(LIST_COLLECTION)
        .doc(docId)
        .set({
          ...item,
          userId: user.uid,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
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
      const { collection, getDocs, query, where } = require('firebase/firestore');
      const db = getWebFirestore();
      
      console.log(`🔥 [Firestore Web] Buscando en colección: ${LIST_COLLECTION} para userId: ${user.uid}`);
      
      const q = query(
        collection(db, LIST_COLLECTION),
        where('userId', '==', user.uid)
      );
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
      console.log(`🔥 [Firestore Móvil] Buscando en colección: ${LIST_COLLECTION} para userId: ${user.uid}`);
      
      const snapshot = await firestoreMobile()
        .collection(LIST_COLLECTION)
        .where('userId', '==', user.uid)
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
      const docId = `${user.uid}_${animeId}`;
      await deleteDoc(doc(db, LIST_COLLECTION, docId));
    } else {
      const firestoreMobile = require('@react-native-firebase/firestore').default;
      const docId = `${user.uid}_${animeId}`;
      await firestoreMobile()
        .collection(LIST_COLLECTION)
        .doc(docId)
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

    const docId = `${user.uid}_${animeId}`;

    if (Platform.OS === 'web') {
      const { doc, updateDoc, serverTimestamp } = require('firebase/firestore');
      const db = getWebFirestore();
      await updateDoc(doc(db, LIST_COLLECTION, docId), {
        progress,
        updatedAt: serverTimestamp(),
      });
    } else {
      const firestoreMobile = require('@react-native-firebase/firestore').default;
      const { firebase } = require('@react-native-firebase/firestore');

      await firestoreMobile()
        .collection(LIST_COLLECTION)
        .doc(docId)
        .update({
          progress,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    }
  } catch (error) {
    console.error('Error updating progress in Firestore:', error);
  }
}
