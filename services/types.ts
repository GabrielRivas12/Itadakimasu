export interface CharacterNode {
  id: number;
  name: {
    full: string;
    userPreferred: string;
  };
  image: {
    large: string;
  };
}

export interface VoiceActor {
  id: number;
  name: {
    full: string;
    userPreferred: string;
  };
  image: {
    large: string;
  };
}

export interface CharacterEdge {
  role: string;
  node: CharacterNode;
  voiceActors?: VoiceActor[];
}

export interface Anime {
  id: number;
  idMal?: number;
  slug?: string;
  title: {
    romaji: string;
    english: string | null;
    native: string;
  };
  coverImage: {
    large: string;
    medium: string;
    extraLarge?: string;
  };
  bannerImage: string | null;
  averageScore: number | null;
  episodes: number | null;
  genres: string[];
  type: string;
  isAdult?: boolean;
  description?: string;
  trailer?: {
    id: string;
    site: string;
    thumbnail: string | null;
  };
  status?: string;
  startDate?: {
    year: number | null;
    month: number | null;
    day: number | null;
  };
  studios?: {
    nodes: Array<{ name: string }>;
  };
  season?: string;
  seasonYear?: number;
  duration?: number;
  source?: string;
  nextAiringEpisode?: {
    airingAt: number;
    timeUntilAiring: number;
    episode: number;
  };
  characters?: {
    edges: CharacterEdge[];
  };
  relations?: {
    edges: Array<{
      relationType: string;
      node: {
        id: number;
        title: {
          romaji: string;
          english: string | null;
          native: string;
        };
        coverImage: {
          large: string;
          medium: string;
        };
        type: string;
        status?: string;
        averageScore?: number | null;
      };
    }>;
  };
}

export type AnimeSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';