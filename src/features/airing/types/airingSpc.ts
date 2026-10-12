export interface AiringSpcItem {
  title: string;
  slug: string;
  url: string;
  image: string;
  episode: number;
  dateLabel?: string | null;
  timestamp?: string | null;
  provider: string;
  malId?: number | null;
  backdrop?: string | null;
  domain?: string | null;
  category?: string;
  dayOfWeek?: string;
  time?: string;
  predicted?: boolean;
}

export interface ProviderSection {
  provider: string;
  items: AiringSpcItem[];
}