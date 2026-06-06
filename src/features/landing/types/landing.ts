import { Anime } from '../../../../services/anilist';

export interface LandingData {
  bannerAnime: Anime | null;
  isLoading: boolean;
}
