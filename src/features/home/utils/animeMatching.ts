import { NormalizedTitle, MatchResult } from '../types/animeDetails';

// ─────────────────────────────────────────────
// STOP WORDS — Sin cambios de lógica
// ─────────────────────────────────────────────
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

const SPECIAL_ARCS_MAP: Record<string, string> = {
  'kaigyoku gyokusetsu': 'hidden inventory premature death s2',
  'hidden inventory premature death': 'kaigyoku gyokusetsu s2'
};

// ─────────────────────────────────────────────
// OPT 1: Regex precompiladas — Evita recompilar en cada llamada
// ─────────────────────────────────────────────
const RX_NFD        = /[\u0300-\u036f]/g;
const RX_NAKAGURO   = /・/g;
const RX_DOUBLE_AA  = /aa/g;
const RX_DOUBLE_EE  = /ee/g;
const RX_DOUBLE_OO  = /oo/g;
const RX_DOUBLE_UU  = /uu/g;
const RX_OU         = /ou/g;
const RX_NON_ALNUM  = /[^a-z0-9\s]/g;
const RX_MULTI_SP   = /\s+/g;
const RX_SPACE      = /\s/g;

const RX_S1  = /\b(?:1st|first|i)\s*season\b|\bseason\s*(?:1st|first|i)\b/g;
const RX_S2  = /\b(?:2nd|second|ii)\s*season\b|\bseason\s*(?:2nd|second|ii)\b/g;
const RX_S3  = /\b(?:3rd|third|iii)\s*season\b|\bseason\s*(?:3rd|third|iii)\b/g;
const RX_S4  = /\b(?:4th|fourth|iv)\s*season\b|\bseason\s*(?:4th|fourth|iv)\b/g;
const RX_S5  = /\b(?:5th|fifth|v)\s*season\b|\bseason\s*(?:5th|fifth|v)\b/g;
const RX_SN  = /\bseason\s+(\d+)\b/g;
const RX_NS  = /\b(\d+)\s*season\b/g;
const RX_END_NUM = /\s+([1-9])$/;

const standardizeSeasons = (text: string): string => {
  let n = text
    .replace(RX_S1, ' s1 ')
    .replace(RX_S2, ' s2 ')
    .replace(RX_S3, ' s3 ')
    .replace(RX_S4, ' s4 ')
    .replace(RX_S5, ' s5 ')
    .replace(RX_SN, ' s$1 ')
    .replace(RX_NS, ' s$1 ');

  const m = n.match(RX_END_NUM);
  if (m) n += ` s${m[1]}`;
  return n;
};

// ─────────────────────────────────────────────
// OPT 2: Memoización con LRU expandido para Sincronizaciones Pesadas
// ─────────────────────────────────────────────
class LRUCache<K, V> {
  private map = new Map<K, V>();
  constructor(private max: number) {}

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const v = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.max) {
      this.map.delete(this.map.keys().next().value!);
    }
    this.map.set(key, value);
  }

  clear(): void { this.map.clear(); }
}

// Elevado a 2500 para contener catálogos enteros vinculados tras un login sin desbordar el caché
const normCache = new LRUCache<string, NormalizedTitle>(2500);
// Caché secundario dinámico para pares de comparación de scoring ya procesados
const scoreCache = new Map<string, MatchResult>();

/** Limpia ambos cachés manualmente (útil al cambiar de cuenta o de lista) */
export const clearNormCache = (): void => {
  normCache.clear();
  scoreCache.clear();
};

// ─────────────────────────────────────────────
// OPT 3: Levenshtein — Early-exit por umbral
// ─────────────────────────────────────────────
const getLevenshteinDistanceOpt = (a: string, b: string, maxDist: number): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;

  if (a.length > b.length) { const t = a; a = b; b = t; }

  const row = new Int32Array(a.length + 1);
  for (let i = 0; i <= a.length; i++) row[i] = i;

  for (let i = 1; i <= b.length; i++) {
    let prevLeft = i;
    let prevDiagonal = i - 1;
    const charB = b.charCodeAt(i - 1);
    let rowMin = Infinity;

    for (let j = 1; j <= a.length; j++) {
      const tmp = row[j];
      const cost = a.charCodeAt(j - 1) === charB ? 0 : 1;

      let min = prevLeft + 1;
      if (row[j] + 1 < min) min = row[j] + 1;
      if (prevDiagonal + cost < min) min = prevDiagonal + cost;

      row[j] = min;
      prevLeft = min;
      prevDiagonal = tmp;
      if (min < rowMin) rowMin = min;
    }

    if (rowMin > maxDist) return maxDist + 1;
  }

  return row[a.length];
};

