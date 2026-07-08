import { Anime } from '../../../../services/anilist';

export interface AnimeWithEpisode {
  anime: Anime;
  episode: number;
  dateLabel: string;
  slug: string;
  timestamp: string;
}
