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

export async function fetchSpanishSynopsisFromJikan(malId: number): Promise<string | null> {
  try {
    console.log(`🔍 Obteniendo sinopsis para MAL ID: ${malId}`);
    
    const response = await fetch(`https://api.jikan.moe/v4/anime/${malId}`);
    
    if (!response.ok) {
      console.log(`Jikan API error: ${response.status} for MAL ID ${malId}`);
      return null;
    }
    
    const data = await response.json();
    const synopsis = data.data?.synopsis;
    
    if (synopsis && synopsis.trim()) {
      const cleanedSynopsis = cleanHtmlText(synopsis);
      console.log(`📖 Sinopsis obtenida (${cleanedSynopsis.length} caracteres), traduciendo...`);
      
      const translatedSynopsis = await translateToSpanish(cleanedSynopsis);
      console.log(`✅ Sinopsis traducida al español`);
      return translatedSynopsis;
    }
    
    console.log(`⚠️ No se encontró sinopsis para MAL ID: ${malId}`);
    return null;
  } catch (error) {
    console.error(`Error fetching Jikan synopsis for MAL ID ${malId}:`, error);
    return null;
  }
}

export async function fetchKitsuSpanishSynopsis(malId: number): Promise<string | null> {
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
      const translatedSynopsis = await translateToSpanish(cleanedSynopsis);
      return translatedSynopsis;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching Kitsu synopsis for MAL ID ${malId}:`, error);
    return null;
  }
}