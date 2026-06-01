import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc,
  updateDoc,
  serverTimestamp 
} from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { UserListItem } from './animeList';

const LIST_COLLECTION = 'userLists';

/**
 * REFACTORIZACIÓN MODULAR:
 * No llamamos a getFirestore() en el scope global para evitar el error 
 * de 'No Firebase App created' durante la carga del módulo.
 */

export async function syncAnimeToFirestore(item: UserListItem): Promise<void> {
  const user = auth().currentUser;
  if (!user) return;

  try {
    const db = getFirestore();
    const docId = `${user.uid}_${item.anime.id}`;
    const docRef = doc(db, LIST_COLLECTION, docId);

    await setDoc(docRef, {
      ...item,
      userId: user.uid,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Error syncing to Firestore:', error);
    throw error;
  }
}

export async function fetchUserListFromFirestore(): Promise<UserListItem[]> {
  const user = auth().currentUser;
  if (!user) return [];

  try {
    const db = getFirestore();
    const q = query(
      collection(db, LIST_COLLECTION),
      where('userId', '==', user.uid)
    );

    const querySnapshot = await getDocs(q);
    const list: UserListItem[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as UserListItem;
      list.push(data);
    });

    return list;
  } catch (error) {
    console.error('Error fetching from Firestore:', error);
    return [];
  }
}

export async function removeFromFirestore(animeId: number): Promise<void> {
  const user = auth().currentUser;
  if (!user) return;

  try {
    const db = getFirestore();
    const docId = `${user.uid}_${animeId}`;
    await deleteDoc(doc(db, LIST_COLLECTION, docId));
  } catch (error) {
    console.error('Error removing from Firestore:', error);
    throw error;
  }
}

export async function updateProgressInFirestore(animeId: number, progress: number): Promise<void> {
  const user = auth().currentUser;
  if (!user) return;

  try {
    const db = getFirestore();
    const docId = `${user.uid}_${animeId}`;
    const docRef = doc(db, LIST_COLLECTION, docId);
    await updateDoc(docRef, {
      progress,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating progress in Firestore:', error);
    throw error;
  }
}
