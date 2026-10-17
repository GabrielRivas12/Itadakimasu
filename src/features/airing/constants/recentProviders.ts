export interface RecentProviderTab {
  /** ID enviado al endpoint como `provider`. */
  id: string;
  /** Texto visible en la etiqueta. */
  label: string;
  /** Color de acento de la etiqueta activa. */
  color: string;
}

/**
 * Etiquetas del modo "Recientes" de la pantalla En Emisión.
 * Cada etiqueta realiza su propia solicitud a
 * `/api/v1/anime/recent-episodes-by-provider?provider=<id>`.
 */
export const RECENT_PROVIDER_TABS: RecentProviderTab[] = [
  { id: 'animeav1', label: 'AnimeAV1', color: '#3b82f6' },
  { id: 'tioanime', label: 'TioAnime', color: '#f97316' },
  { id: 'monoschinos', label: 'MonosChinos', color: '#10b981' },
];

/** Proveedor que se carga por defecto al abrir la pantalla. */
export const DEFAULT_RECENT_PROVIDER = 'animeav1';
