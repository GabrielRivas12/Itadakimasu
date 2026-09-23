import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, DimensionValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserListItem } from '../../../../services/animeList';
import { useResponsive } from '../../../hooks/useResponsive';

interface LibraryAnimeCardProps {
  item: UserListItem;
  onPress: (item: UserListItem) => void;
  onRemove: (id: number, title: string) => void;
  width?: DimensionValue;
}

export function LibraryAnimeCard({ item, onPress, onRemove, width }: LibraryAnimeCardProps) {
  const { isWeb } = useResponsive();

  if (!item) return null;

  const anime = item.anime;
  const animeId = anime?.id ?? item.animeId;
  const coverImage = anime?.coverImage?.large;
  const title = anime
    ? anime.title.romaji || anime.title.english || 'Anime Desconocido'
    : `Anime #${item.animeId}`;

  return (
    <TouchableOpacity
      style={[styles.card, width ? { width } : null, isWeb && styles.webCard]}
      activeOpacity={0.8}
      onPress={() => onPress(item)}
    >
      {anime && coverImage ? (
        <Image source={{ uri: coverImage }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.placeholderImage]}>
          <Ionicons name="image-outline" size={24} color="#475569" />
        </View>
      )}

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {title}
        </Text>

        {anime && (
          <>
            <View style={styles.metaRow}>
              {anime.averageScore && (
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>★ {(anime.averageScore / 10).toFixed(1)}</Text>
                </View>
              )}
              {anime.episodes ? (
                <View style={styles.episodesRow}>
                  <Ionicons name="tv-outline" size={14} color="#94a3b8" />
                  <Text style={styles.episodesText}>{anime.episodes}</Text>
                </View>
              ) : (
                <Text style={styles.episodesText}>En emisión</Text>
              )}
            </View>

            <View style={styles.genreTagsContainer}>
              {anime.genres.slice(0, 2).map((g) => (
                <View key={g} style={styles.genreTag}>
                  <Text style={styles.genreTagText}>{g}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemove(animeId, title)}
      >
        <Ionicons name="trash-outline" size={18} color="#f43f5e" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    alignItems: 'center',
  },
  webCard: {
    marginHorizontal: 0,
  },
  cardImage: {
    width: 70,
    height: 105,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  ratingText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: 'bold',
  },
  episodesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  episodesText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  genreTagsContainer: {
    flexDirection: 'row',
  },
  genreTag: {
    backgroundColor: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  genreTagText: {
    color: '#cbd5e1',
    fontSize: 10,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1c1917',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#ef444422',
  },
});
