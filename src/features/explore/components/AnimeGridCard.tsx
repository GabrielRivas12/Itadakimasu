import React, { memo } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, DimensionValue } from 'react-native';
import { Anime } from '../../../../services/anilist';

interface AnimeGridCardProps {
  item: Anime;
  onPress: (id: number) => void;
  width?: DimensionValue; 
}

export const AnimeGridCard = memo(function AnimeGridCard({ item, onPress, width }: AnimeGridCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, width ? { width } : null]}
      onPress={() => onPress(item.id)}
    >
      <Image 
        source={{ uri: item.coverImage.large }} 
        style={styles.cardImage}
      />
      <View style={styles.cardBadge}>
        <Text style={styles.cardBadgeText}>{item.type}</Text>
      </View>
      {item.averageScore && (
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>★ {(item.averageScore / 10).toFixed(1)}</Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title.romaji || item.title.english}
        </Text>
        <View style={styles.genreTagsContainer}>
          {item.genres.slice(0, 2).map((g) => (
            <View key={g} style={styles.genreTag}>
              <Text style={styles.genreTagText}>{g}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginHorizontal: '1%',
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  cardBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardBadgeText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardContent: {
    padding: 10,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  genreTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  genreTag: {
    backgroundColor: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 2,
  },
  genreTagText: {
    color: '#cbd5e1',
    fontSize: 10,
  },
});
