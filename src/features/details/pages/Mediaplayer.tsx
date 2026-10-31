import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EpisodePicker } from '../components/EpisodePicker';
import { EpisodeNavigation } from '../components/EpisodeNavigation';
import { EpisodePlayer } from '../components/EpisodePlayer';
import { NativeEpisodePlayer } from '../components/NativeEpisodePlayer';
import { CustomNativePlayer } from '../components/CustomNativePlayer';
import { ProviderSelector } from '../components/ProviderSelector';
import { VariantSelector } from '../components/VariantSelector';
import { MediaplayerSkeleton } from '../components/MediaplayerSkeleton';
import { useSenpaiCoreDetail } from '../hooks/useSenpaiCoreDetail';
import {
  isCustomPlayerUrl,
  isCustomPlayerProvider,
  isHentaiDirectSource,
  isHentaiPlayerEmbed,
} from '../utils/customPlayer';
import { usePortraitOrientation } from '../../../hooks/usePortraitOrientation';
import { useResponsive } from '../../../hooks/useResponsive';
import { ResponsiveContainer } from '../../../components/common/ResponsiveContainer';
import { getPlayerType } from '../../../../services/cache';
import {
  resolveAnime1VStream,
  resolveAnime1VStreams,
  buildVideoProxyUrl,
  isValidMediaUrl,
  isDirectMediaUrl,
  Anime1VSubtitle,
} from '../../../../services/anime1v';

const MOBILE_BROWSER_UA =
  'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

// Perfiles de headers de menos a más "ruidosos" para la carga directa de
// hentaiplayer.com / 1hanime.com en el reproductor nativo (ExoPlayer/OkHttp).
// Ningún perfil envía Origin / Sec-Fetch-* / Range / Connection: un <video>
// de navegador no los manda en un GET de media y el antihotlink del CDN
// suele rechazar un Origin inesperado.
const buildHeaderProfiles = (embedUrl?: string | null): Record<string, string>[] => {
  const embed = embedUrl && isHentaiPlayerEmbed(embedUrl) ? embedUrl : null;
  const embedOrigin = 'https://hentaiplayer.com/';
  const accept = 'video/mp4,video/webm,video/*;q=0.9,*/*;q=0.5';
  return [
    { 'User-Agent': MOBILE_BROWSER_UA, Referer: embed || embedOrigin, Accept: accept },
    { 'User-Agent': MOBILE_BROWSER_UA, Referer: embedOrigin, Accept: accept },
    { 'User-Agent': MOBILE_BROWSER_UA, Referer: 'https://hentaila.io/', Accept: accept },
    { 'User-Agent': MOBILE_BROWSER_UA, Accept: accept }, // sin Referer
  ];
};

// Devuelve el primer perfil que el CDN acepta (200/206), o null si todos fallan.
// El fetch de RN en Android usa el mismo OkHttp que react-native-video, así que
// si el fetch pasa, ExoPlayer también debería pasar.
const probePlaybackHeaders = async (
  url: string,
  profiles: Record<string, string>[]
): Promise<Record<string, string> | null> => {
  for (const headers of profiles) {
    const controller = new AbortController();
    try {
      const res = await fetch(url, {
        headers: { ...headers, Range: 'bytes=0-1' },
        signal: controller.signal,
      });
      console.log('[Probe]', res.status, Object.keys(headers).join(','), url.slice(0, 80));
      controller.abort(); // no descargar el cuerpo si el server ignora Range
      if (res.status === 200 || res.status === 206) return headers;
    } catch (e: any) {
      console.log('[Probe] error', e?.message);
    }
  }
  return null;
};

