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
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { extractSourceAttribution } from '../../../../services/kitsu';
import { AnimeHeader } from '../components/AnimeHeader';
import { StatusSelector } from '../components/StatusSelector';
import { QuickStats } from '../components/QuickStats';
import { RelatedAnime } from '../components/RelatedAnime';
import { ProgressModal } from '../components/ProgressModal';
import { CharacterList } from '../components/CharacterList';
import { TechnicalSpecs } from '../components/TechnicalSpecs';
import { SkeletonLoader } from '../components/DetailsSkeleton';
import { EpisodePlayer } from '../components/EpisodePlayer';
import { EpisodePicker } from '../components/EpisodePicker';
import { useAnimeDetails } from '../hooks/useAnimeDetails';
import { cleanHtmlText } from '../utils/animeMatching';
import { ResponsiveContainer } from '../../../components/common/ResponsiveContainer';
import { useResponsive } from '../../../hooks/useResponsive';

export function AnimeDetailsPage() {
  const router = useRouter();
  const { isWeb, getContentWidth } = useResponsive();
  
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
  } = useAnimeDetails();

  const handleAnimePress = (targetId: number) => {
    router.push(`/anime/${targetId}`);
  };

  const handleShare = async () => {
    if (!anime) return;
    try {
      await Share.share({
        message: `¡Mira este anime en AnimeLT! ${anime.title.romaji || anime.title.english}\nhttps://anilist.co/anime/${anime.id}`,
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

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: loading ? 'Cargando...' : (anime?.title.romaji || anime?.title.english || 'Detalles'),
          headerTransparent: true,
          headerTintColor: '#ffffff',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerIconButton}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
          ),
          headerRight: () => (!loading && anime) ? (
            <TouchableOpacity onPress={handleShare} style={styles.headerIconButton}>
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
          <ResponsiveContainer contentContainerStyle={styles.scrollContent}>
            <View style={isWeb && styles.webDetailsContainer}>
              <View style={isWeb && styles.webSidebar}>
                <AnimeHeader anime={anime} />
                
                <StatusSelector
                  userStatus={userStatus}
                  userProgress={userProgress}
                  totalEpisodes={anime.episodes}
                  showStatusSelector={showStatusSelector}
                  setShowStatusSelector={setShowStatusSelector}
                  onUpdateStatus={handleUpdateStatus}
                  onUpdateProgress={handleUpdateProgress}
                  onRemove={handleRemove}
                />

                <QuickStats
                  averageScore={anime.averageScore}
                  episodes={anime.episodes}
                  status={anime.status || 'UNKNOWN'}
                />

                <TechnicalSpecs anime={anime} />
              </View>

              <View style={isWeb && styles.webMainContent}>
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

                <CharacterList characters={anime.characters} />

                {contentNotAvailable ? (
                  <View style={styles.notAvailableContainer}>
                    <Ionicons name="videocam-off-outline" size={32} color="#64748b" />
                    <Text style={styles.notAvailableText}>Este contenido no está disponible actualmente.</Text>
                  </View>
                ) : anime1VInfo && displayedEpisodes.length > 0 ? (
                  <View style={styles.playerSection}>
                    <Text style={styles.sectionHeader}>
                      {currentEpisode ? `Reproduciendo: ${currentEpisode.title}` : 'Reproductor'}
                    </Text>
                    <EpisodePlayer url={streamUrl} />
                    <EpisodePicker
                      episodes={displayedEpisodes}
                      currentEpisodeNumber={currentEpisode?.number || null}
                      onEpisodePress={handleEpisodeSelect}
                      onLoadMore={loadMoreEpisodes}
                      hasMore={hasMoreEpisodes}
                      isLoadingMore={isLoadingMore}
                    />
                  </View>
                ) : null}

                <RelatedAnime relations={anime.relations} onPress={handleAnimePress} />
              </View>
            </View>
          </ResponsiveContainer>
        </Animated.View>
      )}

      {anime && (
        <ProgressModal
          visible={showProgressModal}
          animeTitle={anime.title.english || anime.title.romaji || ''}
          initialProgress={userProgress}
          totalEpisodes={anime.episodes || null}
          selectedStatus={selectedStatus}
          isUpdatingProgress={isUpdatingProgress}
          onClose={() => {
            setShowProgressModal(false);
          }}
          onConfirm={(progress) => {
            saveProgress(progress, isUpdatingProgress);
          }}
        />
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
});
