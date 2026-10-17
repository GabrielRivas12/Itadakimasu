import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DropdownPicker, DropdownOption } from './DropdownPicker';
import { useResponsive } from '../../../hooks/useResponsive';

interface AdvancedFiltersProps {
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
  selectedType: string;
  onSelectType: (type: string) => void;
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  selectedYear: string;
  onSelectYear: (year: string) => void;
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

// Estados de emisión -> slug usado por el endpoint /catalog (filtro server-side).
const STATUS_MAP: Record<string, string> = {
  'Todos': 'Todos',
  'en-emision': 'En emisión',
  'finalizado': 'Finalizado',
  'proximamente': 'Próximamente',
};

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

const toOptions = (map: Record<string, string>): DropdownOption[] =>
  Object.entries(map).map(([value, label]) => ({ value, label }));

// Años de emisión (del año actual hacia atrás).
const buildYearOptions = (): DropdownOption[] => {
  const currentYear = new Date().getFullYear();
  const options: DropdownOption[] = [{ value: 'Todos', label: 'Todos' }];
  for (let year = currentYear; year >= 1990; year--) {
    options.push({ value: String(year), label: String(year) });
  }
  return options;
};

const TYPE_OPTIONS = toOptions(TYPE_MAP);
const GENRE_OPTIONS = toOptions(GENRE_MAP);
const STATUS_OPTIONS = toOptions(STATUS_MAP);
const YEAR_OPTIONS = buildYearOptions();
const HENTAI_OPTIONS = toOptions(HENTAI_TAGS);

export function GenreFilters({
  selectedGenre,
  onSelectGenre,
  selectedType,
  onSelectType,
  selectedStatus,
  onSelectStatus,
  selectedYear,
  onSelectYear,
  selectedHentaiTag,
  onSelectHentaiTag,
}: AdvancedFiltersProps) {
  const { isMobile } = useResponsive();
  const isHentaiGenre = selectedGenre === 'hentai';

  return (
    <View style={styles.row}>
      <DropdownPicker
        label="Tipo"
        value={selectedType}
        options={TYPE_OPTIONS}
        onChange={onSelectType}
        fill={isMobile}
      />
      <DropdownPicker
        label="Género"
        value={selectedGenre}
        options={GENRE_OPTIONS}
        onChange={onSelectGenre}
        menuWidth={240}
        fill={isMobile}
      />
      {isHentaiGenre ? (
        // hentaila solo soporta page y genre: no hay estado/año.
        <DropdownPicker
          label="Categoría"
          value={selectedHentaiTag}
          options={HENTAI_OPTIONS}
          onChange={onSelectHentaiTag}
          fill={isMobile}
        />
      ) : (
        <>
          <DropdownPicker
            label="Estado"
            value={selectedStatus}
            options={STATUS_OPTIONS}
            onChange={onSelectStatus}
            menuWidth={200}
            fill={isMobile}
          />
          <DropdownPicker
            label="Año"
            value={selectedYear}
            options={YEAR_OPTIONS}
            onChange={onSelectYear}
            menuWidth={160}
            fill={isMobile}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: '1%',
    paddingBottom: 10,
  },
});
