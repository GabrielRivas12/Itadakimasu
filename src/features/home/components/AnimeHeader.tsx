import React from 'react';
import { StyleSheet, Text, View, Image, Platform } from 'react-native';
import { Anime } from '../../../../services/anilist';

interface AnimeHeaderProps {
  anime: Anime;
}

export function AnimeHeader({ anime }: AnimeHeaderProps) {
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
            {anime.title.english || anime.title.romaji}
          </Text>
          {anime.title.romaji && anime.title.english && (
            <Text style={styles.animeJapaneseTitle} numberOfLines={1}>
              {anime.title.romaji}
            </Text>
          )}
          
          {anime.studios && anime.studios.nodes.length > 0 && (
            <Text style={styles.studioText}>
              {anime.studios.nodes[0].name}
            </Text>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
  animeJapaneseTitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
  },
  studioText: {
    color: '#8b5cf6',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
});
