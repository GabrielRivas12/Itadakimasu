import { useState, useEffect } from 'react';
import { fetchTrendingAnime, Anime } from '../../../../services/anilist';
import { LandingData } from '../types/landing';

export const useLanding = (): LandingData & { bannerAnimes: Anime[] } => {
  const [bannerAnimes, setBannerAnimes] = useState<Anime[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBanners = async () => {
      try {
        // Obtenemos los 10 más populares para el carrusel
        const trending = await fetchTrendingAnime(1, 10);
        if (trending && trending.length > 0) {
          setBannerAnimes(trending);
        }
      } catch (error) {
        console.error('Error loading landing banners:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBanners();
  }, []);

  return { bannerAnime: bannerAnimes[0] || null, bannerAnimes, isLoading };
};
