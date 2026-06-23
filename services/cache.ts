import AsyncStorage from '@react-native-async-storage/async-storage';
import { Anime } from './anilist';

export const cacheKeys = {
  TRENDING_BANNER: 'cache:trending_banner',
  TRENDING_LIST: 'cache:trending_list',
  SEASONAL_LIST: 'cache:seasonal_list',
  CONTINUE_WATCHING: 'cache:continue_watching',
  ANIME_DETAILS: (id: number) => `cache:anime_details:${id}`,
  ADULT_CONTENT: 'setting:adult_content',
  NOTIFICATIONS_ENABLED: 'setting:notifications_enabled',
  EPISODE_ORDER: 'setting:episode_order',
  USER_TOP_ANIME: (uid: string) => `cache:user_top_anime:${uid}`,
};

export async function getIsAdultContentEnabled(): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(cacheKeys.ADULT_CONTENT);
    return data === 'true';
  } catch {
    return false;
  }
}

export async function setIsAdultContentEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKeys.ADULT_CONTENT, enabled ? 'true' : 'false');
  } catch (error) {
    console.error('Error saving adult content setting:', error);
  }
}

export async function getIsNotificationsEnabled(): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(cacheKeys.NOTIFICATIONS_ENABLED);
    if (data === null) {
      await setIsNotificationsEnabled(true);
      return true;
    }
    return data === 'true';
  } catch {
    return true;
  }
}

export async function setIsNotificationsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKeys.NOTIFICATIONS_ENABLED, enabled ? 'true' : 'false');
  } catch (error) {
    console.error('Error saving notifications setting:', error);
  }
}

export async function getEpisodeOrder(): Promise<'asc' | 'desc'> {
  try {
    const data = await AsyncStorage.getItem(cacheKeys.EPISODE_ORDER);
    return data === 'desc' ? 'desc' : 'asc';
  } catch {
    return 'asc';
  }
}

export async function setEpisodeOrder(order: 'asc' | 'desc'): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKeys.EPISODE_ORDER, order);
  } catch (error) {
    console.error('Error saving episode order setting:', error);
  }
}

export async function getCachedContinueWatching(): Promise<any[] | null> {
  try {
    const data = await AsyncStorage.getItem(cacheKeys.CONTINUE_WATCHING);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function cacheContinueWatching(list: any[]): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKeys.CONTINUE_WATCHING, JSON.stringify(list));
  } catch (error) {
    console.error('Error caching continue watching list:', error);
  }
}

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
      // Guardamos el objeto completo para asegurar que la página de detalles tenga toda la info
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

export async function getCachedTopAnime(uid: string): Promise<any[] | null> {
  try {
    const data = await AsyncStorage.getItem(cacheKeys.USER_TOP_ANIME(uid));
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function cacheTopAnime(uid: string, list: any[]): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKeys.USER_TOP_ANIME(uid), JSON.stringify(list));
  } catch (error) {
    console.error('Error caching top anime:', error);
  }
}

export async function getCachedSeasonalList(): Promise<Anime[] | null> {
  try {
    const data = await AsyncStorage.getItem(cacheKeys.SEASONAL_LIST);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function cacheSeasonalList(list: Anime[]): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKeys.SEASONAL_LIST, JSON.stringify(list));
  } catch (error) {
    console.error('Error caching seasonal list:', error);
  }
}
