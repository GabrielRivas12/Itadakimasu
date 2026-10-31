import React, { useCallback } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SenpaiCoreHeader } from '../components/SenpaiCoreHeader';
import { StatusSelector } from '../components/StatusSelector';
import { RelatedAnimeRow } from '../components/RelatedAnimeRow';
import { SkeletonLoader } from '../components/DetailsSkeleton';
import { EpisodePicker } from '../components/EpisodePicker';
import { EpisodeNavigation } from '../components/EpisodeNavigation';
import { EpisodePlayer } from '../components/EpisodePlayer';
import { ProviderSelector } from '../components/ProviderSelector';
import { VariantSelector } from '../components/VariantSelector';
import { AnimeTrailer } from '../components/AnimeTrailer';
import { useSenpaiCoreDetail } from '../hooks/useSenpaiCoreDetail';
import { cleanHtmlText } from '../utils/animeMatching';
import { getSeasonLabel, getStatusLabel } from '../utils/detailFormat';
import { usePortraitOrientation } from '../../../hooks/usePortraitOrientation';
import { useResponsive } from '../../../hooks/useResponsive';
import { ResponsiveContainer } from '../../../components/common/ResponsiveContainer';
import { buildImageProxyUrl } from '../../../../services/anime1v';

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

export function AnimeDetailSenpaiCorePage() {
  usePortraitOrientation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isWeb, isMobile } = useResponsive();
  const showWebLayout = isWeb && !isMobile;

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

  const handleListScroll = useCallback(({ nativeEvent }: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const isNearBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 200;
    if (isNearBottom) loadMoreEpisodes();
  }, [loadMoreEpisodes]);

  const handleWatchEpisodes = useCallback(() => {
    if (!detail) return;
    router.push({
      pathname: '/mediaplayer',
      params: {
        url: detail.url,
        episode: String(currentEpisode?.number ?? userProgress ?? 1),
        title: detail.title,
      },
    });
  }, [detail, currentEpisode, userProgress, router]);

  const renderEpisodesSection = () => {
    if (!detail) return null;

    if (!showWebLayout) {
      if (detail.episodes.length === 0) {
        return (
          <View style={styles.notAvailableContainer}>
            <Text style={styles.notAvailableText}>No se encontraron episodios para este anime.</Text>
          </View>
        );
      }

      return (
        <View style={styles.watchButtonContainer}>
          <TouchableOpacity
            style={styles.watchButton}
            onPress={handleWatchEpisodes}
            activeOpacity={0.8}
          >
            <Ionicons name="play-circle" size={22} color="#ffffff" />
            <View style={styles.watchButtonTextWrap}>
              <Text style={styles.watchButtonText}>Ir a ver los episodios</Text>
              <Text style={styles.watchButtonHint}>
                {currentEpisode
                  ? `Episodio ${currentEpisode.number}`
                  : `${detail.episodes.length} episodios disponibles`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      );
    }

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

        {!currentEpisode && <Text style={styles.sectionHeader}>Episodios</Text>}

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
            <EpisodePlayer url={streamUrl} servers={availableServers} isHentaiMoe={isHentaiMoe} />

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
        <View
          style={[
            styles.sectionContainer,
            { marginBottom: 0 },
            !showWebLayout && { paddingTop: insets.top + 8 },
          ]}
        >
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
        <SenpaiCoreHeader detail={detail} compact={!!parsedTrailer} />
            <View style={styles.webSidebarActions}>
              {renderStats()}
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
              {renderSpecs()}
            </View>
          </View>

          <View style={styles.webMainContent}>
            {renderTrailer()}
            {renderSynopsis()}
            {renderRelated()}
            <View style={styles.playerSection}>{renderEpisodesSection()}</View>
          </View>
        </View>
      );
    }

    return (
      <>
        {renderTrailer()}
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
              isWeb ? styles.webScrollContent : {},
            ]) ?? undefined}
            onScroll={handleListScroll}
            scrollEventThrottle={16}
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
  watchButtonContainer: {
    paddingHorizontal: 16,
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#a78bfa',
  },
  watchButtonTextWrap: {
    flex: 1,
  },
  watchButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  watchButtonHint: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
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
    ...StyleSheet.absoluteFill,
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