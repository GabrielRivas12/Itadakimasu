import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { Anime } from '../../../../services/anilist';

interface FeaturedBannerProps {
  featured: Anime;
  onPress: (id: number) => void;
}

export function FeaturedBanner({ featured, onPress }: FeaturedBannerProps) {
  return (
    <View style={styles.bannerContainer}>
      <Image
        source={{
          uri: featured.bannerImage || featured.coverImage.large,
        }}
        style={styles.bannerImage}
        resizeMode="cover"
      />
      <View style={styles.bannerOverlay}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>TENDENCIA HOY</Text>
        </View>
        <Text style={styles.bannerTitle} numberOfLines={1}>
          {featured.title.romaji || featured.title.english}
        </Text>
        <Text style={styles.bannerSubtitle} numberOfLines={2}>
          {featured.description
            ? featured.description.replace(/<[^>]*>/g, '')
            : 'Una producción imperdible disponible ahora en AnimeLT.'}
        </Text>
        <TouchableOpacity
          style={styles.bannerButton}
          onPress={() => onPress(featured.id)}
        >
          <Text style={styles.bannerButtonText}>Ver Ahora</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    margin: 16,
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    position: 'relative',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    padding: 16,
    justifyContent: 'flex-end',
  },
  tag: {
    backgroundColor: '#8b5cf6',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  tagText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bannerSubtitle: {
    color: '#cbd5e1',
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  bannerButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    color: '#0f172a',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
