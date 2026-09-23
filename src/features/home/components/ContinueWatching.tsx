import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserListItem } from '../../../../services/animeList';
import { useResponsive } from '../../../hooks/useResponsive';

interface ContinueWatchingProps {
  items: UserListItem[];
  onPress: (item: UserListItem) => void;
}

export function ContinueWatching({ items, onPress }: ContinueWatchingProps) {
  const { isWeb, getContentWidth } = useResponsive();

  if (items.length === 0) return null;

  return (
    <View style={[
      styles.container,
      isWeb && { maxWidth: getContentWidth(), width: '100%', alignSelf: 'center' }
    ]}>
      <Text style={styles.sectionHeader}>Continuar Viendo</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={Platform.OS === 'web'}
        contentContainerStyle={[
          styles.scrollContent,
          isWeb && { paddingBottom: 10 }
        ]}
      >
        {items.map((item) => {
          const anime = item.anime;
          const slug = item.slug || anime?.slug || '';
          const coverImage = anime?.coverImage?.large;
          const progress = anime?.episodes && anime.episodes > 0 ? item.progress / anime.episodes : 0;
          const title = anime?.title?.romaji || anime?.title?.english || `Anime #${item.animeId}`;

          return (
            <TouchableOpacity
              key={item.animeId}
              style={styles.card}
              onPress={() => onPress(item)}
              activeOpacity={0.8}
            >
              <View style={styles.imageContainer}>
                {coverImage ? (
                  <Image
                    source={{ uri: coverImage }}
                    style={styles.image}
                  />
                ) : (
                  <View style={[styles.image, styles.placeholderImage]}>
                    <Ionicons name="image-outline" size={28} color="#475569" />
                  </View>
                )}
                <View style={styles.overlay}>
                  <Text style={styles.episodeText}>Episodio {item.progress}</Text>
                </View>
                {/* Barra de progreso */}
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${Math.min(progress * 100, 100)}%` }]} />
                </View>
              </View>

              <Text style={styles.title} numberOfLines={1}>{title}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  sectionHeader: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
    marginLeft: 16,
  },
  scrollContent: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  card: {
    width: 120,
    marginRight: 16,
  },
  imageContainer: {
    width: 120,
    height: 170,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#334155',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  episodeText: {
    position: 'absolute',
    bottom: 10,
    left: 8,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#8b5cf6',
  },
  title: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
});
