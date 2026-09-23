import { Anime } from '../../../../services/types';

export interface ContinueAnime extends Anime {
  mockProgress: number;
  mockEpisode: string;
}