export function MediaPlayerPage() {
  usePortraitOrientation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isWeb } = useResponsive();

  const [nativePlayerFailed, setNativePlayerFailed] = useState(false);
  const [preferredPlayer, setPreferredPlayer] = useState<'native' | 'webview'>('native');
  const [nativePlaybackUrl, setNativePlaybackUrl] = useState<string | null>(null);
  const [nativeSubtitles, setNativeSubtitles] = useState<Anime1VSubtitle[]>([]);
  const [nativeResolving, setNativeResolving] = useState(false);
  const [nativeResolveFailed, setNativeResolveFailed] = useState(false);
  const [nativeRetryTick, setNativeRetryTick] = useState(0);
  // Config del reproductor personalizado para HentaiLA: headers de navegador
  // (Cloudflare bloquea requests sin UA/Referer) + subtítulos crudos vía JS.
  const [nativePlaybackHeaders, setNativePlaybackHeaders] = useState<Record<string, string> | undefined>(undefined);
  const [nativeSubtitleMode, setNativeSubtitleMode] = useState<'auto' | 'native' | 'js'>('auto');
  const [nativeRawSubs, setNativeRawSubs] = useState(false);
  const [isPreparing, setIsPreparing] = useState(true);

  const {
    detail,
    loading,
    error,
    retry,
    displayedEpisodes,
    hasMoreEpisodes,
    isLoadingMore,
    loadMoreEpisodes,
    handleEpisodeSelect,
    handleServerChange,
    handleDownloadEpisode,
    currentEpisode,
    streamUrl,
    loadingStream,
    contentNotAvailable,
    availableServers,
    selectedServerName,
    selectedVariant,
    hasDub,
    handleVariantChange,
  } = useSenpaiCoreDetail();

  useEffect(() => {
    if (
      !loading &&
      detail &&
      !loadingStream &&
      (currentEpisode || detail.episodes.length === 0)
    ) {
      setIsPreparing(false);
    }
  }, [loading, detail, loadingStream, currentEpisode]);

  // El player personalizado (con subtítulos propios) solo se activa para
  // dominios definidos en CUSTOM_PLAYER_HOSTS (por ahora: hentaila.moe / .io).
  // Se valida únicamente el origen del anime/episodio, NO los servidores embed
  // ni el streamUrl (esos pueden ser de cualquier dominio).
  const useCustomPlayer = React.useMemo(() => {
    if (isCustomPlayerUrl(detail?.url)) return true;
    if (isCustomPlayerUrl(currentEpisode?.url)) return true;
    if (isCustomPlayerProvider((detail as any)?.provider, (detail as any)?.domain)) return true;
    return false;
  }, [detail, currentEpisode]);

  // Detecta específicamente HentaiLA .moe (solo afecta el estilo de subtítulos
  // del player web; el .io se queda con el estilo por defecto).
  const isHentaiMoe = React.useMemo(() => {
    const dom = String((detail as any)?.domain || '').trim().toLowerCase();
    if (dom === '.moe') return true;
    if (/hentaila\s*\.?\s*moe/i.test(String((detail as any)?.provider || ''))) return true;
    const hostIsMoe = (u?: string | null) => {
      try {
        return new URL(u || '').hostname.replace(/^www\./, '').toLowerCase() === 'hentaila.moe';
      } catch {
        return false;
      }
    };
    return hostIsMoe(detail?.url) || hostIsMoe(currentEpisode?.url ?? null);
  }, [detail, currentEpisode]);

  useEffect(() => {
    getPlayerType().then(setPreferredPlayer);
  }, []);

  useEffect(() => {
    setNativePlayerFailed(false);
  }, [streamUrl]);

  // Los servidores de HentaiLA (hentaiplayer.com / 1hanime.com) deben recibir la
  // URL DIRECTA: Cloudflare bloquea los proxies de servidor pero acepta la carga
  // directa desde el cliente si la request trae headers de navegador. Antes de
  // entregar la URL al player se sondean varios perfiles de headers; si todos
  // dan 403 se devuelve false y la pantalla cae al WebView. El resto de fuentes
  // sigue pasando por /video-proxy.
  const applyNativeSource = useCallback(
    async (resolvedUrl: string, resolvedFrom?: string | null): Promise<boolean> => {
      const hentai =
        isHentaiDirectSource(resolvedUrl) || isHentaiDirectSource(resolvedFrom);

      if (!hentai) {
        setNativePlaybackUrl(buildVideoProxyUrl(resolvedUrl));
        setNativePlaybackHeaders(undefined);
        setNativeSubtitleMode('auto');
        setNativeRawSubs(false);
        return true;
      }

      const working = await probePlaybackHeaders(resolvedUrl, buildHeaderProfiles(resolvedFrom));
      if (!working) {
        console.warn('[Native] Todos los perfiles de headers fallaron -> fallback a WebView');
        return false;
      }

      setNativePlaybackUrl(resolvedUrl);
      setNativePlaybackHeaders(working);
      setNativeSubtitleMode('js');
      setNativeRawSubs(true);
      return true;
    },
    []
  );

  const resetNativeSource = useCallback(() => {
    setNativePlaybackUrl(null);
    setNativeSubtitles([]);
    setNativePlaybackHeaders(undefined);
    setNativeSubtitleMode('auto');
    setNativeRawSubs(false);
  }, []);

  useEffect(() => {
    if (preferredPlayer !== 'native' || nativePlayerFailed || isWeb) {
      resetNativeSource();
      setNativeResolving(false);
      setNativeResolveFailed(false);
      return;
    }

    if (!streamUrl) {
      resetNativeSource();
      setNativeResolving(false);
      setNativeResolveFailed(false);
      return;
    }

    let cancelled = false;

    const isDirect = isDirectMediaUrl(streamUrl);
    if (isDirect) {
      setNativeResolving(true);
      setNativeResolveFailed(false);
      applyNativeSource(streamUrl).then((ok) => {
        if (cancelled) return;
        setNativeSubtitles([]);
        setNativeResolving(false);
        if (!ok) setNativePlayerFailed(true);
      });
      return () => {
        cancelled = true;
      };
    }

    setNativeResolving(true);
    setNativeResolveFailed(false);

    (async () => {
      try {
        const selected = await resolveAnime1VStream(streamUrl);
        if (cancelled) return;
        if (selected?.success && selected.streamUrl && isValidMediaUrl(selected.streamUrl)) {
          const ok = await applyNativeSource(selected.streamUrl, selected.resolvedFrom);
          if (cancelled) return;
          if (ok) {
            setNativeSubtitles(selected.subtitles ?? []);
            return;
          }
          setNativePlayerFailed(true);
          return;
        }

        const others = availableServers.map((s) => s.url).filter((u) => u !== streamUrl);
        if (others.length > 0) {
          const cascaded = await resolveAnime1VStreams(others);
          if (cancelled) return;
          if (cascaded?.success && cascaded.streamUrl && isValidMediaUrl(cascaded.streamUrl)) {
            const ok = await applyNativeSource(cascaded.streamUrl, cascaded.resolvedFrom);
            if (cancelled) return;
            if (ok) {
              setNativeSubtitles(cascaded.subtitles ?? []);
              return;
            }
            setNativePlayerFailed(true);
            return;
          }
        }

        resetNativeSource();
        setNativeResolveFailed(true);
      } catch (err) {
        console.error('[NativeResolve] Error:', err);
        if (!cancelled) {
          resetNativeSource();
          setNativeResolveFailed(true);
        }
      } finally {
        if (!cancelled) setNativeResolving(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [streamUrl, availableServers, preferredPlayer, nativePlayerFailed, nativeRetryTick, isWeb, applyNativeSource, resetNativeSource]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [router]);

  const handleListScroll = useCallback(({ nativeEvent }: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const isNearBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 200;
    if (isNearBottom) loadMoreEpisodes();
  }, [loadMoreEpisodes]);

  const currentEpisodeIndex =
    currentEpisode && detail
      ? detail.episodes.findIndex((e) => e.number === currentEpisode.number)
      : -1;
  const prevEpisode =
    detail && currentEpisodeIndex > 0 ? detail.episodes[currentEpisodeIndex - 1] : null;
  const nextEpisode =
    detail && currentEpisodeIndex >= 0 && currentEpisodeIndex < detail.episodes.length - 1
      ? detail.episodes[currentEpisodeIndex + 1]
      : null;

  const renderPlayer = () => {
    if (!currentEpisode || loadingStream) {
      return (
        <View style={styles.playerFrame}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      );
    }

    if (contentNotAvailable || !streamUrl) {
      return (
        <View style={styles.playerFrame}>
          <Ionicons name="videocam-off-outline" size={32} color="#64748b" />
          <Text style={styles.statusText}>
            Este contenido no está disponible actualmente.
          </Text>
        </View>
      );
    }

    if (isWeb || preferredPlayer === 'webview' || nativePlayerFailed) {
      return (
        <EpisodePlayer url={streamUrl} servers={availableServers} isHentaiMoe={isHentaiMoe} />
      );
    }

    if (useCustomPlayer) {
      return (
        <View style={styles.playerWrapper}>
          <CustomNativePlayer
            url={nativePlaybackUrl}
            subtitles={nativeSubtitles}
            headers={nativePlaybackHeaders}
            subtitleRenderMode={nativeSubtitleMode}
            bypassSubtitleProxy={nativeRawSubs}
            title={detail?.title || currentEpisode?.title || undefined}
            onError={() => setNativePlayerFailed(true)}
            onRetry={() => {
              setNativeResolveFailed(false);
              setNativeRetryTick((t) => t + 1);
            }}
          />
        </View>
      );
    }

    return (
      <NativeEpisodePlayer
        url={nativePlaybackUrl}
        resolving={nativeResolving}
        resolveFailed={nativeResolveFailed}
        onError={() => setNativePlayerFailed(true)}
        onRetry={() => {
          setNativeResolveFailed(false);
          setNativeRetryTick((t) => t + 1);
        }}
      />
    );
  };

  const renderContent = () => {
    if (!detail) return null;

    return (
      <>
        {renderPlayer()}

        {currentEpisode && detail.episodes.length > 0 && (
          <EpisodeNavigation
            currentEpisodeNumber={currentEpisode.number}
            hasPrevious={!!prevEpisode}
            hasNext={!!nextEpisode}
            onPrevious={() => prevEpisode && handleEpisodeSelect(prevEpisode)}
            onNext={() => nextEpisode && handleEpisodeSelect(nextEpisode)}
          />
        )}

        {currentEpisode && streamUrl && !contentNotAvailable && (
          <>
            <VariantSelector
              hasDub={hasDub}
              selectedVariant={selectedVariant}
              onVariantChange={handleVariantChange}
            />

            {availableServers.length > 0 && (
              <ProviderSelector
                availableServers={availableServers}
                selectedServerName={selectedServerName}
                onServerChange={handleServerChange}
                activeUrl={streamUrl}
              />
            )}
          </>
        )}

        <EpisodePicker
          episodes={displayedEpisodes}
          currentEpisodeNumber={currentEpisode?.number || null}
          onEpisodePress={handleEpisodeSelect}
          onDownloadPress={handleDownloadEpisode}
          onLoadMore={loadMoreEpisodes}
          hasMore={hasMoreEpisodes}
          isLoadingMore={isLoadingMore}
        />
      </>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {loading ? (
        <ResponsiveContainer contentContainerStyle={styles.scrollContent}>
          <MediaplayerSkeleton />
        </ResponsiveContainer>
      ) : error || !detail ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#f43f5e" />
          <Text style={styles.errorText}>No se pudo cargar el reproductor</Text>
          <View style={styles.errorActions}>
            <TouchableOpacity style={styles.retryButton} onPress={retry}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButtonSolid} onPress={goBack}>
              <Text style={styles.backButtonText}>Regresar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ResponsiveContainer
          contentContainerStyle={styles.scrollContent}
          onScroll={handleListScroll}
          scrollEventThrottle={16}
        >
          {isPreparing ? (
            <MediaplayerSkeleton />
          ) : (
            renderContent()
          )}
        </ResponsiveContainer>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  playerWrapper: {
    marginBottom: 12,
  },
  playerFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  statusText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 24,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#a78bfa',
    fontWeight: 'bold',
  },
  backButtonSolid: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