// ─────────────────────────────────────────────
// cleanHtmlText
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// normalizeTitleStrict — Efectividad Intacta + Memoización
// ─────────────────────────────────────────────
export const normalizeTitleStrict = (title: string): NormalizedTitle => {
  if (!title) {
    return {
      original: '', clean: '', words: [], significantWords: [],
      uniqueIdentifiers: [], fullNormalized: '', wordChunks: [], isLongTitle: false
    };
  }

  const cached = normCache.get(title);
  if (cached) return cached;

  let clean = title.toLowerCase().normalize("NFD").replace(RX_NFD, "");
  clean = clean.replace(RX_NAKAGURO, ' ');
  clean = standardizeSeasons(clean);
  clean = clean
    .replace(RX_DOUBLE_AA, 'a')
    .replace(RX_DOUBLE_EE, 'e')
    .replace(RX_DOUBLE_OO, 'o')
    .replace(RX_DOUBLE_UU, 'u')
    .replace(RX_OU, 'o');
  clean = clean.replace(RX_NON_ALNUM, " ").replace(RX_MULTI_SP, " ").trim();

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
    const isStop = STOP_WORDS_ENG.has(w) || STOP_WORDS_ANIME.has(w) || STOP_WORDS_ROMAJI.has(w);
    if (!isStop && w.length > 1) significantWords.push(w);
    if (w.length >= 4 || /^\d+$/.test(w) || /^s\d+$/.test(w)) uniqueIdentifiers.push(w);
  }

  const result: NormalizedTitle = {
    original: title, clean, words, significantWords,
    uniqueIdentifiers, fullNormalized: clean, wordChunks: [], isLongTitle
  };

  normCache.set(title, result);
  return result;
};

// ─────────────────────────────────────────────
// calculateMatchScoreStrict — Máxima Precisión + Caché de Resultados
// ─────────────────────────────────────────────
export const calculateMatchScoreStrict = (
  title1: NormalizedTitle,
  title2: NormalizedTitle
): MatchResult => {
  // Salida rápida por strings limpios idénticos
  if (title1.clean === title2.clean) {
    return { matched: true, score: 1.0, matchType: 'exact' };
  }

  // Comprobación de caché cruzado para evitar re-cálculos algorítmicos complejos
  const cacheKey = title1.clean < title2.clean ? `${title1.clean}::${title2.clean}` : `${title2.clean}::${title1.clean}`;
  if (scoreCache.has(cacheKey)) {
    return scoreCache.get(cacheKey)!;
  }

  let finalResult: MatchResult = { matched: false, score: 0, matchType: 'none' };

  // Ejecución consecutiva de tus reglas de negocio estrictas
  runValidation: {
    // 2. Contención total
    if (title1.clean.includes(title2.clean) || title2.clean.includes(title1.clean)) {
      const ratio = Math.min(title1.clean.length, title2.clean.length) /
                    Math.max(title1.clean.length, title2.clean.length);
      if (ratio > 0.60) {
        finalResult = { matched: true, score: 0.95, matchType: 'strong' };
        break runValidation;
      }
    }

    // 3. Sin espacios
    const noSpaces1 = title1.clean.replace(RX_SPACE, '');
    const noSpaces2 = title2.clean.replace(RX_SPACE, '');
    if (noSpaces1 === noSpaces2 || noSpaces1.includes(noSpaces2) || noSpaces2.includes(noSpaces1)) {
      const r = Math.min(noSpaces1.length, noSpaces2.length) /
                Math.max(noSpaces1.length, noSpaces2.length);
      if (r > 0.75) {
        finalResult = { matched: true, score: 0.90, matchType: 'strong' };
        break runValidation;
      }
    }

// 4. Intersección de palabras significativas (Para títulos complejos/largos)
    const set2 = new Set(title2.significantWords);
    const intersection = title1.significantWords.filter(w => set2.has(w));

    if (intersection.length > 0) {
      const set1Size = title1.significantWords.length;

      // ─────────────────────────────────────────────
      // INICIO DEL PARCHE: Tolerancia a truncamiento en títulos extra largos
      // ─────────────────────────────────────────────
      if (title1.isLongTitle || title2.isLongTitle) {
        const minSetSize = Math.min(set1Size, set2.size);
        if (intersection.length >= 3 && (intersection.length / minSetSize) >= 0.80) {
          finalResult = { matched: true, score: 0.85, matchType: 'partial' };
          break runValidation;
        }
      }
      // ─────────────────────────────────────────────
      // FIN DEL PARCHE
      // ─────────────────────────────────────────────

      const score = (intersection.length * 2) / (set1Size + set2.size);

      if (score >= 0.55 || (intersection.length >= 2 && score >= 0.45)) {
        const s1 = title1.words.find(w => w.startsWith('s') && w.length > 1 && !isNaN(Number(w.substring(1))));
        const s2 = title2.words.find(w => w.startsWith('s') && w.length > 1 && !isNaN(Number(w.substring(1))));
        if (s1 && s2 && s1 !== s2) {
          finalResult = { matched: false, score: 0, matchType: 'none' };
          break runValidation;
        }
        finalResult = { matched: true, score, matchType: score >= 0.8 ? 'strong' : 'partial' };
        break runValidation;
      }

      if (title1.words.length <= 3 && title2.words.length <= 3 && intersection.length >= 1) {
        finalResult = { matched: true, score: 0.75, matchType: 'partial' };
        break runValidation;
      }
    }

    // 5. Levenshtein Estricto con early-exit por umbral (0.82)
    if (title1.clean.length >= 4 && title2.clean.length >= 4) {
      const maxLength = Math.max(title1.clean.length, title2.clean.length);
      const maxAllowedDist = Math.floor(maxLength * (1 - 0.82));
      const distance = getLevenshteinDistanceOpt(title1.clean, title2.clean, maxAllowedDist);
      const similarity = 1 - distance / maxLength;

      if (similarity > 0.82) {
        finalResult = { matched: true, score: similarity, matchType: 'partial' };
        break runValidation;
      }
    }
  }

  // Guardamos en caché rápido y limitamos tamaño para no fugar memoria
  if (scoreCache.size > 2000) scoreCache.clear();
  scoreCache.set(cacheKey, finalResult);

  return finalResult;
};

