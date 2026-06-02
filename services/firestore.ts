import { Platform } from 'react-native';
import { UserListItem } from './animeList';
import { asegurarFirebaseApp } from './auth';

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
      
      const docRef = doc(db, 'users', user.uid, 'animeList', String(item.anime.id));
      await setDoc(docRef, {
        ...item,
        userId: user.uid,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      const firestoreMobile = require('@react-native-firebase/firestore').default;
      const { firebase } = require('@react-native-firebase/firestore');

      await firestoreMobile()
        .collection('users')
        .doc(user.uid)
        .collection('animeList')
        .doc(String(item.anime.id))
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
      const { collection, getDocs, query } = require('firebase/firestore');
      const db = getWebFirestore();
      
      const q = query(collection(db, 'users', user.uid, 'animeList'));
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
      const firestoreMobile = require('@react-native-firebase/firestore').default;
      const snapshot = await firestoreMobile()
        .collection('users')
        .doc(user.uid)
        .collection('animeList')
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
      await deleteDoc(doc(db, 'users', user.uid, 'animeList', String(animeId)));
    } else {
      const firestoreMobile = require('@react-native-firebase/firestore').default;
      await firestoreMobile()
        .collection('users')
        .doc(user.uid)
        .collection('animeList')
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
      await updateDoc(doc(db, 'users', user.uid, 'animeList', String(animeId)), {
        progress,
        updatedAt: serverTimestamp(),
      });
    } else {
      const firestoreMobile = require('@react-native-firebase/firestore').default;
      const { firebase } = require('@react-native-firebase/firestore');

      await firestoreMobile()
        .collection('users')
        .doc(user.uid)
        .collection('animeList')
        .doc(String(animeId))
        .update({
          progress,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    }
  } catch (error) {
    console.error('Error updating progress in Firestore:', error);
  }
}
