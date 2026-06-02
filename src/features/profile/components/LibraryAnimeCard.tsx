import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserListItem } from '../../../../services/animeList';
import { useResponsive } from '../../../hooks/useResponsive';

interface LibraryAnimeCardProps {
  item: UserListItem;
  onPress: (id: number) => void;
  onRemove: (id: number, title: string) => void;
  width?: number | string;
}

export function LibraryAnimeCard({ item, onPress, onRemove, width }: LibraryAnimeCardProps) {
  const { isWeb } = useResponsive();
  const title = item.anime.title.romaji || item.anime.title.english;
  
  return (
    <TouchableOpacity
      style={[styles.card, width ? { width } : null, isWeb && styles.webCard]}
      activeOpacity={0.8}
      onPress={() => onPress(item.anime.id)}
    >
      <Image source={{ uri: item.anime.coverImage.large }} style={styles.cardImage} />
      
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {title}
        </Text>
        
        <View style={styles.metaRow}>
          {item.anime.averageScore && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>★ {(item.anime.averageScore / 10).toFixed(1)}</Text>
            </View>
          )}
          <Text style={styles.episodesText}>
            {item.anime.episodes ? `${item.anime.episodes} Eps` : 'En emisión'}
          </Text>
        </View>

        <View style={styles.genreTagsContainer}>
          {item.anime.genres.slice(0, 2).map((g) => (
            <View key={g} style={styles.genreTag}>
              <Text style={styles.genreTagText}>{g}</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemove(item.anime.id, title)}
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
    marginHorizontal: 5,
  },
  cardImage: {
    width: 70,
    height: 105,
    borderRadius: 8,
    backgroundColor: '#334155',
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
