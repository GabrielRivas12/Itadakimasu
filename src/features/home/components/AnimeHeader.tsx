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

  if (isWeb) {
    return (
      <View style={styles.webHeaderInfo}>
        <Image 
          source={{ uri: anime.coverImage.extraLarge || anime.coverImage.large }} 
          style={styles.webCoverImage} 
        />
        <View style={styles.webTitleContainer}>
          <Text style={styles.webAnimeTitle}>{displayTitle}</Text>
          {studioName && (
            <Text style={styles.webStudioText}>{studioName}</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.bannerContainer}>
        <Image
          source={{ uri: anime.bannerImage || anime.coverImage.extraLarge || anime.coverImage.large }}
          style={styles.bannerImage}
          resizeMode="cover"
        />
        <View style={styles.bannerOverlay} />
      </View>

      <View style={styles.detailsHeader}>
        <Image source={{ uri: anime.coverImage.extraLarge || anime.coverImage.large }} style={styles.coverImage} />
        
        <View style={styles.titleContainer}>
          <Text style={styles.animeTitle} numberOfLines={3}>
            {displayTitle}
          </Text>
          
          {studioName && (
            <Text style={styles.studioText}>
              {studioName}
            </Text>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // Mobile styles
  bannerContainer: {
    height: 240,
    position: 'relative',
    width: '100%',
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
  coverImage: {
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
  },
  titleContainer: {
    flex: 1,
    marginLeft: 16,
    paddingBottom: 4,
  },
  animeTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  studioText: {
    color: '#8b5cf6',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  // Web styles
  webHeaderInfo: {
    marginBottom: 24,
    alignItems: 'center',
  },
  webCoverImage: {
    width: 220,
    height: 320,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  webTitleContainer: {
    alignItems: 'center',
    width: '100%',
  },
  webAnimeTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  webStudioText: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: '600',
  },
});
