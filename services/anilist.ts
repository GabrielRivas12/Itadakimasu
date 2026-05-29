const ANILIST_URL = 'https://graphql.anilist.co';

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
  description?: string;
  status?: string;
  startDate?: {
    year: number | null;
    month: number | null;
    day: number | null;
  };
  studios?: {
    nodes: Array<{ name: string }>;
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

export async function fetchTrendingAnime(page = 1, perPage = 10): Promise<Anime[]> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: TRENDING_DESC, type: ANIME) {
          id
          idMal
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            medium
          }
          bannerImage
          averageScore
          episodes
          genres
          type
          description
        }
      }
    }
  `;

  try {
    const response = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { page, perPage },
      }),
    });

    const json = await response.json();
    return json?.data?.Page?.media || [];
  } catch (error) {
    console.error('Error fetching trending anime:', error);
    return [];
  }
}

export async function fetchPopularAnime(page = 1, perPage = 10): Promise<Anime[]> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: POPULARITY_DESC, type: ANIME) {
          id
          idMal
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            medium
          }
          bannerImage
          averageScore
          episodes
          genres
          type
          description
        }
      }
    }
  `;

  try {
    const response = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { page, perPage },
      }),
    });

    const json = await response.json();
    return json?.data?.Page?.media || [];
  } catch (error) {
    console.error('Error fetching popular anime:', error);
    return [];
  }
}

export type AnimeSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';

export async function searchAnime(
  search: string | null,
  genre: string | null,
  season: AnimeSeason | null = null,
  year: number | null = null,
  page = 1,
  perPage = 20
): Promise<Anime[]> {
  const activeGenre = genre && genre !== 'Todos' ? [genre] : null;
  const activeSearch = search && search.trim() !== '' ? search : null;

  const query = `
    query ($page: Int, $perPage: Int, $search: String, $genres: [String], $season: MediaSeason, $seasonYear: Int) {
      Page(page: $page, perPage: $perPage) {
        media(
          search: $search,
          genre_in: $genres,
          season: $season,
          seasonYear: $seasonYear,
          type: ANIME,
          sort: POPULARITY_DESC
        ) {
          id
          idMal
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            medium
          }
          bannerImage
          averageScore
          episodes
          genres
          type
          description
        }
      }
    }
  `;

  const variables: Record<string, any> = { page, perPage };
  if (activeSearch) variables.search = activeSearch;
  if (activeGenre) variables.genres = activeGenre;
  if (season) variables.season = season;
  if (year) variables.seasonYear = year;

  try {
    const response = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    const json = await response.json();
    return json?.data?.Page?.media || [];
  } catch (error) {
    console.error('Error searching anime:', error);
    return [];
  }
}

export async function fetchAnimeDetails(id: number): Promise<Anime | null> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        idMal
        title {
          romaji
          english
          native
        }
        coverImage {
          large
          extraLarge
        }
        bannerImage
        averageScore
        episodes
        status
        genres
        description
        type
        startDate {
          year
          month
          day
        }
        studios(isMain: true) {
          nodes {
            name
          }
        }
        characters(sort: [ROLE, RELEVANCE, ID], perPage: 12) {
          edges {
            role
            node {
              id
              name {
                full
                userPreferred
              }
              image {
                large
              }
            }
            voiceActors(language: JAPANESE) {
              id
              name {
                full
                userPreferred
              }
              image {
                large
              }
            }
          }
        }
        relations {
          edges {
            relationType
            node {
              id
              title {
                romaji
                english
                native
              }
              coverImage {
                large
                medium
              }
              type
              status
              averageScore
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { id },
      }),
    });

    const json = await response.json();
    return json?.data?.Media || null;
  } catch (error) {
    console.error('Error fetching anime details:', error);
    return null;
  }
}
