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

// Términos que indican alta relevancia
export const HIGH_PRIORITY_TERMS = new Set([
  'kai', 'z', 'super', 'gt', 'classic', 'remake', 'reboot', 
  'alternative', 'alternate', 'chronicles', 'gaiden', 'shippuden',
  'brotherhood', '2011', '2020', '2021', '2022', '2023', '2024'
]);

// Palabras ambiguas que pueden causar falsos positivos
export const AMBIGUOUS_WORDS = new Set([
  'love', 'heart', 'star', 'moon', 'dream', 'song', 'music', 'game',
  'special', 'movie', 'film', 'ova', 'trex', 'rex', 'mark', 'oom',
  'cute', 'pretty', 'beautiful', 'new', 'old', 'big', 'little'
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
 * Divide un título largo en chunks para mejor matching
 */
export const splitIntoChunks = (words: string[], chunkSize: number = 3): string[] => {
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += 1) {
    const chunk = words.slice(i, i + chunkSize);
    if (chunk.length >= 2) {
      chunks.push(chunk.join(' '));
    }
  }
  return chunks;
};

/**
 * Normalización con soporte para títulos largos
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
  
  // Limpieza básica
  let clean = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[♡♥❤☆★♪♫☀☾☽]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  
  const words = clean.split(" ").filter(w => w.length > 0);
  
  // Detectar si es un título largo
  const isLongTitle = words.length >= 6;
  
  // Filtrar stopwords - SOLO palabras realmente significativas
  let significantWords = words.filter(w => {
    if (w.length <= 2) return false;
    if (STOP_WORDS.has(w)) return false;
    return true;
  });
  
  // Para títulos largos, también considerar palabras de 3 letras si son significativas
  if (isLongTitle && significantWords.length < 4) {
    significantWords = words.filter(w => {
      if (w.length <= 1) return false;
      if (STOP_WORDS.has(w)) return false;
      return true;
    });
  }
  
  // Identificadores únicos: palabras de 4+ letras o números
  const uniqueIdentifiers = significantWords.filter(w => 
    w.length >= 4 || /^\d+$/.test(w)
  );
  
  // Para títulos largos, generar chunks de diferentes tamaños
  const wordChunks: string[] = [];
  if (isLongTitle && significantWords.length >= 4) {
    // Chunks de 2, 3 y 4 palabras para mejor cobertura
    wordChunks.push(...splitIntoChunks(significantWords, 2));
    wordChunks.push(...splitIntoChunks(significantWords, 3));
    if (significantWords.length >= 5) {
      wordChunks.push(...splitIntoChunks(significantWords, 4));
    }
    // También agregar el título completo
    wordChunks.push(significantWords.join(' '));
  }
  
  return {
    original: title,
    clean,
    words,
    significantWords,
    uniqueIdentifiers,
    fullNormalized: significantWords.join(' '),
    wordChunks: [...new Set(wordChunks)],
    isLongTitle
  };
};

/**
 * Calcula similitud entre títulos - CON SOPORTE PARA TÍTULOS LARGOS
 */
export const calculateMatchScoreStrict = (
  title1: NormalizedTitle,
  title2: NormalizedTitle
): MatchResult => {
  // 1. Coincidencia exacta
  if (title1.clean === title2.clean || title1.original === title2.original) {
    return { matched: true, score: 1.0, matchType: 'exact' };
  }
  
  // 2. Verificar si el título completo contiene al otro
  const contains1 = title2.fullNormalized.includes(title1.fullNormalized);
  const contains2 = title1.fullNormalized.includes(title2.fullNormalized);
  
  if (contains1 || contains2) {
    const shorter = contains1 ? title1.fullNormalized : title2.fullNormalized;
    const longer = contains1 ? title2.fullNormalized : title1.fullNormalized;
    const ratio = shorter.length / longer.length;
    
    const threshold = title1.isLongTitle || title2.isLongTitle ? 0.6 : 0.8;
    if (ratio > threshold && shorter.length > 5) {
      return { matched: true, score: 0.95, matchType: 'strong' };
    }
  }
  
  // 3. Para títulos largos, verificar chunks
  if ((title1.isLongTitle || title2.isLongTitle) && 
      (title1.wordChunks.length > 0 || title2.wordChunks.length > 0)) {
    
    let bestChunkScore = 0;
    let bestChunkMatch = false;
    
    // Comparar chunks del título 1 con título 2 completo
    for (const chunk of title1.wordChunks) {
      if (title2.fullNormalized.includes(chunk)) {
        const ratio = chunk.length / title2.fullNormalized.length;
        if (ratio > 0.5) {
          bestChunkScore = Math.max(bestChunkScore, 0.85);
          bestChunkMatch = true;
        }
      }
    }
    
    // Comparar chunks del título 2 con título 1 completo
    for (const chunk of title2.wordChunks) {
      if (title1.fullNormalized.includes(chunk)) {
        const ratio = chunk.length / title1.fullNormalized.length;
        if (ratio > 0.5) {
          bestChunkScore = Math.max(bestChunkScore, 0.85);
          bestChunkMatch = true;
        }
      }
    }
    
    if (bestChunkMatch && bestChunkScore >= 0.8) {
      return { matched: true, score: bestChunkScore, matchType: 'strong' };
    }
  }
  
  // 4. Análisis de identificadores únicos
  if (title1.uniqueIdentifiers.length >= 2 && title2.uniqueIdentifiers.length >= 2) {
    const commonUnique = title1.uniqueIdentifiers.filter(id => 
      title2.uniqueIdentifiers.includes(id)
    );
    
    const minRequired = (title1.isLongTitle || title2.isLongTitle) ? 2 : 2;
    
    if (commonUnique.length >= minRequired) {
      let score = commonUnique.length / Math.max(title1.uniqueIdentifiers.length, title2.uniqueIdentifiers.length);
      if (score >= 0.6) {
        score = Math.min(0.95, score + 0.1);
        if (score >= 0.8) {
          return { matched: true, score, matchType: 'strong' };
        } else if (score >= 0.7) {
          return { matched: true, score, matchType: 'partial' };
        }
      }
    }
  }
  
  // 5. Análisis de palabras significativas
  const words1 = new Set(title1.significantWords);
  const words2 = new Set(title2.significantWords);
  
  if (words1.size === 0 || words2.size === 0) {
    return { matched: false, score: 0, matchType: 'none' };
  }
  
  // Encontrar intersección exacta
  let intersection = [...words1].filter(w => words2.has(w));
  
  // Para títulos largos, permitir coincidencia parcial de palabras compuestas
  if ((title1.isLongTitle || title2.isLongTitle) && intersection.length < 2) {
    // Buscar palabras que sean substrings
    for (const w1 of words1) {
      for (const w2 of words2) {
        if (w1.length >= 4 && w2.length >= 4 && (w1.includes(w2) || w2.includes(w1))) {
          intersection.push(w1);
          break;
        }
      }
    }
  }
  
  // === REGLAS ESTRICTAS ===
  
  const minIntersection = (title1.isLongTitle || title2.isLongTitle) ? 2 : 2;
  if (intersection.length < minIntersection) {
    return { matched: false, score: intersection.length / 10, matchType: 'none' };
  }
  
  // Verificar palabras ambiguas
  const hasAmbiguousWord = intersection.some(w => AMBIGUOUS_WORDS.has(w));
  const ambiguousThreshold = (title1.isLongTitle || title2.isLongTitle) ? 2 : 3;
  if (hasAmbiguousWord && intersection.length < ambiguousThreshold) {
    return { matched: false, score: 0.3, matchType: 'none' };
  }
  
  // Calcular score base
  let score = intersection.length / Math.max(words1.size, words2.size);
  
  // Bonus por términos de alta prioridad
  const highPriorityMatch = [...HIGH_PRIORITY_TERMS].some(term => 
    words1.has(term) && words2.has(term)
  );
  if (highPriorityMatch) {
    score += 0.2;
  }
  
  // Bonus para títulos largos que tienen buena cobertura de chunks
  if (title1.isLongTitle && title2.isLongTitle && score >= 0.5) {
    score += 0.1;
  }
  
  // Penalizar si hay muchas palabras que no coinciden
  const totalUnique = new Set([...words1, ...words2]).size;
  const nonMatching = totalUnique - intersection.length;
  if (nonMatching > intersection.length * 1.5) {
    score *= 0.7;
  }
  
  // Thresholds ajustados para títulos largos
  const strongThreshold = (title1.isLongTitle || title2.isLongTitle) ? 0.75 : 0.85;
  const partialThreshold = (title1.isLongTitle || title2.isLongTitle) ? 0.65 : 0.75;
  const partialMinIntersection = (title1.isLongTitle || title2.isLongTitle) ? 2 : 3;
  
  if (score >= strongThreshold) {
    return { matched: true, score, matchType: 'strong' };
  } else if (score >= partialThreshold && intersection.length >= partialMinIntersection) {
    return { matched: true, score, matchType: 'partial' };
  }
  
  return { matched: false, score, matchType: 'none' };
};

/**
 * Construye queries optimizadas para títulos largos y cortos
 */
export const buildSearchQueriesStrict = (anime: any): string[] => {
  const titles = [
    anime.title.romaji,
    anime.title.english,
    anime.title.native
  ].filter(Boolean);
  
  const queries: string[] = [];
  const seen = new Set<string>();
  
  for (const title of titles) {
    const normalized = normalizeTitleStrict(title);
    
    // Query original
    if (!seen.has(title)) {
      queries.push(title);
      seen.add(title);
    }
    
    // Query con identificadores únicos
    if (normalized.uniqueIdentifiers.length >= 2) {
      const uniqueQuery = normalized.uniqueIdentifiers.slice(0, 3).join(' ');
      if (!seen.has(uniqueQuery)) {
        queries.push(uniqueQuery);
        seen.add(uniqueQuery);
      }
    }
    
    // Query con palabras significativas completas
    if (normalized.significantWords.length >= 2) {
      const sigQuery = normalized.significantWords.join(' ');
      if (!seen.has(sigQuery)) {
        queries.push(sigQuery);
        seen.add(sigQuery);
      }
    }
    
    // Para títulos largos, agregar queries con chunks
    if (normalized.isLongTitle && normalized.wordChunks.length > 0) {
      // Agregar los chunks más relevantes (primeros 3)
      const topChunks = normalized.wordChunks.slice(0, 3);
      for (const chunk of topChunks) {
        if (!seen.has(chunk) && chunk.length > 5) {
          queries.push(chunk);
          seen.add(chunk);
        }
      }
    }
    
    // Query con primeras N palabras (para títulos muy largos)
    if (normalized.significantWords.length >= 4) {
      const first3 = normalized.significantWords.slice(0, 3).join(' ');
      if (!seen.has(first3)) {
        queries.push(first3);
        seen.add(first3);
      }
      
      const first4 = normalized.significantWords.slice(0, 4).join(' ');
      if (!seen.has(first4)) {
        queries.push(first4);
        seen.add(first4);
      }
    }
  }
  
  // Ordenar por longitud (más específicas primero) y eliminar duplicados
  return [...new Set(queries)].sort((a, b) => b.length - a.length);
};
