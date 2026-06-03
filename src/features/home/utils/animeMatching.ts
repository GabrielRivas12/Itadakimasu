import { NormalizedTitle, MatchResult } from '../types/animeDetails';

export const STOP_WORDS_ENG = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'for', 'in', 'on', 'at',
  'by', 'with', 'without', 'from', 'into', 'through', 'during',
  'la', 'el', 'los', 'las', 'y', 'o', 'de', 'del', 'al', 'para', 'por',
  'con', 'sin', 'sobre', 'entre', 'hasta', 'desde'
]);

export const STOP_WORDS_ANIME = new Set([
  'episode', 'ova', 'special', 'movie', 'film', 'series', 'part',
  'chapter', 'act', 'scene', 'animation', 'anime', 'japan', 'japanese',
  'sub', 'dub', 'hd', 'remastered', 'directors', 'cut', 'version',
  'season', 'tv'
]);

export const STOP_WORDS_ROMAJI = new Set([
  'wa', 'ga', 'wo', 'ha', 'ni', 'no', 'de', 'mo'
]); 

/**
 * 🎯 MAPA DE ALIASES PARA ARCOS COMPLEJOS
 * Permite emparejar arcos específicos cuyos nombres cambian radicalmente entre APIs e idiomas.
 * Búsqueda instantánea O(1) que no penaliza la velocidad.
 */
const SPECIAL_ARCS_MAP: Record<string, string> = {
  'kaigyoku gyokusetsu': 'hidden inventory premature death s2',
  'hidden inventory premature death': 'kaigyoku gyokusetsu s2'
};

/**
 * Normaliza las variantes de temporadas comunes a un formato numérico estándar
 */
const standardizeSeasons = (text: string): string => {
  let normalized = text
    .replace(/\b(?:1st|first|i)\s*season\b|\bseason\s*(?:1st|first|i)\b/g, ' s1 ')
    .replace(/\b(?:2nd|second|ii)\s*season\b|\bseason\s*(?:2nd|second|ii)\b/g, ' s2 ')
    .replace(/\b(?:3rd|third|iii)\s*season\b|\bseason\s*(?:3rd|third|iii)\b/g, ' s3 ')
    .replace(/\b(?:4th|fourth|iv)\s*season\b|\bseason\s*(?:4th|fourth|iv)\b/g, ' s4 ')
    .replace(/\b(?:5th|fifth|v)\s*season\b|\bseason\s*(?:5th|fifth|v)\b/g, ' s5 ')
    .replace(/\bseason\s+(\d+)\b/g, ' s$1 ')
    .replace(/\b(\d+)\s*season\b/g, ' s$1 ');

  // 🛡️ REGLA BOKU NO HERO 4: Si el título termina con un número suelto (1-9), 
  // le agregamos su equivalente sX al final manteniendo el número original.
  const endsWithNumberMatch = normalized.match(/\s+([1-9])$/);
  if (endsWithNumberMatch) {
    normalized += ` s${endsWithNumberMatch[1]}`;
  }

  return normalized;
};

/**
 * 🚀 OPTIMIZACIÓN ULTRA: Distancia de Levenshtein usando solo 2 filas en lugar de una matriz completa.
 */
const getLevenshteinDistanceOpt = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  if (a.length > b.length) {
    const temp = a; a = b; b = temp;
  }

  const row = new Int32Array(a.length + 1);
  for (let i = 0; i <= a.length; i++) row[i] = i;

  for (let i = 1; i <= b.length; i++) {
    let prevLeft = i;
    let prevDiagonal = i - 1;
    const charB = b.charCodeAt(i - 1);

    for (let j = 1; j <= a.length; j++) {
      const temp = row[j];
      const cost = a.charCodeAt(j - 1) === charB ? 0 : 1;
      
      let min = prevLeft + 1;
      if (row[j] + 1 < min) min = row[j] + 1;
      if (prevDiagonal + cost < min) min = prevDiagonal + cost;

      row[j] = min;
      prevLeft = min;
      prevDiagonal = temp;
    }
  }

  return row[a.length];
};

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
      original: '', clean: '', words: [], significantWords: [],
      uniqueIdentifiers: [], fullNormalized: '', wordChunks: [], isLongTitle: false
    };
  }
  
  // Reemplazar interpunct japonés '・' por un espacio regular antes de limpiar
  let clean = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  clean = clean.replace(/・/g, ' ');
  
  clean = standardizeSeasons(clean);

  // Unificación de discrepancias de vocales en Romaji
  clean = clean
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'e')
    .replace(/oo/g, 'o')
    .replace(/uu/g, 'u')
    .replace(/ou/g, 'o');

  clean = clean.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  
  // 🎯 INYECCIÓN DE ALIASES AUTOMÁTICA
  // Si detecta un arco problemático guardado en nuestro mapa, le añade el alias correspondiente.
  for (const arcKey in SPECIAL_ARCS_MAP) {
    if (clean.includes(arcKey)) {
      clean += ` ${SPECIAL_ARCS_MAP[arcKey]}`;
      break;
    }
  }

  const words = clean.split(" ").filter(w => w.length > 0);
  const isLongTitle = words.length >= 6;
  
  const significantWords: string[] = [];
  const uniqueIdentifiers: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const isStopWord = STOP_WORDS_ENG.has(w) || STOP_WORDS_ANIME.has(w) || STOP_WORDS_ROMAJI.has(w);
    
    if (!isStopWord && w.length > 1) {
      significantWords.push(w);
    }
    if (w.length >= 4 || /^\d+$/.test(w) || /^s\d+$/.test(w)) {
      uniqueIdentifiers.push(w);
    }
  }
  
  return {
    original: title,
    clean,
    words,
    significantWords,
    uniqueIdentifiers,
    fullNormalized: clean,
    wordChunks: [],
    isLongTitle
  };
};

