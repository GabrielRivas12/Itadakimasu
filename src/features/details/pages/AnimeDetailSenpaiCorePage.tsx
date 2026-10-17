import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SenpaiCoreHeader } from '../components/SenpaiCoreHeader';
import { StatusSelector } from '../components/StatusSelector';
import { RelatedAnimeRow } from '../components/RelatedAnimeRow';
import { SkeletonLoader } from '../components/DetailsSkeleton';
import { EpisodePicker } from '../components/EpisodePicker';
import { EpisodeNavigation } from '../components/EpisodeNavigation';
import { EpisodePlayer } from '../components/EpisodePlayer';
import { NativeEpisodePlayer } from '../components/NativeEpisodePlayer';
import { CustomNativePlayer } from '../components/CustomNativePlayer';
import { ProviderSelector } from '../components/ProviderSelector';
import { VariantSelector } from '../components/VariantSelector';
import { AnimeTrailer } from '../components/AnimeTrailer';
import { useSenpaiCoreDetail } from '../hooks/useSenpaiCoreDetail';
import { cleanHtmlText } from '../utils/animeMatching';
import { getSeasonLabel, getStatusLabel } from '../utils/detailFormat';
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
  buildImageProxyUrl,
  isValidMediaUrl,
  isDirectMediaUrl,
  Anime1VSubtitle,
} from '../../../../services/anime1v';

