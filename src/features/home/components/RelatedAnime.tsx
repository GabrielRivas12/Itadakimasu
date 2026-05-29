import React from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';

interface RelatedNode {
  id: number;
  title: {
    romaji: string;
    english: string | null;
    native: string;
  };
  coverImage: {
    large: string;
    medium: string;
  };
  type: string;
  status?: string;
  averageScore?: number | null;
}

interface RelatedEdge {
  relationType: string;
  node: RelatedNode;
}

interface RelatedAnimeProps {
  relations?: {
    edges: RelatedEdge[];
  };
  onPress: (id: number) => void;
}

const getRelationTypeInSpanish = (type: string): string => {
  const map: Record<string, string> = {
    SEQUEL: 'Secuela',
    PREQUEL: 'Precuela',
    PARENT: 'Historia Principal',
    SIDE_STORY: 'Paralela',
    SPIN_OFF: 'Spin-off',
    ALTERNATIVE: 'Alternativa',
    SUMMARY: 'Resumen',
    COMPILATION: 'Recopilación',
    CHARACTER: 'Relacionado',
    OTHER: 'Otros',
  };
  return map[type] || type;
};

export function RelatedAnime({ relations, onPress }: RelatedAnimeProps) {
  if (!relations || !relations.edges || relations.edges.length === 0) return null;

  // Filtrar solo relaciones que sean de tipo ANIME
  const animeRelations = relations.edges.filter((edge) => edge.node.type === 'ANIME');

  if (animeRelations.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>Relacionados</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {animeRelations.map((edge) => {
          const item = edge.node;
          return (
            <TouchableOpacity
              key={edge.node.id}
              style={styles.card}
              onPress={() => onPress(item.id)}
            >
              <View style={styles.imageContainer}>
                <Image source={{ uri: item.coverImage.large }} style={styles.image} />
                <View style={styles.relationBadge}>
                  <Text style={styles.relationText}>
                    {getRelationTypeInSpanish(edge.relationType)}
                  </Text>
                </View>
                {item.averageScore && (
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>★ {(item.averageScore / 10).toFixed(1)}</Text>
                  </View>
                )}
              </View>
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title.english || item.title.romaji}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  sectionHeader: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
    paddingLeft: 12,
    marginHorizontal: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 8,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    width: 130,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e293b',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  relationBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(139, 92, 246, 0.9)', // Purple brand color with transparency
    paddingVertical: 4,
    alignItems: 'center',
  },
  relationText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  scoreBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scoreText: {
    color: '#f59e0b',
    fontSize: 9,
    fontWeight: 'bold',
  },
  info: {
    padding: 8,
    height: 48,
    justifyContent: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    textAlign: 'center',
  },
});
