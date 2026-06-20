import React from 'react';
import { StyleSheet, Text, View, ScrollView, Image } from 'react-native';
import { Anime } from '../../../../services/anilist';

interface CharacterListProps {
  characters: Anime['characters'];
}

export function CharacterList({ characters }: CharacterListProps) {
  if (!characters?.edges || characters.edges.length === 0) return null;

  const getRoleInSpanish = (role: string): string => {
    const roleMap: Record<string, string> = {
      'MAIN': 'Principal',
      'SUPPORTING': 'Secundario',
      'BACKGROUND': 'Fondo',
    };
    return roleMap[role] || role;
  };

  return (
    <>
      <View style={styles.divider} />
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeader}>Personajes</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.charactersScroll}
        >
          {characters.edges.map((edge) => {
            const character = edge.node;
            return (
              <View key={character.id} style={styles.characterCard}>
                <Image
                  source={{ uri: character.image.large }}
                  style={styles.characterImage}
                />
                <View style={styles.characterInfo}>
                  <Text style={styles.characterName} numberOfLines={2}>
                    {character.name.userPreferred || character.name.full}
                  </Text>
                  <Text style={styles.characterRole}>
                    {getRoleInSpanish(edge.role)}
                  </Text>
                  {edge.voiceActors && edge.voiceActors.length > 0 && (
                    <Text style={styles.characterActor} numberOfLines={1}>
                      Seiyuu: {edge.voiceActors[0].name.userPreferred || edge.voiceActors[0].name.full}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
    paddingLeft: 12,
  },
  charactersScroll: {
    paddingRight: 16,
    gap: 12,
  },
  characterCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    width: 110,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  characterImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  characterInfo: {
    padding: 8,
    flex: 1,
    justifyContent: 'space-between',
  },
  characterName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  characterRole: {
    color: '#8b5cf6',
    fontSize: 10,
    fontWeight: '600',
  },
  characterActor: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
});
