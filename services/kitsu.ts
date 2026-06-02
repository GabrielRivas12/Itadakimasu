import { translateToSpanish } from './translate';

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

export async function translateDescription(description: string): Promise<{ synopsis: string; source: string | null } | null> {
  if (!description || !description.trim()) return null;
  
  try {
    const cleanedDescription = cleanHtmlText(description);
    const { cleanText, source } = extractSourceAttribution(cleanedDescription);
    
    console.log(`Traduciendo descripción de AniList al español...`);
    const translatedSynopsis = await translateToSpanish(cleanText);
    
    return { 
      synopsis: translatedSynopsis, 
      source: source || 'Fuente: AniList' 
    };
  } catch (error) {
    console.error('Error traduciendo descripción:', error);
    return null;
  }
}
