import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimeSeason } from '../../../../services/anilist';
import { YearPickerModal } from './YearPickerModal';

interface AdvancedFiltersProps {
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
  selectedSeason: AnimeSeason | 'Todas';
  onSelectSeason: (season: AnimeSeason | 'Todas') => void;
  selectedYear: number | 'Todos';
  onSelectYear: (year: number | 'Todos') => void;
}

const GENRE_MAP: Record<string, string> = {
  'Todos': 'Todos',
  'Action': 'Acción',
  'Adventure': 'Aventura',
  'Comedy': 'Comedia',
  'Drama': 'Drama',
  'Ecchi': 'Ecchi',
  'Fantasy': 'Fantasía',
  'Horror': 'Terror',
  'Mahou Shoujo': 'Chica Mágica',
  'Mecha': 'Mecha',
  'Music': 'Música',
  'Mystery': 'Misterio',
  'Psychological': 'Psicológico',
  'Romance': 'Romance',
  'Sci-Fi': 'Ciencia Ficción',
  'Slice of Life': 'Recuentos de la Vida',
  'Sports': 'Deportes',
  'Supernatural': 'Sobrenatural',
  'Thriller': 'Suspense',
  'Hentai': 'Hentai'
};

const GENRES = Object.keys(GENRE_MAP);

const SEASONS: { label: string; value: AnimeSeason | 'Todas' }[] = [
  { label: 'Todas', value: 'Todas' },
  { label: 'Invierno', value: 'WINTER' },
  { label: 'Primavera', value: 'SPRING' },
  { label: 'Verano', value: 'SUMMER' },
  { label: 'Otoño', value: 'FALL' },
];

export function GenreFilters({
  selectedGenre,
  onSelectGenre,
  selectedSeason,
  onSelectSeason,
  selectedYear,
  onSelectYear
}: AdvancedFiltersProps) {
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const hasActiveFilters = selectedGenre !== 'Todos' || selectedSeason !== 'Todas' || selectedYear !== 'Todos';

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

            {/* Temporadas y Año Selector */}
            <View style={styles.row}>
              <View style={[styles.filterSection, { flex: 2 }]}>
                <Text style={styles.sectionLabel}>Temporada</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                  {SEASONS.map((s) => (
                    <TouchableOpacity
                      key={s.value}
                      style={[styles.chip, selectedSeason === s.value && styles.chipActive]}
                      onPress={() => onSelectSeason(s.value)}
                    >
                      <Text style={[styles.chipText, selectedSeason === s.value && styles.chipTextActive]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={[styles.filterSection, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.sectionLabel}>Año</Text>
                <View style={{ paddingHorizontal: 16 }}>
                  <TouchableOpacity 
                    style={[styles.yearPickerButton, selectedYear !== 'Todos' && styles.chipActive]}
                    onPress={() => setShowYearPicker(true)}
                  >
                    <Text style={[styles.chipText, selectedYear !== 'Todos' && styles.chipTextActive]}>
                      {selectedYear}
                    </Text>
                    <Ionicons 
                      name="calendar-outline" 
                      size={14} 
                      color={selectedYear !== 'Todos' ? '#ffffff' : '#94a3b8'} 
                      style={{ marginLeft: 6 }}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      <YearPickerModal
        visible={showYearPicker}
        initialYear={selectedYear}
        onClose={() => setShowYearPicker(false)}
        onConfirm={(year) => {
          onSelectYear(year);
          setShowYearPicker(false);
        }}
      />
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
    marginHorizontal: 16,
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
    marginHorizontal: 16,
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
  row: {
    flexDirection: 'row',
    paddingRight: 16,
    alignItems: 'flex-start',
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
  yearPickerButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 85,
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

