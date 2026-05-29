import React from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity } from 'react-native';
import { Anime } from '../../../../services/anilist';

interface ContinueAnime extends Anime {
  mockProgress: number;
  mockEpisode: string;
}

interface ContinueWatchingProps {
  popular: ContinueAnime[];
  onPress: (id: number) => void;
}

export function ContinueWatching({ popular, onPress }: ContinueWatchingProps) {
  if (popular.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalScroll}
    >
      {popular.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.continueCard}
          onPress={() => onPress(item.id)}
        >
          <Image source={{ uri: item.coverImage.large }} style={styles.continueImage} />
          <View style={styles.continueContent}>
            <Text style={styles.animeTitle} numberOfLines={1}>
              {item.title.english || item.title.romaji}
            </Text>
            <Text style={styles.animeEpisode}>{item.mockEpisode}</Text>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${item.mockProgress * 100}%` }]} />
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  horizontalScroll: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  continueCard: {
    width: 200,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  continueImage: {
    width: '100%',
    height: 110,
  },
  continueContent: {
    padding: 10,
  },
  animeTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  animeEpisode: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 2,
  },
});
