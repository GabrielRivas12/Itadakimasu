import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Anime } from '../../../../services/anilist';

interface TechnicalSpecsProps {
  anime: Anime;
}

const getStatusInSpanish = (status: string): string => {
  const statusMap: Record<string, string> = {
    'FINISHED': 'Finalizado',
    'RELEASING': 'En emisión',
    'NOT_YET_RELEASED': 'Próximamente',
    'CANCELLED': 'Cancelado',
    'HIATUS': 'En pausa',
  };
  return statusMap[status] || status;
};

const formatDate = (date: { year?: number; month?: number; day?: number } | undefined): string => {
  if (!date || !date.year) return 'Desconocida';
  
  const day = date.day || 1;
  const month = date.month || 1;
  const year = date.year;
  
  return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
};

export function TechnicalSpecs({ anime }: TechnicalSpecsProps) {
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
            <Text style={styles.specLabel}>Episodios</Text>
            <Text style={styles.specValue}>{anime.episodes || '??'}</Text>
          </View>
          
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Estado</Text>
            <Text style={styles.specValue}>{getStatusInSpanish(anime.status || 'UNKNOWN')}</Text>
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

          {anime.format && (
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Formato</Text>
              <Text style={styles.specValue}>{anime.format}</Text>
            </View>
          )}
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
