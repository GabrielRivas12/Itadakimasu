import { NormalizedTitle, MatchResult } from '../types/animeDetails';

// 🌐 STOP_WORDS SEPARADAS POR IDIOMA Y CONTEXTO
export const STOP_WORDS_ENG = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'for', 'in', 'on', 'at',
  'by', 'with', 'without', 'from', 'into', 'through', 'during',
  'la', 'el', 'los', 'las', 'y', 'o', 'de', 'del', 'al', 'para', 'por',
  'con', 'sin', 'sobre', 'entre', 'hasta', 'desde'
]);

export const STOP_WORDS_ANIME = new Set([
  'episode', 'ova', 'special', 'movie', 'film', 'series', 'part',
  'chapter', 'act', 'scene', 'animation', 'anime', 'japan', 'japanese',
  'sub', 'dub', 'hd', 'remastered', 'directors', 'cut', 'version'
]);

// Partículas esenciales del romaji que NO se deben eliminar como si fueran inglés
export const STOP_WORDS_ROMAJI = new Set([
  'wa', 'ga', 'wo', 'ha', 'ni', 'no', 'de', 'mo'
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
 * Normalización adaptada para títulos híbridos (Inglés / Romaji)
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
  
  // Limpieza básica: quitar acentos, caracteres especiales y dejar letras, números y espacios
  let clean = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  
  const words = clean.split(" ").filter(w => w.length > 0);
  const isLongTitle = words.length >= 6;
  
  // Filtrar de forma inteligente discriminando por contexto lingüístico
  let significantWords = words.filter(w => {
    const isStopWord = STOP_WORDS_ENG.has(w) || STOP_WORDS_ANIME.has(w) || STOP_WORDS_ROMAJI.has(w);
    return !isStopWord && w.length > 1;
  });
  
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
  
  // 2. Si uno contiene al otro completamente (tolerancia ajustada a 0.65)
  if (title1.clean.includes(title2.clean) || title2.clean.includes(title1.clean)) {
    const ratio = Math.min(title1.clean.length, title2.clean.length) / Math.max(title1.clean.length, title2.clean.length);
    if (ratio > 0.65) {
      return { matched: true, score: 0.9, matchType: 'strong' };
    }
  }

  // Modificación para la variación de espaciados (Ej: korette naani vs kore tte naani)
  // Al remover los espacios, "korettenaani" e "korettenaani" se volverían idénticos
  const noSpaces1 = title1.clean.replace(/\s/g, '');
  const noSpaces2 = title2.clean.replace(/\s/g, '');
  if (noSpaces1 === noSpaces2 || noSpaces1.includes(noSpaces2) || noSpaces2.includes(noSpaces1)) {
    // Si la compresión sin espacios genera una coincidencia mutua alta, es un match seguro
    const ratioNoSpaces = Math.min(noSpaces1.length, noSpaces2.length) / Math.max(noSpaces1.length, noSpaces2.length);
    if (ratioNoSpaces > 0.75) {
      return { matched: true, score: 0.85, matchType: 'strong' };
    }
  }

  // 3. Intersección de palabras significativas
  const set1 = new Set(title1.significantWords);
  const set2 = new Set(title2.significantWords);
  const intersection = [...set1].filter(w => set2.has(w));
  
  if (intersection.length > 0) {
    const score = (intersection.length * 2) / (set1.size + set2.size);
    
    // Umbral estándar para títulos normales/largos
    if (score >= 0.55 || (intersection.length >= 2 && score >= 0.45)) {
      return { 
        matched: true, 
        score, 
        matchType: score >= 0.8 ? 'strong' : 'partial' 
      };
    }

    // 🛡️ REGLA DE SALVAMENTO PARA TÍTULOS ULTRA-CORTOS (Ej: "Korette Naani?")
    // Si al menos una palabra significativa coincide perfectamente Y ambos títulos son cortos de raíz,
    // evitamos que el divisor destruya el emparejamiento.
    const isUltraShort = title1.significantWords.length <= 3 && title2.significantWords.length <= 3;
    const sharesLongKeyWord = intersection.some(w => w.length >= 4); // Ej: "naani" tiene 5 caracteres
    
    if (isUltraShort && sharesLongKeyWord) {
      return {
        matched: true,
        score: 0.6,
        matchType: 'partial'
      };
    }
  }
  
  return { matched: false, score: 0, matchType: 'none' };
};

/**
 * 🎯 MATRIZ DE VALIDACIÓN CRUZADA MULTILINGÜE
 * Compara de forma cruzada todas las variaciones de idioma del anime de AniList 
 * con el objeto/string que devuelve la API del scraper.
 */
export const verifyCrossLanguageMatch = (localAnime: any, remoteAnime: any): boolean => {
  if (!localAnime || !remoteAnime) return false;

  // Títulos locales (de tu app / AniList)
  const localTitles = [
    localAnime.title?.romaji, 
    localAnime.title?.english, 
    localAnime.title?.native
  ].filter(Boolean);

  // Títulos remotos (de la API de búsqueda externa)
  const remoteTitles = [
    typeof remoteAnime.title === 'object' ? remoteAnime.title?.romaji : null,
    typeof remoteAnime.title === 'object' ? remoteAnime.title?.english : null,
    typeof remoteAnime.title === 'object' ? remoteAnime.title?.native : null,
    typeof remoteAnime.title === 'string' ? remoteAnime.title : null,
    remoteAnime.name,
    remoteAnime.titleRomaji
  ].filter(Boolean);

  for (const local of localTitles) {
    const normLocal = normalizeTitleStrict(local);
    
    for (const remote of remoteTitles) {
      const normRemote = normalizeTitleStrict(remote);
      const result = calculateMatchScoreStrict(normLocal, normRemote);
      
      if (result.matched) {
        console.log(`🎯 [Match Cruzado Exitoso]: "${local}" <-> "${remote}" (Score: ${result.score})`);
        return true;
      }
    }
  }
  return false;
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

  if (anime.title?.romaji) {
    addQuery(anime.title.romaji);
  }

  if (anime.title?.english) {
    addQuery(anime.title.english);
  }

  if (!anime.title?.romaji && anime.title?.native) {
    addQuery(anime.title.native);
  }

  const romajiNorm = normalizeTitleStrict(anime.title?.romaji || '');
  if (romajiNorm.significantWords.length >= 2 && romajiNorm.significantWords.length < 5) {
    addQuery(romajiNorm.significantWords.join(' '));
  }

  return queries;
};