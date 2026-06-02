import { NormalizedTitle, MatchResult } from '../types/animeDetails';

// Palabras comunes que no deberían ser consideradas para matching
export const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'for', 'in', 'on', 'at',
  'by', 'with', 'without', 'from', 'into', 'through', 'during',
  'episode', 'ova', 'special', 'movie', 'film', 'series', 'part',
  'chapter', 'act', 'scene', 'animation', 'anime', 'japan', 'japanese',
  'sub', 'dub', 'hd', 'remastered', 'directors', 'cut', 'version',
  'la', 'el', 'los', 'las', 'y', 'o', 'de', 'del', 'al', 'para', 'por',
  'con', 'sin', 'sobre', 'entre', 'hasta', 'desde'
]);

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

/**
 * Normalización simple y efectiva
 */
export const normalizeTitleStrict = (title: string): NormalizedTitle => {
  if (!title) {
    return {
      original: '',
      clean: '',
      words: [],
      significantWords: [],
      uniqueIdentifiers: [],
      fullNormalized: '',
      wordChunks: [],
      isLongTitle: false
    };
  }
  
  // Limpieza básica: quitar acentos, caracteres especiales y dejar solo letras, números y espacios
  let clean = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  
  const words = clean.split(" ").filter(w => w.length > 0);
  const isLongTitle = words.length >= 6;
  
  // Filtrar stopwords para tener las palabras clave
  let significantWords = words.filter(w => !STOP_WORDS.has(w) && w.length > 1);
  
  // Identificadores: palabras largas o números
  const uniqueIdentifiers = words.filter(w => w.length >= 4 || /^\d+$/.test(w));
  
  return {
    original: title,
    clean,
    words,
    significantWords,
    uniqueIdentifiers,
    fullNormalized: words.join(' '),
    wordChunks: [],
    isLongTitle
  };
};

/**
 * Calcula similitud entre títulos de forma más flexible
 */
export const calculateMatchScoreStrict = (
  title1: NormalizedTitle,
  title2: NormalizedTitle
): MatchResult => {
  // 1. Coincidencia exacta (limpia)
  if (title1.clean === title2.clean) {
    return { matched: true, score: 1.0, matchType: 'exact' };
  }
  
  // 2. Si uno contiene al otro completamente
  if (title1.clean.includes(title2.clean) || title2.clean.includes(title1.clean)) {
    const ratio = Math.min(title1.clean.length, title2.clean.length) / Math.max(title1.clean.length, title2.clean.length);
    if (ratio > 0.7) {
      return { matched: true, score: 0.9, matchType: 'strong' };
    }
  }

  // 3. Intersección de palabras significativas
  const set1 = new Set(title1.significantWords);
  const set2 = new Set(title2.significantWords);
  const intersection = [...set1].filter(w => set2.has(w));
  
  if (intersection.length > 0) {
    const score = (intersection.length * 2) / (set1.size + set2.size);
    
    // Si coinciden la mayoría de las palabras significativas
    if (score >= 0.6 || (intersection.length >= 2 && score >= 0.5)) {
      return { 
        matched: true, 
        score, 
        matchType: score >= 0.8 ? 'strong' : 'partial' 
      };
    }
  }
  
  return { matched: false, score: 0, matchType: 'none' };
};

/**
 * Construye queries simplificadas para evitar errores 500 y mejorar precisión
 */
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

  // 1. Prioridad: Romaji (que es lo que el usuario pidió como principal)
  if (anime.title.romaji) {
    addQuery(anime.title.romaji);
  }

  // 2. Título en inglés si existe
  if (anime.title.english) {
    addQuery(anime.title.english);
  }

  // 3. Título nativo si no hay romaji
  if (!anime.title.romaji && anime.title.native) {
    addQuery(anime.title.native);
  }

  // 4. Versión "limpia" de las palabras significativas (solo si la query es larga)
  const romajiNorm = normalizeTitleStrict(anime.title.romaji || '');
  if (romajiNorm.significantWords.length >= 2 && romajiNorm.significantWords.length < 5) {
    addQuery(romajiNorm.significantWords.join(' '));
  }

  return queries;
};
