import React from 'react';
import { StyleSheet, Text, ScrollView, TouchableOpacity, View } from 'react-native';

const GENRES = [
  'Todos',
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Romance',
  'Sci-Fi',
  'Supernatural',
  'Mystery',
];

const DISPLAY_GENRES: Record<string, string> = {
  Todos: 'Todos',
  Action: 'Acción',
  Adventure: 'Aventura',
  Comedy: 'Comedia',
  Drama: 'Drama',
  Fantasy: 'Fantasía',
  Romance: 'Romance',
  'Sci-Fi': 'Ciencia Ficción',
  Supernatural: 'Sobrenatural',
  Mystery: 'Misterio',
};

interface GenreFiltersProps {
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
}

export function GenreFilters({ selectedGenre, onSelectGenre }: GenreFiltersProps) {
  return (
    <View style={styles.genresContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genresList}
      >
        {GENRES.map((genre) => {
          const isSelected = selectedGenre === genre;
          return (
            <TouchableOpacity
              key={genre}
              onPress={() => onSelectGenre(genre)}
              style={[
                styles.genreBadge,
                isSelected && styles.genreBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.genreText,
                  isSelected && styles.genreTextActive,
                ]}
              >
                {DISPLAY_GENRES[genre] || genre}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  genresContainer: {
    marginBottom: 8,
  },
  genresList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  genreBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  genreBadgeActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  genreText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  genreTextActive: {
    color: '#ffffff',
  },
});
