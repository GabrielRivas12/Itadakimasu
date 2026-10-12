// Ubicación sugerida: utils/customPlayer.ts (junto a animeMatching.ts)

// Dominios que usan el reproductor personalizado (con subtítulos propios).
// Para agregar más en el futuro, solo añade el host aquí.
export const CUSTOM_PLAYER_HOSTS = ['hentaila.moe', 'hentaila.io'];

// Hosts del reproductor embebido de HentaiLA (angl. hentaiplayer) y del CDN
// de streaming directo (1hanime). Cloudflare bloquea el /video-proxy de servidor
// para estos, por lo que deben reproducirse con la URL DIRECTA en web y nativo.
const HENTAI_EMBED_HOSTS = ['hentaiplayer.com'];
const HENTAI_DIRECT_STREAM_HOSTS = ['1hanime.com'];

const getHost = (value?: string | null): string | null => {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
};

export const isCustomPlayerUrl = (value?: string | null): boolean => {
  const host = getHost(value);
  if (!host) return false;
  return CUSTOM_PLAYER_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
};

// La API devuelve provider "HentaiLA .moe"/"HentaiLA .io" y domain ".moe"/".io".
export const isCustomPlayerProvider = (
  provider?: string | null,
  domain?: string | null
): boolean => {
  const dom = (domain || '').trim().toLowerCase();
  if (dom === '.moe' || dom === '.io') return true;
  return !!provider && /hentaila\s*\.?\s*(moe|io)/i.test(provider);
};

const hostMatches = (host: string | null, list: string[]): boolean =>
  !!host && list.some((h) => host === h || host.endsWith(`.${h}`));

// Embed de reproductor HentaiLA (hentaiplayer.com/v/...).
export const isHentaiPlayerEmbed = (value?: string | null): boolean =>
  hostMatches(getHost(value), HENTAI_EMBED_HOSTS);

// Stream directo servido por el CDN de HentaiLA (1hanime.com).
export const isHentaiDirectStream = (value?: string | null): boolean =>
  hostMatches(getHost(value), HENTAI_DIRECT_STREAM_HOSTS);

// True si la URL es un embed de HentaiLA o un stream directo de 1hanime.
// En ese caso el video NO debe pasar por /video-proxy (Cloudflare lo bloquea).
export const isHentaiDirectSource = (value?: string | null): boolean =>
  isHentaiPlayerEmbed(value) || isHentaiDirectStream(value);

// --- HentaiLA .io (reproducción vía WebView) ---
// El .io resuelve a un embed hentaiplayer.com que entrega un MP4 directo en
// r2.1hanime.com. ExoPlayer/OkHttp recibe 403 de Cloudflare (huella TLS), así
// que el .io se reproduce en un WebView (stack Chromium) con <video> + <track>.
// El .moe NO usa ninguno de estos hosts, por lo que no se ve afectado.
const HENTAI_IO_HOSTS = ['hentaila.io', 'hentaiplayer.com', '1hanime.com'];

// True si la URL (serie, episodio, embed o stream) pertenece a HentaiLA .io.
export const isHentaiIoSource = (value?: string | null): boolean =>
  hostMatches(getHost(value), HENTAI_IO_HOSTS);

// La API devuelve provider "HentaiLA .io" y domain ".io". Solo el .io.
export const isHentaiIoProvider = (
  provider?: string | null,
  domain?: string | null
): boolean => {
  const dom = (domain || '').trim().toLowerCase();
  if (dom === '.io') return true;
  return !!provider && /hentaila\s*\.?\s*io/i.test(provider);
};