import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AdvancedFiltersProps {
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
  selectedType: string;
  onSelectType: (type: string) => void;
  selectedHentaiTag: string;
  onSelectHentaiTag: (tag: string) => void;
}

// Tipos de contenido -> slug usado por el endpoint /catalog (filtro server-side).
const TYPE_MAP: Record<string, string> = {
  'Todos': 'Todos',
  'tv-anime': 'TV Anime',
  'pelicula': 'Película',
  'ova': 'OVA',
  'especial': 'Especial',
  'ona': 'ONA',
};

const TYPE_LIST = Object.keys(TYPE_MAP);

// Labels en español -> slug usado por el endpoint /catalog (filtro server-side).
const GENRE_MAP: Record<string, string> = {
  'Todos': 'Todos',
  'accion': 'Acción',
  'aventura': 'Aventura',
  'comedia': 'Comedia',
  'drama': 'Drama',
  'ecchi': 'Ecchi',
  'fantasia': 'Fantasía',
  'horror': 'Terror',
  'mahou-shoujo': 'Mahou Shoujo',
  'mecha': 'Mecha',
  'musica': 'Música',
  'misterio': 'Misterio',
  'psicologico': 'Psicológico',
  'romance': 'Romance',
  'recuentos-de-la-vida': 'Recuentos de la Vida',
  'ciencia-ficcion': 'Ciencia Ficción',
  'sobrenatural': 'Sobrenatural',
  'suspenso': 'Suspense',
  'thriller': 'Thriller',
  'deportes': 'Deportes',
  'hentai': 'Hentai'
};

const GENRES = Object.keys(GENRE_MAP);

// Tags/categorías del género hentai -> slug usado por el endpoint /catalog.
const HENTAI_TAGS: Record<string, string> = {
  'Todos': 'Todos',
  'harem': 'Harem',
  'escolares': 'Escolares',
  'tetonas': 'Tetonas',
  'vanilla': 'Vanilla',
  'virgenes': 'Vírgenes',
  'futanari': 'Futanari',
  'tentaculos': 'Tentáculos',
  'netorare': 'Netorare',
  'yuri': 'Yuri',
  'ahegao': 'Ahegao',
  'milf': 'Milf',
};

const HENTAI_TAG_LIST = Object.keys(HENTAI_TAGS);

export function GenreFilters({
  selectedGenre,
  onSelectGenre,
  selectedType,
  onSelectType,
  selectedHentaiTag,
  onSelectHentaiTag,
}: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const isHentaiGenre = selectedGenre === 'hentai';
  const hasActiveFilters =
    selectedGenre !== 'Todos' ||
    selectedType !== 'Todos' ||
    (isHentaiGenre && selectedHentaiTag !== 'Todos');

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.expandButton} 
        onPress={toggleFilters}
        activeOpacity={0.7}
      >
        <View style={styles.expandButtonLeft}>
          <Ionicons 
            name="options-outline" 
            size={18} 
            color={hasActiveFilters ? "#8b5cf6" : "#94a3b8"} 
          />
          <Text style={[styles.expandButtonText, hasActiveFilters && styles.expandButtonTextActive]}>
            Filtros Avanzados
          </Text>
          {hasActiveFilters && !isExpanded && (
            <View style={styles.activeDot} />
          )}
        </View>
        <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={18} 
          color="#94a3b8" 
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.containerInner}>
          <View style={styles.content}>
            {/* Géneros */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionLabel}>Géneros</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {GENRES.map((genre) => (
                  <TouchableOpacity
                    key={genre}
                    style={[styles.chip, selectedGenre === genre && styles.chipActive]}
                    onPress={() => onSelectGenre(genre)}
                  >
                    <Text style={[styles.chipText, selectedGenre === genre && styles.chipTextActive]}>
                      {GENRE_MAP[genre]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Tipos */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionLabel}>Tipo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {TYPE_LIST.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.chip, selectedType === type && styles.chipActive]}
                    onPress={() => onSelectType(type)}
                  >
                    <Text style={[styles.chipText, selectedType === type && styles.chipTextActive]}>
                      {TYPE_MAP[type]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {selectedGenre === 'hentai' && (
              <View style={styles.filterSection}>
                <Text style={styles.sectionLabel}>Categorías Hentai</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                  {HENTAI_TAG_LIST.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.chip, selectedHentaiTag === tag && styles.chipActive]}
                      onPress={() => onSelectHentaiTag(tag)}
                    >
                      <Text style={[styles.chipText, selectedHentaiTag === tag && styles.chipTextActive]}>
                        {HENTAI_TAGS[tag]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 4,
  },
expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  expandButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  expandButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  expandButtonTextActive: {
    color: '#8b5cf6',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8b5cf6',
  },
  containerInner: {
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingBottom: 4,
    marginBottom: 12,
  },
  content: {
    paddingTop: 12,
  },
  filterSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#a78bfa',
  },
  chipText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});