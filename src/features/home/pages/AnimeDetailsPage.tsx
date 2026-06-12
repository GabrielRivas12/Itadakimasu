import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
  Animated,
  Image,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { extractSourceAttribution } from '../../../../services/kitsu';
import { AnimeHeader } from '../components/AnimeHeader';
import { StatusSelector } from '../components/StatusSelector';
import { QuickStats } from '../components/QuickStats';
import { RelatedAnime } from '../components/RelatedAnime';
import { CharacterList } from '../components/CharacterList';
import { TechnicalSpecs } from '../components/TechnicalSpecs';
import { SkeletonLoader } from '../components/DetailsSkeleton';
import { EpisodePlayer } from '../components/EpisodePlayer'; 
import { EpisodePicker } from '../components/EpisodePicker';
import { ProviderSelector } from '../components/ProviderSelector';
import { useAnimeDetails } from '../hooks/useAnimeDetails';
import { cleanHtmlText } from '../utils/animeMatching';
import { ResponsiveContainer } from '../../../components/common/ResponsiveContainer';
import { useResponsive } from '../../../hooks/useResponsive';
import NotFoundScreen from '../../../app/+not-found';

export function AnimeDetailsPage() {
  const router = useRouter();
  const { isWeb, getContentWidth, width, isMobile, isWebDesktop } = useResponsive();
  
  // Calcular margen dinámico para alinear con el contenido centrado en web
  const contentWidth = typeof getContentWidth() === 'number' ? (getContentWidth() as number) : width;
  
  const {
    anime,
    loading,
    spanishSynopsis,
    synopsisSource,
    loadingSpanishSynopsis,
    userStatus,
    userProgress,
    showStatusSelector,
    setShowStatusSelector,
    showProgressModal,
    setShowProgressModal,
    selectedStatus,
    isUpdatingProgress,
    anime1VInfo,
    currentEpisode,
    streamUrl,
    contentNotAvailable,
    displayedEpisodes,
    hasMoreEpisodes,
    isLoadingMore,
    fadeAnim,
    loadMoreEpisodes,
    handleEpisodeSelect,
    saveProgress,
    handleUpdateStatus,
    handleUpdateProgress,
    handleRemove,
    isUpdatingStatus,
    isAdultContentEnabled,
    handleDownloadEpisode,
    availableServers,
    selectedServerName,
    handleServerChange,
  } = useAnimeDetails();

  if (!loading && anime?.isAdult && !isAdultContentEnabled) {
    return <NotFoundScreen />;
  }

  const handleAnimePress = (targetId: number) => {
    router.push({ pathname: '/animedetails', params: { id: targetId } });
  };

  const handleShare = async () => {
    if (!anime) return;
    try {
      const shareUrl = `https://itadakimasu.online/animedetails?id=${anime.id}`;
      const title = anime.title.romaji || anime.title.english;
      
      await Share.share({
        message: `¡Mira ${title} en Itadakimasu!\n${shareUrl}`,
        url: shareUrl,
        title: title,
      });
    } catch (error) {
      console.error('Error sharing anime:', error);
    }
  };

  const cleanDescriptionObj = anime?.description
    ? extractSourceAttribution(cleanHtmlText(anime.description))
    : { cleanText: 'No hay descripción disponible para este anime.', source: null };

  const displaySynopsis = spanishSynopsis || cleanDescriptionObj.cleanText;
  const displaySource = spanishSynopsis ? synopsisSource : cleanDescriptionObj.source;

  const showWebLayout = isWeb && !isMobile;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: !isWeb,
          title: loading ? 'Cargando...' : (anime?.title.romaji || anime?.title.english || 'Detalles'),
          headerTransparent: true,
          headerTintColor: '#ffffff',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/');
                }
              }} 
              style={styles.headerIconButton}
            >
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
          ),
          headerRight: () => (!loading && anime) ? (
            <TouchableOpacity 
              onPress={handleShare} 
              style={styles.headerIconButton}
            >
              <Ionicons name="share-social" size={22} color="#ffffff" />
            </TouchableOpacity>
          ) : null,
        }}
      />

      {loading ? (
        <ResponsiveContainer>
          <SkeletonLoader />
        </ResponsiveContainer>
      ) : !anime ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#f43f5e" />
          <Text style={styles.errorText}>No se pudo cargar la información</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Regresar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          {isWeb && anime && (
            <View style={[styles.webHeroContainer, isMobile && { height: 300 }]}>
              <Image 
                source={{ uri: anime.bannerImage || anime.coverImage.extraLarge || anime.coverImage.large }} 
                style={styles.webHeroImage}
                resizeMode="cover"
              />
              <View style={styles.webHeroOverlay} />
            </View>
          )}
          
          <ResponsiveContainer contentContainerStyle={StyleSheet.flatten([styles.scrollContent, isWeb && styles.webScrollContent, isMobile && { paddingTop: 0 }])}>
            <View style={StyleSheet.flatten(showWebLayout ? styles.webDetailsContainer : { width: '100%' })}>
              <View style={StyleSheet.flatten(showWebLayout ? styles.webSidebar : { width: '100%' })}>
                <AnimeHeader anime={anime} />
                
                <View style={StyleSheet.flatten(showWebLayout ? styles.webSidebarActions : { width: '100%', marginTop: 20 })}>
                  <StatusSelector
                    userStatus={userStatus}
                    userProgress={userProgress}
                    totalEpisodes={anime.episodes}
                    showStatusSelector={showStatusSelector}
                    setShowStatusSelector={setShowStatusSelector}
                    onUpdateStatus={handleUpdateStatus}
                    onRemove={handleRemove}
                    isUpdating={isUpdatingStatus}
                  />

                  <QuickStats
                    averageScore={anime.averageScore}
                    episodes={anime.episodes}
                    status={anime.status || ''}
                  />

                  {(!isWeb || isMobile) && (
                    <View style={styles.sectionContainer}>
                      <Text style={styles.sectionHeader}>Sinopsis</Text>
                      {loadingSpanishSynopsis ? (
                        <View style={styles.synopsisLoading}>
                          <ActivityIndicator size="small" color="#8b5cf6" />
                          <Text style={styles.synopsisLoadingText}>Cargando sinopsis...</Text>
                        </View>
                      ) : (
                        <>
                          <Text style={styles.synopsisText}>{displaySynopsis}</Text>
                          {displaySource && (
                            <Text style={styles.synopsisSourceText}>{displaySource}</Text>
                          )}
                        </>
                      )}
                    </View>
                  )}

                  <TechnicalSpecs anime={anime} />
                </View>
              </View>

              <View style={StyleSheet.flatten(showWebLayout ? styles.webMainContent : { flex: 1, marginTop: 24 })}>
                {showWebLayout && (
                  <View style={styles.webSectionContainer}>
                    <Text style={styles.sectionHeader}>Sinopsis</Text>
                    {loadingSpanishSynopsis ? (
                      <View style={styles.synopsisLoading}>
                        <ActivityIndicator size="small" color="#8b5cf6" />
                        <Text style={styles.synopsisLoadingText}>Cargando sinopsis...</Text>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.synopsisText}>{displaySynopsis}</Text>
                        {displaySource && (
                          <Text style={styles.synopsisSourceText}>{displaySource}</Text>
                        )}
                      </>
                    )}
                  </View>
                )}

                <View style={StyleSheet.flatten(showWebLayout ? styles.webSectionWrapper : { marginTop: 0 })}>
                  <CharacterList characters={anime.characters} />
                </View>

                {/* Sección de Episodios con Loading State */}
                <View style={StyleSheet.flatten([styles.playerSection, showWebLayout && styles.webSectionWrapper])}>
                  <Text style={styles.sectionHeader}>
                    {currentEpisode ? `Reproduciendo: ${currentEpisode.title}` : 'Episodios'}
                  </Text>

                  {loading ? ( 
                    <View style={styles.episodesLoadingContainer}>
                      <ActivityIndicator size="large" color="#8b5cf6" />
                      <Text style={styles.loadingTextSmall}>Buscando capítulos disponibles...</Text>
                    </View>
                  ) : contentNotAvailable ? (
                    <View style={styles.notAvailableContainer}>
                      <Ionicons name="videocam-off-outline" size={32} color="#64748b" />
                      <Text style={styles.notAvailableText}>Este contenido no está disponible actualmente.</Text>
                    </View>
                  ) : !anime1VInfo ? (
                    <View style={styles.episodesLoadingContainer}>
                      <ActivityIndicator size="large" color="#8b5cf6" />
                      <Text style={styles.loadingTextSmall}>Cargando lista de reproducción...</Text>
                    </View>
                  ) : displayedEpisodes.length > 0 ? (
                    <>
                      <EpisodePlayer url={streamUrl} />
                      {isWeb && (
                        <ProviderSelector
                          availableServers={availableServers}
                          selectedServerName={selectedServerName}
                          onServerChange={handleServerChange}
                        />
                      )}
                      <EpisodePicker
                        episodes={displayedEpisodes}
                        currentEpisodeNumber={currentEpisode?.number || null}
                        onEpisodePress={(episode) => handleEpisodeSelect(episode, true)}
                        onDownloadPress={handleDownloadEpisode} 
                        onLoadMore={loadMoreEpisodes}
                        hasMore={hasMoreEpisodes}
                        isLoadingMore={isLoadingMore}
                      />
                    </>
                  ) : (
                    <View style={styles.notAvailableContainer}>
                      <Text style={styles.notAvailableText}>No se encontraron episodios para este anime.</Text>
                    </View>
                  )}
                </View>

                <View style={StyleSheet.flatten(showWebLayout ? styles.webSectionWrapper : {})}>
                  <RelatedAnime relations={anime.relations} onPress={handleAnimePress} />
                </View>
              </View>
            </View>
          </ResponsiveContainer>
        </Animated.View>
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
  webDetailsContainer: {
    flexDirection: 'row',
    paddingTop: 20,
  },
  webSidebar: {
    width: 300,
    paddingRight: 20,
  },
  webMainContent: {
    flex: 1,
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
  synopsisSourceText: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'right',
  },
  synopsisLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  synopsisLoadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  playerSection: {
    marginBottom: 24,
  },
  streamLoader: {
    marginVertical: 10,
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
  webSectionContainer: {
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    paddingVertical: 0,
    borderRadius: 0,
    borderWidth: 0,
  },
  webSectionWrapper: {
    marginTop: 32,
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
});