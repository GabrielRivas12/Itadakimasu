import { Platform } from 'react-native';
import { EventEmitter } from 'eventemitter3';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { asegurarFirebaseApp } from './firebaseConfig';
import { getUserId } from '../src/hooks/userHelper';

export const streakEvents = new EventEmitter();

const STREAK_CACHE_KEY = '@streak_data';
const STREAK_FIRESTORE_PATH = 'streak';
const MIN_WATCH_SECONDS = 120;

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastWatchDate: string;
  totalSessions: number;
}

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayOf(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDefaultStreak(): StreakData {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastWatchDate: '',
    totalSessions: 0,
  };
}

async function getFromCache(): Promise<StreakData | null> {
  try {
    const data = await AsyncStorage.getItem(STREAK_CACHE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

async function saveToCache(data: StreakData): Promise<void> {
  try {
    await AsyncStorage.setItem(STREAK_CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving streak cache:', e);
  }
}

async function getFromFirestore(): Promise<StreakData | null> {
  try {
    const uid = getUserId();
    if (!uid) return null;

    asegurarFirebaseApp();

    if (Platform.OS === 'web') {
      const { doc, getDoc } = require('firebase/firestore');
      const { getFirestore } = require('firebase/firestore');
      const db = getFirestore();
      const ref = doc(db, 'userList', uid, STREAK_FIRESTORE_PATH, 'data');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const d = snap.data();
        return {
          currentStreak: d.currentStreak ?? 0,
          longestStreak: d.longestStreak ?? 0,
          lastWatchDate: d.lastWatchDate ?? '',
          totalSessions: d.totalSessions ?? 0,
        };
      }
    } else {
      const { getFirestore, doc, getDoc } = require('@react-native-firebase/firestore');
      const db = getFirestore();
      const ref = doc(db, 'userList', uid, STREAK_FIRESTORE_PATH, 'data');
      const snap = await getDoc(ref);
      if (snap.exists) {
        const d = snap.data();
        return {
          currentStreak: d.currentStreak ?? 0,
          longestStreak: d.longestStreak ?? 0,
          lastWatchDate: d.lastWatchDate ?? '',
          totalSessions: d.totalSessions ?? 0,
        };
      }
    }
    return null;
  } catch (e) {
    console.error('Error fetching streak from Firestore:', e);
    return null;
  }
}

async function syncToFirestore(data: StreakData): Promise<void> {
  try {
    const uid = getUserId();
    if (!uid) return;

    asegurarFirebaseApp();

    const payload = {
      currentStreak: data.currentStreak,
      longestStreak: data.longestStreak,
      lastWatchDate: data.lastWatchDate,
      totalSessions: data.totalSessions,
      updatedAt: new Date().toISOString(),
    };

    if (Platform.OS === 'web') {
      const { doc, setDoc, serverTimestamp } = require('firebase/firestore');
      const { getFirestore } = require('firebase/firestore');
      const db = getFirestore();
      const ref = doc(db, 'userList', uid, STREAK_FIRESTORE_PATH, 'data');
      await setDoc(ref, { ...payload, updatedAt: serverTimestamp() }, { merge: true });
    } else {
      const { getFirestore, doc, setDoc, serverTimestamp } = require('@react-native-firebase/firestore');
      const db = getFirestore();
      const ref = doc(db, 'userList', uid, STREAK_FIRESTORE_PATH, 'data');
      await setDoc(ref, { ...payload, updatedAt: serverTimestamp() }, { merge: true });
    }
  } catch (e) {
    console.error('Error syncing streak to Firestore:', e);
  }
}

export async function getStreak(): Promise<StreakData> {
  const cached = await getFromCache();
  if (cached) return cached;

  const remote = await getFromFirestore();
  if (remote) {
    await saveToCache(remote);
    return remote;
  }

  return getDefaultStreak();
}

export async function recordWatchSession(secondsWatched: number): Promise<void> {
  if (secondsWatched < MIN_WATCH_SECONDS) return;

  const streak = await getStreak();
  const today = getToday();

  if (streak.lastWatchDate === today) {
    return;
  }

  const yesterday = yesterdayOf(today);

  if (streak.lastWatchDate === yesterday) {
    streak.currentStreak += 1;
  } else if (streak.lastWatchDate && streak.lastWatchDate !== today) {
    streak.currentStreak = 0;
  } else {
    streak.currentStreak = 1;
  }

  streak.lastWatchDate = today;
  streak.totalSessions += 1;

  if (streak.currentStreak > streak.longestStreak) {
    streak.longestStreak = streak.currentStreak;
  }

  await saveToCache(streak);
  syncToFirestore(streak);

  streakEvents.emit('streakUpdated', streak);
}

export async function loadStreakFromFirestore(): Promise<void> {
  const remote = await getFromFirestore();
  if (remote) {
    await saveToCache(remote);
  }
}

export async function clearStreakCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STREAK_CACHE_KEY);
  } catch (e) {
    console.error('Error clearing streak cache:', e);
  }
  streakEvents.emit('streakUpdated', getDefaultStreak());
}
