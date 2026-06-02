import { Anime } from '../../../../services/anilist';

export interface ContinueAnime extends Anime {
  mockProgress: number;
  mockEpisode: string;
}
