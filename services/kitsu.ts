import { translateToSpanish } from './translate';

const KITSU_URL = 'https://kitsu.io/api/edge';

const cleanHtmlText = (text: string): string => {
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

export function extractSourceAttribution(text: string): { cleanText: string; source: string | null } {
  if (!text) return { cleanText: '', source: null };

  const patterns = [
    /\s*[\(\[]\s*Source\s*:\s*([^\)\]]+)[\)\]]\s*$/i,
    /\s*[\(\[]\s*Written\s+by\s+([^\)\]]+)[\)\]]\s*$/i,
    /\s*Written\s+by\s+(MAL Rewrite|MAL|Anilist|Kitsu)\.?\s*$/i,
    /\s*[\(\[]\s*([^\)\]]+(?:\s+Source|Source\s+.*))[\)\]]\s*$/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const matchedString = match[0];
      const sourceText = match[1] || match[0];
      const cleanText = text.slice(0, text.length - matchedString.length).trim();
      
      let formattedSource = sourceText.trim();
      if (!formattedSource.toLowerCase().startsWith('fuente') && !formattedSource.toLowerCase().startsWith('source')) {
        if (matchedString.toLowerCase().includes('written by')) {
          formattedSource = `Escrito por: ${formattedSource}`;
        } else {
          formattedSource = `Fuente: ${formattedSource}`;
        }
      } else {
        formattedSource = formattedSource.replace(/^source\s*:/i, 'Fuente:').replace(/^fuente\s*:/i, 'Fuente:');
      }
      
      return { cleanText, source: formattedSource };
    }
  }

  return { cleanText: text.trim(), source: null };
}

export async function fetchSpanishSynopsisFromJikan(malId: number): Promise<{ synopsis: string; source: string | null } | null> {
  try {
    console.log(` Obteniendo sinopsis para MAL ID: ${malId}`);
    
    const response = await fetch(`https://api.jikan.moe/v4/anime/${malId}`);
    
    if (!response.ok) {
      console.log(`Jikan API error: ${response.status} for MAL ID ${malId}`);
      return null;
    }
    
    const data = await response.json();
    const synopsis = data.data?.synopsis;
    
    if (synopsis && synopsis.trim()) {
      const cleanedSynopsis = cleanHtmlText(synopsis);
      const { cleanText, source } = extractSourceAttribution(cleanedSynopsis);
      console.log(` Sinopsis obtenida, traduciendo sinopsis sin fuente...`);
      
      const translatedSynopsis = await translateToSpanish(cleanText);
      console.log(` Sinopsis traducida al español`);
      return { synopsis: translatedSynopsis, source };
    }
    
    console.log(`No se encontró sinopsis para MAL ID: ${malId}`);
    return null;
  } catch (error) {
    console.error(`Error fetching Jikan synopsis for MAL ID ${malId}:`, error);
    return null;
  }
}

export async function fetchKitsuSpanishSynopsis(malId: number): Promise<{ synopsis: string; source: string | null } | null> {
  try {
    const response = await fetch(
      `${KITSU_URL}/mappings?filter[externalSite]=myanimelist/anime&filter[externalId]=${malId}&include=item`
    );

    const json = await response.json();
    
    if (!json.data || json.data.length === 0) {
      return null;
    }

    const included = json.included || [];
    const anime = included.find((item: any) => item.type === 'anime');
    
    if (anime && anime.attributes?.synopsis) {
      const synopsis = anime.attributes.synopsis;
      const cleanedSynopsis = cleanHtmlText(synopsis);
      const { cleanText, source } = extractSourceAttribution(cleanedSynopsis);
      const translatedSynopsis = await translateToSpanish(cleanText);
      return { synopsis: translatedSynopsis, source };
    }

    return null;
  } catch (error) {
    console.error(`Error fetching Kitsu synopsis for MAL ID ${malId}:`, error);
    return null;
  }
}