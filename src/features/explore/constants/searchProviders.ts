export interface SearchProviderOption {
  /** ID/dominio enviado al endpoint de búsqueda como `domain`. */
  id: string;
  /** Código corto visible en el botón (AV1, MNC, TA). */
  code: string;
  /** Nombre completo para el menú desplegable. */
  label: string;
  /** Color identificador (mismo que en Airing). */
  color: string;
}

/**
 * Proveedores disponibles para la búsqueda por título de Explorar
 * (`GET /api/v1/anime/search?q=...&domain=<id>`).
 */
export const SEARCH_PROVIDERS: SearchProviderOption[] = [
  { id: 'animeav1', code: 'AV1', label: 'AnimeAV1', color: '#3b82f6' },
  { id: 'monoschinos', code: 'MNC', label: 'MonosChinos', color: '#10b981' },
  { id: 'tioanime', code: 'TA', label: 'TioAnime', color: '#f97316' },
];

/**
 * Proveedores HentaiLA (multi-dominio). Solo se muestra cuando el ajuste
 * de "Contenido +18" está activado en Configuración. La API consulta en
 * paralelo los dominios .com / .moe / .io y cada resultado indica su origen.
 */
export const HENTAILA_SEARCH_PROVIDERS: SearchProviderOption[] = [
  { id: 'hentaila', code: 'HLA', label: 'HentaiLA', color: '#f43f5e' },
];

/** Devuelve los proveedores según si el contenido +18 está activado. */
export const getSearchProviders = (
  includeAdult: boolean
): SearchProviderOption[] =>
  includeAdult
    ? [...SEARCH_PROVIDERS, ...HENTAILA_SEARCH_PROVIDERS]
    : SEARCH_PROVIDERS;

/** Indica si un proveedor es de HentaiLA (contenido +18). */
export const isAdultSearchProvider = (id: string): boolean =>
  HENTAILA_SEARCH_PROVIDERS.some((p) => p.id === id);

/** Proveedor por defecto del buscador. */
export const DEFAULT_SEARCH_PROVIDER = 'animeav1';