function parseTrailer(url: string | null | undefined): { id: string; site: string; thumbnail: string | null } | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:embed\/|v=|youtu\.be\/|\/v\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return {
      id: ytMatch[1],
      site: 'youtube',
      thumbnail: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`,
    };
  }
  const dmMatch = url.match(/dailymotion\.com\/(?:embed\/video|video)\/([a-zA-Z0-9]+)/);
  if (dmMatch && dmMatch[1]) {
    return {
      id: dmMatch[1],
      site: 'dailymotion',
      thumbnail: null,
    };
  }
  return null;
}

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

export function AnimeDetailSenpaiCorePage() {
  usePortraitOrientation();
  const router = useRouter();
  const { isWeb, isMobile } = useResponsive();
  const showWebLayout = isWeb && !isMobile;

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
    userStatus,
    userProgress,
    showStatusSelector,
    setShowStatusSelector,
    isUpdatingStatus,
    handleUpdateStatus,
    handleRemove,
  } = useSenpaiCoreDetail();

  const heroRawBackdrop = detail ? detail.backcover || detail.backdrop : null;
  const heroUri = heroRawBackdrop ? buildImageProxyUrl(heroRawBackdrop) : null;

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

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleRelationPress = useCallback((item: { url: string; title: string }) => {
    router.push({
      pathname: '/animatedetailsepaicore',
      params: { url: item.url, title: item.title },
    });
  }, [router]);

  const renderEpisodesSection = () => {
    if (!detail) return null;

    const currentEpisodeIndex = currentEpisode
      ? detail.episodes.findIndex((e) => e.number === currentEpisode.number)
      : -1;
    const prevEpisode = currentEpisodeIndex > 0 ? detail.episodes[currentEpisodeIndex - 1] : null;
    const nextEpisode =
      currentEpisodeIndex >= 0 && currentEpisodeIndex < detail.episodes.length - 1
        ? detail.episodes[currentEpisodeIndex + 1]
        : null;

    return (
      <>
        {currentEpisode && detail.episodes.length > 0 && (
          <EpisodeNavigation
            currentEpisodeNumber={currentEpisode.number}
            hasPrevious={!!prevEpisode}
            hasNext={!!nextEpisode}
            onPrevious={() => prevEpisode && handleEpisodeSelect(prevEpisode)}
            onNext={() => nextEpisode && handleEpisodeSelect(nextEpisode)}
          />
        )}

        <Text style={styles.sectionHeader}>
          {currentEpisode
            ? `Reproduciendo: Episodio ${currentEpisode.number}`
            : 'Episodios'}
        </Text>

        {contentNotAvailable ? (
          <View style={styles.notAvailableContainer}>
            <Ionicons name="videocam-off-outline" size={32} color="#64748b" />
            <Text style={styles.notAvailableText}>
              Este contenido no está disponible actualmente.
            </Text>
          </View>
        ) : loadingStream ? (
          <View style={styles.episodesLoadingContainer}>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={styles.loadingTextSmall}>Cargando lista de reproducción...</Text>
          </View>
        ) : currentEpisode && streamUrl ? (
          <>
            {isWeb || preferredPlayer === 'webview' || nativePlayerFailed ? (
              <EpisodePlayer url={streamUrl} servers={availableServers} isHentaiMoe={isHentaiMoe} />
            ) : useCustomPlayer ? (
              <View style={{ marginBottom: 12 }}>
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
            ) : (
              <View style={{ marginBottom: 12 }}>
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
              </View>
            )}

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
        ) : displayedEpisodes.length === 0 ? (
          <View style={styles.notAvailableContainer}>
            <Text style={styles.notAvailableText}>No se encontraron episodios para este anime.</Text>
          </View>
        ) : null}

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

  const renderContent = () => {
    if (!detail) return null;

    const cleanDescription = detail.description
      ? cleanHtmlText(detail.description)
      : null;

    const displayDescription = cleanDescription ||
      'No hay descripción disponible para este anime.';

    const genres = detail.genres?.length ? detail.genres : null;
    const score = detail.score ?? null;
    const totalEpisodes = detail.totalEpisodes;
    const status = getStatusLabel(detail.status);
    const seasonLabel = getSeasonLabel(detail.season);
    const parsedTrailer = parseTrailer(detail.trailer);

    const renderStats = () => (
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Calificación</Text>
          <Text style={styles.statValue}>
            {score !== null ? `★ ${score.toFixed(1)}` : 'N/A'}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Episodios</Text>
          <Text style={styles.statValue}>{totalEpisodes || 'En emisión'}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Estado</Text>
          <Text style={styles.statValue} numberOfLines={1}>
            {status}
          </Text>
        </View>
      </View>
    );

    const renderGenres = () => {
      if (!genres) return null;

      if (showWebLayout) {
        return (
          <View style={styles.sectionContainer}>
            <View style={styles.genresWrap}>
              {genres.map((genre, index) => (
                <View key={`${genre.name}-${index}`} style={styles.genreChip}>
                  <Text style={styles.genreText}>{genre.name}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      }

      return (
        <View style={styles.sectionContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.genresRow}
          >
            {genres.map((genre, index) => (
              <View key={`${genre.name}-${index}`} style={styles.genreChip}>
                <Text style={styles.genreText}>{genre.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      );
    };

    const renderSynopsis = () => (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeader}>Sinopsis</Text>
        <Text style={styles.synopsisText}>{displayDescription}</Text>
      </View>
    );

    const renderTrailer = () =>
      !!parsedTrailer && (
        <View style={styles.sectionContainer}>
          <AnimeTrailer trailer={parsedTrailer} />
        </View>
      );

    const renderSpecs = () => (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeader}>Ficha Técnica</Text>
        <View style={styles.specCard}>
          {!!detail.type && (
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Tipo</Text>
              <Text style={styles.specValue}>{detail.type}</Text>
            </View>
          )}
          {!!detail.year && (
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Año</Text>
              <Text style={styles.specValue}>{detail.year}</Text>
            </View>
          )}
          {!!seasonLabel && (
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Temporada</Text>
              <Text style={styles.specValue}>{seasonLabel}</Text>
            </View>
          )}
          {!!detail.startDate && (
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Fecha de inicio</Text>
              <Text style={styles.specValue}>{detail.startDate}</Text>
            </View>
          )}
          {!!detail.endDate && (
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Fecha de fin</Text>
              <Text style={styles.specValue}>{detail.endDate}</Text>
            </View>
          )}
        </View>
      </View>
    );

    const renderRelated = () =>
      detail.relations && detail.relations.length > 0 && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>Animes Relacionados</Text>
          <RelatedAnimeRow relations={detail.relations} onPress={handleRelationPress} />
        </View>
      );

    if (showWebLayout) {
      return (
        <View style={styles.webDetailsContainer}>
          <View style={styles.webSidebar}>
            <SenpaiCoreHeader detail={detail} />
            <View style={styles.webSidebarActions}>
              <StatusSelector
                userStatus={userStatus}
                userProgress={userProgress}
                totalEpisodes={detail.totalEpisodes}
                showStatusSelector={showStatusSelector}
                setShowStatusSelector={setShowStatusSelector}
                onUpdateStatus={handleUpdateStatus}
                onRemove={handleRemove}
                isUpdating={isUpdatingStatus}
              />
              {renderStats()}
              {renderGenres()}
              {renderSpecs()}
            </View>
          </View>

          <View style={styles.webMainContent}>
            {renderSynopsis()}
            {renderTrailer()}
            <View style={styles.playerSection}>{renderEpisodesSection()}</View>
            {renderRelated()}
          </View>
        </View>
      );
    }

    return (
      <>
        <SenpaiCoreHeader detail={detail} />
        {renderGenres()}
        <StatusSelector
          userStatus={userStatus}
          userProgress={userProgress}
          totalEpisodes={detail.totalEpisodes}
          showStatusSelector={showStatusSelector}
          setShowStatusSelector={setShowStatusSelector}
          onUpdateStatus={handleUpdateStatus}
          onRemove={handleRemove}
          isUpdating={isUpdatingStatus}
        />
        {renderSynopsis()}
        {renderTrailer()}
        {renderRelated()}

        <View style={styles.playerSection}>{renderEpisodesSection()}</View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ResponsiveContainer>
          <SkeletonLoader />
        </ResponsiveContainer>
      ) : error || !detail ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#f43f5e" />
          <Text style={styles.errorText}>No se pudo cargar la información</Text>
          <View style={styles.errorActions}>
            <TouchableOpacity style={styles.retryButton} onPress={retry}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={goBack}>
              <Text style={styles.backButtonText}>Regresar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {isWeb && detail && heroUri && (
            <View style={[styles.webHeroContainer, isMobile && { height: 300 }]}>
              <Image
                source={{ uri: heroUri }}
                style={styles.webHeroImage}
                resizeMode="cover"
              />
              <View style={styles.webHeroOverlay} />
            </View>
          )}

          <ResponsiveContainer
            contentContainerStyle={StyleSheet.flatten([
              styles.scrollContent,
              isWeb && styles.webScrollContent,
            ])}
          >
            {renderContent()}
          </ResponsiveContainer>
        </>
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
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#334155',
    height: '100%',
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
    paddingLeft: 12,
  },
  synopsisText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'justify',
  },
  genresRow: {
    gap: 8,
    paddingRight: 16,
  },
  genreChip: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  genreText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '600',
  },
  specCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  specLabel: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '600',
  },
  specValue: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  playerSection: {
    marginBottom: 24,
  },
  episodesLoadingContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161b2c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginVertical: 10,
    gap: 12,
  },
  loadingTextSmall: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  notAvailableContainer: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  notAvailableText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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
  backButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  webHeroContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
    width: '100%',
    zIndex: -1,
  },
  webHeroImage: {
    width: '100%',
    height: '100%',
    opacity: 0.4,
  },
  webHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0b0f19',
    opacity: 0.6,
  },
  webScrollContent: {
    paddingTop: 40,
  },
  webDetailsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 40,
  },
  webSidebar: {
    width: 280,
    alignItems: 'center',
  },
  webSidebarActions: {
    width: '100%',
    marginTop: 20,
  },
  webMainContent: {
    flex: 1,
    paddingTop: 10,
  },
  genresWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});