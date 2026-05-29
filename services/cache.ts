import AsyncStorage from '@react-native-async-storage/async-storage';
import { Anime } from './anilist';

export const cacheKeys = {
  TRENDING_BANNER: 'cache:trending_banner',
  TRENDING_LIST: 'cache:trending_list',
  ANIME_DETAILS: (id: number) => `cache:anime_details:${id}`,
};

export async function getCachedTrendingBanner(): Promise<Anime | null> {
  try {
    const data = await AsyncStorage.getItem(cacheKeys.TRENDING_BANNER);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function cacheTrendingBanner(anime: Anime): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKeys.TRENDING_BANNER, JSON.stringify(anime));
  } catch (error) {
    console.error('Error caching trending banner:', error);
  }
}

export async function getCachedTrendingList(): Promise<Anime[] | null> {
  try {
    const data = await AsyncStorage.getItem(cacheKeys.TRENDING_LIST);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function cacheTrendingList(list: Anime[]): Promise<void> {
  try {
    // 1. Guardar la lista completa
    await AsyncStorage.setItem(cacheKeys.TRENDING_LIST, JSON.stringify(list));
    
    // 2. Preparar detalles individuales para cachear (multiSet es más eficiente)
    const detailPairs: [string, string][] = [];
    
    for (const anime of list) {
      // Solo cacheamos si es necesario o para asegurar que tenemos la data básica
      detailPairs.push([cacheKeys.ANIME_DETAILS(anime.id), JSON.stringify(anime)]);
    }
    
    if (detailPairs.length > 0) {
      await AsyncStorage.multiSet(detailPairs);
    }
  } catch (error) {
    console.error('Error caching trending list:', error);
  }
}

export async function getCachedAnimeDetails(id: number): Promise<Anime | null> {
  try {
    const data = await AsyncStorage.getItem(cacheKeys.ANIME_DETAILS(id));
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function cacheAnimeDetails(id: number, anime: Anime): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKeys.ANIME_DETAILS(id), JSON.stringify(anime));
  } catch (error) {
    console.error('Error caching anime details:', error);
  }
}
