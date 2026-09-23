import React, { memo } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity } from 'react-native';
import { Anime1VRelation, buildImageProxyUrl } from '../../../../services/anime1v';

interface RelatedAnimeRowProps {
  relations: Anime1VRelation[];
  onPress: (item: Anime1VRelation) => void;
}

function getRelationYear(item: Anime1VRelation): string | null {
  if (item.year) return item.year;
  if (item.startDate && item.startDate.length >= 4) return item.startDate.slice(0, 4);
  return null;
}

export const RelatedAnimeRow = memo(function RelatedAnimeRow({
  relations,
  onPress,
}: RelatedAnimeRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {relations.map((item) => {
        const uri = item.image ? buildImageProxyUrl(item.image) : null;
        const year = getRelationYear(item);
        return (
          <TouchableOpacity
            key={String(item.id)}
            style={styles.card}
            onPress={() => onPress(item)}
            activeOpacity={0.8}
          >
            {uri ? (
              <Image source={{ uri }} style={styles.cover} fadeDuration={300} />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]} />
            )}
            {!!item.typeLabel && (
              <View style={styles.badge}>
                <Text style={styles.badgeText} numberOfLines={1}>
                  {item.typeLabel}
                </Text>
              </View>
            )}
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            {!!year && (
              <Text style={styles.year} numberOfLines={1}>
                {year}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  row: {
    gap: 12,
    paddingHorizontal: 16,
    paddingRight: 16,
  },
  card: {
    width: 120,
  },
  cover: {
    width: 120,
    height: 170,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
  },
  coverPlaceholder: {
    backgroundColor: '#111827',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#a78bfa',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  title: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    lineHeight: 17,
  },
  year: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
});