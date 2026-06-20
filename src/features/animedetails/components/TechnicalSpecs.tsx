import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Anime } from '../../../../services/anilist';

interface TechnicalSpecsProps {
  anime: Anime;
}

const getSeasonInSpanish = (season: string | undefined): string => {
  if (!season) return '';
  const seasonMap: Record<string, string> = {
    'WINTER': 'Invierno',
    'SPRING': 'Primavera',
    'SUMMER': 'Verano',
    'FALL': 'Otoño',
  };
  return seasonMap[season] || season;
};

const getSourceInSpanish = (source: string | undefined): string => {
  if (!source) return 'Desconocido';
  const sourceMap: Record<string, string> = {
    'ORIGINAL': 'Original',
    'MANGA': 'Manga',
    'LIGHT_NOVEL': 'Novela Ligera',
    'VISUAL_NOVEL': 'Novela Visual',
    'VIDEO_GAME': 'Videojuego',
    'OTHER': 'Otro',
    'NOVEL': 'Novela',
    'DOUJINSHI': 'Doujinshi',
    'ANIME': 'Anime',
  };
  return sourceMap[source] || source;
};

const formatDate = (date: { year: number | null; month: number | null; day: number | null } | undefined): string => {
  if (!date || !date.year) return 'Desconocida';

  const day = date.day || 1;
  const month = date.month || 1;
  const year = date.year;

  return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
};

export function TechnicalSpecs({ anime }: TechnicalSpecsProps) {
  const seasonText = anime.season ? `${getSeasonInSpanish(anime.season)} ${anime.seasonYear || ''}` : 'N/A';

  return (
    <>
      <View style={styles.divider} />
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeader}>Ficha Técnica</Text>

        <View style={styles.specCard}>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Tipo</Text>
            <Text style={styles.specValue}>{anime.type || 'N/A'}</Text>
          </View>

          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Temporada</Text>
            <Text style={styles.specValue}>{seasonText}</Text>
          </View>

          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Duración</Text>
            <Text style={styles.specValue}>{anime.duration ? `${anime.duration} min por ep.` : 'N/A'}</Text>
          </View>

          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Origen</Text>
            <Text style={styles.specValue}>{getSourceInSpanish(anime.source)}</Text>
          </View>

          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Fecha de estreno</Text>
            <Text style={styles.specValue}>{formatDate(anime.startDate)}</Text>
          </View>

          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Géneros</Text>
            <Text style={styles.specValue} numberOfLines={2}>
              {anime.genres?.length ? anime.genres.join(', ') : 'No especificados'}
            </Text>
          </View>
        </View>
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
  specCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  specLabel: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '600',
  },
  specValue: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
});
