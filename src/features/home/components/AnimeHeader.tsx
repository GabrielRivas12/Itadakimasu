import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { Anime } from '../../../../services/anilist';
import { useResponsive } from '../../../hooks/useResponsive';

interface AnimeHeaderProps {
  anime: Anime;
}

export function AnimeHeader({ anime }: AnimeHeaderProps) {
  const { isWeb } = useResponsive();
  const displayTitle = anime.title.romaji || anime.title.english || anime.title.native || 'Detalles';
  const studioName = anime.studios?.nodes && anime.studios.nodes.length > 0
    ? anime.studios.nodes[0].name
    : null;

  // Pre-calcular las URIs para evitar cambios durante el render
  const bannerUri = anime.bannerImage || anime.coverImage.extraLarge || anime.coverImage.large;
  const coverUri = anime.coverImage.extraLarge || anime.coverImage.large;

  if (isWeb) {
    return (
      <View style={styles.webHeaderInfo}>
        <View style={styles.webCoverContainer}>
          <Image
            source={{ uri: coverUri }}
            style={styles.webCoverImage}
            fadeDuration={300}
          />
        </View>
        <View style={styles.webTitleContainer}>
          <Text style={styles.webAnimeTitle}>{displayTitle}</Text>
          <View style={styles.studioPlaceholder}>
            {studioName ? (
              <Text style={styles.webStudioText}>{studioName}</Text>
            ) : (
              <View style={styles.emptyStudio} />
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.bannerContainer}>
        <Image
          source={{ uri: bannerUri }}
          style={styles.bannerImage}
          resizeMode="cover"
          fadeDuration={300}
        />
        <View style={styles.bannerOverlay} />
      </View>

      <View style={styles.detailsHeader}>
        <View style={styles.coverImageContainer}>
          <Image
            source={{ uri: coverUri }}
            style={styles.coverImage}
            fadeDuration={300}
          />
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.animeTitle} numberOfLines={3}>
            {displayTitle}
          </Text>

          <View style={styles.studioPlaceholder}>
            {studioName ? (
              <Text style={styles.studioText}>
                {studioName}
              </Text>
            ) : (
              <View style={styles.emptyStudio} />
            )}
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // Mobile styles
  bannerContainer: {
    height: 240,
    marginHorizontal: -16,
    width: 'auto',
    backgroundColor: '#1e293b', // Fondo sólido mientras carga
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 15, 25, 0.65)',
  },
  detailsHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -80,
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  coverImageContainer: {
    width: 110,
    height: 165,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1e293b',
    backgroundColor: '#1e293b',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    flex: 1,
    marginLeft: 16,
    paddingBottom: 4,
    minHeight: 80,
    justifyContent: 'flex-end',
  },
  animeTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  studioPlaceholder: {
    minHeight: 20,
    marginTop: 6,
    justifyContent: 'center',
  },
  studioText: {
    color: '#8b5cf6',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyStudio: {
    height: 13,
  },
  // Web styles
  webHeaderInfo: {
    marginBottom: 24,
    alignItems: 'center',
    width: '100%',
  },
  webCoverContainer: {
    width: 220,
    height: 320,
    backgroundColor: '#111827',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  webCoverImage: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  webTitleContainer: {
    alignItems: 'center',
    width: '100%',
    minHeight: 60,
  },
  webAnimeTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  webStudioText: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: '600',
  },
});