/**
 * Calcula similitud entre títulos de forma más flexible pero segura
 */
export const calculateMatchScoreStrict = (
  title1: NormalizedTitle,
  title2: NormalizedTitle
): MatchResult => {
  // 1. Coincidencia exacta limpia
  if (title1.clean === title2.clean) {
    return { matched: true, score: 1.0, matchType: 'exact' };
  }
  
  // 2. Contención total con tolerancia de ratio
  if (title1.clean.includes(title2.clean) || title2.clean.includes(title1.clean)) {
    const ratio = Math.min(title1.clean.length, title2.clean.length) / Math.max(title1.clean.length, title2.clean.length);
    if (ratio > 0.60) {
      return { matched: true, score: 0.95, matchType: 'strong' };
    }
  }

  // 3. Remoción total de espacios (ej: "kore tte" vs "korette")
  const noSpaces1 = title1.clean.replace(/\s/g, '');
  const noSpaces2 = title2.clean.replace(/\s/g, '');
  if (noSpaces1 === noSpaces2 || noSpaces1.includes(noSpaces2) || noSpaces2.includes(noSpaces1)) {
    const ratioNoSpaces = Math.min(noSpaces1.length, noSpaces2.length) / Math.max(noSpaces1.length, noSpaces2.length);
    if (ratioNoSpaces > 0.75) {
      return { matched: true, score: 0.90, matchType: 'strong' };
    }
  }

  // 4. Intersección de palabras significativas
  const set2 = new Set(title2.significantWords);
  const intersection = title1.significantWords.filter(w => set2.has(w));
  
  if (intersection.length > 0) {
    const set1 = new Set(title1.significantWords);
    const score = (intersection.length * 2) / (set1.size + set2.size);
    
    if (score >= 0.55 || (intersection.length >= 2 && score >= 0.45)) {
      // Validar inconsistencia de temporadas de forma directa e instantánea
      const s1 = title1.words.find(w => w.startsWith('s') && w.length > 1 && !isNaN(Number(w.substring(1))));
      const s2 = title2.words.find(w => w.startsWith('s') && w.length > 1 && !isNaN(Number(w.substring(1))));
      if (s1 && s2 && s1 !== s2) {
        return { matched: false, score: 0, matchType: 'none' }; 
      }

      return { 
        matched: true, 
        score, 
        matchType: score >= 0.8 ? 'strong' : 'partial' 
      };
    }

    // Regala salvamento ultra-cortos
    if (title1.words.length <= 3 && title2.words.length <= 3 && intersection.length >= 1) {
      return { matched: true, score: 0.75, matchType: 'partial' };
    }
  }

  // 5. FALLBACK DE LEVENSHTEIN OPTIMIZADO
  if (title1.clean.length >= 4 && title2.clean.length >= 4) {
    const distance = getLevenshteinDistanceOpt(title1.clean, title2.clean);
    const maxLength = Math.max(title1.clean.length, title2.clean.length);
    const similarity = 1 - distance / maxLength;

    if (similarity > 0.82) {
      return { matched: true, score: similarity, matchType: 'partial' };
    }
  }
  
  return { matched: false, score: 0, matchType: 'none' };
};

export const verifyCrossLanguageMatch = (localAnime: any, remoteAnime: any): boolean => {
  if (!localAnime || !remoteAnime) return false;

  const localTitles = Array.from(new Set([
    localAnime.title?.romaji, 
    localAnime.title?.english, 
    localAnime.title?.native
  ].filter(Boolean)));

  const remoteTitles = Array.from(new Set([
    typeof remoteAnime.title === 'object' ? remoteAnime.title?.romaji : null,
    typeof remoteAnime.title === 'object' ? remoteAnime.title?.english : null,
    typeof remoteAnime.title === 'object' ? remoteAnime.title?.native : null,
    typeof remoteAnime.title === 'string' ? remoteAnime.title : null,
    remoteAnime.name,
    remoteAnime.titleRomaji
  ].filter(Boolean)));

  const normalizedLocals = localTitles.map(t => normalizeTitleStrict(t));

  for (let i = 0; i < remoteTitles.length; i++) {
    const normRemote = normalizeTitleStrict(remoteTitles[i]);
    
    for (let j = 0; j < normalizedLocals.length; j++) {
      const result = calculateMatchScoreStrict(normalizedLocals[j], normRemote);
      
      if (result.matched) {
        console.log(`🎯 [Match Cruzado]: "${normalizedLocals[j].original}" <-> "${remoteTitles[i]}"`);
        return true;
      }
    }
  }
  return false;
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

  const romajiNorm = normalizeTitleStrict(anime.title?.romaji || '');
  if (romajiNorm.significantWords.length >= 2 && romajiNorm.significantWords.length < 5) {
    addQuery(romajiNorm.significantWords.join(' '));
  }

  return queries;
};