// ─────────────────────────────────────────────
// OPT 4: verifyCrossLanguageMatch — ASÍNCRO-FLUIDO (Resuelve bloqueo de UI)
// ─────────────────────────────────────────────
export const verifyCrossLanguageMatch = async (localAnime: any, remoteAnime: any): Promise<boolean> => {
  if (!localAnime || !remoteAnime) return false;

  // Atajo rápido: si las referencias internas o IDs coinciden, evita procesamiento
  if (localAnime.id && remoteAnime.id && String(localAnime.id) === String(remoteAnime.id)) {
    return true;
  }

  // Recoger títulos locales (deduplicados inline)
  const lt = localAnime.title;
  const localRaw: string[] = [];
  if (lt?.romaji)  localRaw.push(lt.romaji);
  if (lt?.english && lt.english !== lt.romaji) localRaw.push(lt.english);
  if (lt?.native  && lt.native  !== lt.romaji && lt.native !== lt.english) localRaw.push(lt.native);

  if (localRaw.length === 0) return false;

  // Recoger títulos remotos (deduplicados inline)
  const rt = remoteAnime.title;
  const seen = new Set<string>();
  const remoteTitles: string[] = [];
  const addRemote = (v: any) => {
    if (typeof v === 'string' && v && !seen.has(v)) { seen.add(v); remoteTitles.push(v); }
  };
  if (typeof rt === 'object') { addRemote(rt?.romaji); addRemote(rt?.english); addRemote(rt?.native); }
  if (typeof rt === 'string') addRemote(rt);
  addRemote(remoteAnime.name);
  addRemote(remoteAnime.titleRomaji);

  if (remoteTitles.length === 0) return false;

  // Normalizar locales una sola vez aprovechando el LRU
  const normalizedLocals = localRaw.map(normalizeTitleStrict);

  let opCounter = 0;

  for (let i = 0; i < remoteTitles.length; i++) {
    const normRemote = normalizeTitleStrict(remoteTitles[i]);
    for (let j = 0; j < normalizedLocals.length; j++) {
      
      // CONTROLADOR DE BATCHING: Cada 12 comparaciones profundas, rompemos el bucle
      // síncrono inyectando una microtarea al Event Loop de JavaScript.
      // Esto da tiempo al reproductor y animaciones de carga para renderizar sin interrupciones.
      opCounter++;
      if (opCounter % 12 === 0) {
        await new Promise(resolve => {
          if (typeof setImmediate !== 'undefined') {
            setImmediate(resolve);
          } else {
            setTimeout(resolve, 0);
          }
        });
      }

      if (calculateMatchScoreStrict(normalizedLocals[j], normRemote).matched) {
        console.log(`🎯 [Match Cruzado]: "${normalizedLocals[j].original}" <-> "${remoteTitles[i]}"`);
        return true;
      }
    }
  }
  return false;
};

// ─────────────────────────────────────────────
// buildSearchQueriesStrict — Sin cambios de lógica
// ─────────────────────────────────────────────
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

  if (anime.title?.romaji)   addQuery(anime.title.romaji);
  if (anime.title?.english)  addQuery(anime.title.english);
  if (!anime.title?.romaji && anime.title?.native) addQuery(anime.title.native);

  const romajiNorm = normalizeTitleStrict(anime.title?.romaji || '');
  if (romajiNorm.significantWords.length >= 2 && romajiNorm.significantWords.length < 5) {
    addQuery(romajiNorm.significantWords.join(' '));
  }

  return queries;
};