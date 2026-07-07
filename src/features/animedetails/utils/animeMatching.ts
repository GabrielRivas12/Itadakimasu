export const cleanHtmlText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
};

export const buildSearchQueriesStrict = (anime: any): string[] => {
  const queries: string[] = [];
  const seen = new Set<string>();

  const addQuery = (q: string) => {
    const cleanQ = q.trim();
    if (cleanQ && cleanQ.length > 2 && !seen.has(cleanQ.toLowerCase())) {
      queries.push(cleanQ);
      seen.add(cleanQ.toLowerCase());
    }
  };

  if (anime.title?.romaji) addQuery(anime.title.romaji);
  if (anime.title?.english) addQuery(anime.title.english);
  if (!anime.title?.romaji && anime.title?.native) addQuery(anime.title.native);

  return queries;
};
