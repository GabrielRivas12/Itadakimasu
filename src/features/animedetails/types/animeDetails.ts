export interface NormalizedTitle {
  original: string;
  clean: string;
  words: string[];
  significantWords: string[];
  uniqueIdentifiers: string[];
  fullNormalized: string;
  wordChunks: string[];
  isLongTitle: boolean;
}

export interface MatchResult {
  matched: boolean;
  score: number;
  matchType: 'exact' | 'strong' | 'partial' | 'none';
}

export interface SearchResult {
  item: any;
  score: number;
  matchType: MatchResult['matchType'];
}
