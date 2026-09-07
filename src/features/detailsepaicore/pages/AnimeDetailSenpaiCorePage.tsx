import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SenpaiCoreHeader } from '../components/SenpaiCoreHeader';
import { RelatedAnimeRow } from '../components/RelatedAnimeRow';
import { SkeletonLoader } from '../../animedetails/components/DetailsSkeleton';
import { EpisodePicker } from '../../animedetails/components/EpisodePicker';
import { EpisodePlayer } from '../../animedetails/components/EpisodePlayer';
import { NativeEpisodePlayer } from '../../animedetails/components/NativeEpisodePlayer';
import { ProviderSelector } from '../../animedetails/components/ProviderSelector';
import { VariantSelector } from '../../animedetails/components/VariantSelector';
import { AnimeTrailer } from '../../animedetails/components/AnimeTrailer';
import { useSenpaiCoreDetail } from '../hooks/useSenpaiCoreDetail';
import { cleanHtmlText } from '../../animedetails/utils/animeMatching';
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
} from '../../../../services/anime1v';

const getStatusLabel = (status?: string | null): string => {
  if (!status) return 'Desconocido';

  const statusMap: Record<string, string> = {
    'En emisión': 'En emisión',
    'Currently Airing': 'En emisión',
    'Airing': 'En emisión',
    'Finalizado': 'Finalizado',
    'Finished': 'Finalizado',
    'Próximamente': 'Próximamente',
    'Not yet aired': 'Próximamente',
    'Cancelado': 'Cancelado',
    'Cancelled': 'Cancelado',
    'En pausa': 'En pausa',
    'On Hiatus': 'En pausa',
  };

  return statusMap[status] || status;
};

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

const getSeasonLabel = (season: any): string | null => {
  if (!season) return null;
  if (typeof season === 'string') return season;
  if (season.label) return season.label;
  if (season.name) {
    return season.year ? `${season.name} ${season.year}` : season.name;
  }
  return null;
};


export function AnimeDetailSenpaiCorePage() {
  usePortraitOrientation();
  const router = useRouter();
  const { isWeb } = useResponsive();

  const [nativePlayerFailed, setNativePlayerFailed] = useState(false);
  const [preferredPlayer, setPreferredPlayer] = useState<'native' | 'webview'>('native');
  const [nativePlaybackUrl, setNativePlaybackUrl] = useState<string | null>(null);
  const [nativeResolving, setNativeResolving] = useState(false);
  const [nativeResolveFailed, setNativeResolveFailed] = useState(false);
  const [nativeRetryTick, setNativeRetryTick] = useState(0);

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
    getPlayerType().then(setPreferredPlayer);
  }, []);

  useEffect(() => {
    setNativePlayerFailed(false);
  }, [streamUrl]);

  const buildPlayableUrl = (mediaType: string, resolvedUrl: string) =>
    mediaType === 'hls' ? buildVideoProxyUrl(resolvedUrl) : resolvedUrl;

  useEffect(() => {
    if (preferredPlayer !== 'native' || nativePlayerFailed || isWeb) {
      setNativePlaybackUrl(null);
      setNativeResolving(false);
      setNativeResolveFailed(false);
      return;
    }

    if (!streamUrl) {
      setNativePlaybackUrl(null);
      setNativeResolving(false);
      setNativeResolveFailed(false);
      return;
    }

    const isDirect = isDirectMediaUrl(streamUrl);
    if (isDirect) {
      setNativePlaybackUrl(streamUrl);
      setNativeResolving(false);
      setNativeResolveFailed(false);
      return;
    }

    let cancelled = false;
    setNativeResolving(true);
    setNativeResolveFailed(false);

    (async () => {
      try {
        const selected = await resolveAnime1VStream(streamUrl);
        if (cancelled) return;
        if (selected?.success && selected.streamUrl && isValidMediaUrl(selected.streamUrl)) {
          setNativePlaybackUrl(buildPlayableUrl(selected.mediaType, selected.streamUrl));
          return;
        }

        const others = availableServers.map((s) => s.url).filter((u) => u !== streamUrl);
        if (others.length > 0) {
          const cascaded = await resolveAnime1VStreams(others);
          if (cancelled) return;
          if (cascaded?.success && cascaded.streamUrl && isValidMediaUrl(cascaded.streamUrl)) {
            setNativePlaybackUrl(buildPlayableUrl(cascaded.mediaType, cascaded.streamUrl));
            return;
          }
        }

        setNativePlaybackUrl(null);
        setNativeResolveFailed(true);
      } catch (err) {
        console.error('[NativeResolve] Error:', err);
        if (!cancelled) {
          setNativePlaybackUrl(null);
          setNativeResolveFailed(true);
        }
      } finally {
        if (!cancelled) setNativeResolving(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [streamUrl, availableServers, preferredPlayer, nativePlayerFailed, nativeRetryTick, isWeb]);

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

    return (
      <>
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
              <EpisodePlayer url={streamUrl} />
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

    return (
      <>
        <SenpaiCoreHeader detail={detail} />

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

        {!!genres && (
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
        )}

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>Sinopsis</Text>
          <Text style={styles.synopsisText}>{displayDescription}</Text>
        </View>

        {!!parsedTrailer && (
          <View style={styles.sectionContainer}>
            <AnimeTrailer trailer={parsedTrailer} />
          </View>
        )}

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
            {detail.votes !== null && detail.votes !== undefined && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Votos</Text>
                <Text style={styles.specValue}>{detail.votes.toLocaleString()}</Text>
              </View>
            )}
            {!!detail.malId && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>MyAnimeList ID</Text>
                <Text style={styles.specValue}>#{detail.malId}</Text>
              </View>
            )}
          </View>
        </View>

        {detail.relations && detail.relations.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>Animes Relacionados</Text>
            <RelatedAnimeRow relations={detail.relations} onPress={handleRelationPress} />
          </View>
        )}

        <View style={styles.playerSection}>{renderEpisodesSection()}</View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: !isWeb,
          title: loading ? 'Cargando...' : (detail?.title || 'Detalles'),
          headerTransparent: true,
          headerTintColor: '#ffffff',
          headerLeft: () => (
            <TouchableOpacity onPress={goBack} style={styles.headerIconButton}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
          ),
        }}
      />

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
        <ResponsiveContainer contentContainerStyle={styles.scrollContent}>
          {renderContent()}
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
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginRight: 8,
    marginTop: Platform.OS === 'ios' ? 0 : 12,
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
});