import { Anime1VSeason } from '../../../../services/anime1v';

/** Normaliza el estado de emisión a una etiqueta en español. */
export const getStatusLabel = (status?: string | null): string => {
  if (!status) return 'Desconocido';

  const statusMap: Record<string, string> = {
    'En emisión': 'En emisión',
    'Currently Airing': 'En emisión',
    'Airing': 'En emisión',
    'Finalizado': 'Finalizado',
    'Finished': 'Finalizado',
    'Próximamente': 'Próximamente',
    'Not yet aired': 'Próximamente',
    'Cancelado': 'Cancelado',
    'Cancelled': 'Cancelado',
    'En pausa': 'En pausa',
    'On Hiatus': 'En pausa',
  };

  return statusMap[status] || status;
};

/** Devuelve una etiqueta legible para la temporada (string u objeto). */
export const getSeasonLabel = (season?: Anime1VSeason | string | null): string | null => {
  if (!season) return null;
  if (typeof season === 'string') return season;
  if (season.label) return season.label;
  if (season.name) {
    return season.year ? `${season.name} ${season.year}` : season.name;
  }
  return null;
};
