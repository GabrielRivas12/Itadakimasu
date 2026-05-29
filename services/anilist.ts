const ANILIST_URL = 'https://graphql.anilist.co';

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

export async function searchAnime(search: string | null, genre: string | null, page = 1, perPage = 20): Promise<Anime[]> {
  const activeGenre = genre && genre !== 'Todos' ? [genre] : null;
  const activeSearch = search && search.trim() !== '' ? search : null;

  const query = `
    query ($page: Int, $perPage: Int, $search: String, $genres: [String]) {
      Page(page: $page, perPage: $perPage) {
        media(search: $search, genre_in: $genres, type: ANIME, sort: POPULARITY_DESC) {
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
