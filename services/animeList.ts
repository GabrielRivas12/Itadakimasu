import AsyncStorage from '@react-native-async-storage/async-storage';
import { Anime } from './anilist';

export type UserListStatus = 'En Proceso' | 'Terminado' | 'Por Ver';

export interface UserListItem {
  anime: Anime;
  status: UserListStatus;
  progress: number;
  updatedAt: string;
}

const USER_LIST_KEY = '@AnimeLT:personal_list';

export async function getUserList(): Promise<UserListItem[]> {
  try {
    const data = await AsyncStorage.getItem(USER_LIST_KEY);
    if (data) {
      const list = JSON.parse(data);
      // Migrar datos antiguos que no tienen progress
      return list.map((item: any) => ({
        ...item,
        progress: item.progress || 0,
      }));
    }
    return [];
  } catch (error) {
    console.error('Error loading user list:', error);
    return [];
  }
}

export async function saveUserList(list: UserListItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_LIST_KEY, JSON.stringify(list));
  } catch (error) {
    console.error('Error saving user list:', error);
  }
}

export async function addOrUpdateAnimeInList(
  anime: Anime, 
  status: UserListStatus, 
  progress: number = 0
): Promise<UserListItem[]> {
  const currentList = await getUserList();
  const existingIndex = currentList.findIndex((item) => item.anime.id === anime.id);

  if (existingIndex > -1) {
    currentList[existingIndex].status = status;
    currentList[existingIndex].progress = progress;
    currentList[existingIndex].updatedAt = new Date().toISOString();
  } else {
    currentList.push({
      anime,
      status,
      progress,
      updatedAt: new Date().toISOString(),
    });
  }

  await saveUserList(currentList);
  return currentList;
}

export async function removeAnimeFromList(animeId: number): Promise<UserListItem[]> {
  const currentList = await getUserList();
  const updatedList = currentList.filter((item) => item.anime.id !== animeId);
  await saveUserList(updatedList);
  return updatedList;
}

export async function getAnimeStatus(animeId: number): Promise<UserListStatus | null> {
  const currentList = await getUserList();
  const item = currentList.find((item) => item.anime.id === animeId);
  return item ? item.status : null;
}

export async function getAnimeProgress(animeId: number): Promise<number> {
  const currentList = await getUserList();
  const item = currentList.find((item) => item.anime.id === animeId);
  return item ? item.progress : 0;
}

export async function updateAnimeProgress(animeId: number, progress: number): Promise<UserListItem[]> {
  const currentList = await getUserList();
  const existingIndex = currentList.findIndex((item) => item.anime.id === animeId);

  if (existingIndex > -1) {
    currentList[existingIndex].progress = progress;
    currentList[existingIndex].updatedAt = new Date().toISOString();
    await saveUserList(currentList);
  }

  return currentList;
}