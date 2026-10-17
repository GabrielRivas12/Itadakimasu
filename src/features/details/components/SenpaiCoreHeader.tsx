import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Anime1VDetail, buildImageProxyUrl } from '../../../../services/anime1v';
import { useResponsive } from '../../../hooks/useResponsive';
import { getStatusLabel } from '../utils/detailFormat';

interface SenpaiCoreHeaderProps {
  detail: Anime1VDetail;
}

// Degradado inferior simulado con muchas bandas finas y una curva continua:
// transparente arriba y opaco hacia abajo (donde van el título y los datos).
// Con muchas franjas el paso entre bandas es imperceptible (sin efecto
// escalonado) y el final funde a opacidad 1 con el fondo #0b0f19 de la página.
const SCRIM_STEPS = 120;
const SCRIM_OPACITIES = Array.from({ length: SCRIM_STEPS }, (_, i) => {
  const t = (i + 1) / SCRIM_STEPS; // 0 (arriba) -> 1 (abajo)
  const start = 0.32; // tramo superior totalmente limpio
  if (t <= start) return 0;
  const p = (t - start) / (1 - start);
  return Math.pow(p, 1.25);
});

export function SenpaiCoreHeader({ detail }: SenpaiCoreHeaderProps) {
  const { isWeb } = useResponsive();
  const insets = useSafeAreaInsets();

  const rawBackdrop = detail.backcover || detail.backdrop;
  const backdropUri = rawBackdrop ? buildImageProxyUrl(rawBackdrop) : null;
  const coverUri = detail.image ? buildImageProxyUrl(detail.image) : null;
  // En móvil usamos la portada vertical como fondo; el backdrop queda de reserva.
  const heroUri = coverUri || backdropUri;
  const displayTitle = detail.title || 'Detalles';

  if (isWeb) {
    return (
      <View style={styles.webHeaderInfo}>
        <View style={styles.webCoverContainer}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.webCoverImage} fadeDuration={300} />
          ) : (
            <View style={styles.webCoverPlaceholder} />
          )}
        </View>
        <View style={styles.webTitleContainer}>
          <Text style={styles.webAnimeTitle}>{displayTitle}</Text>
        </View>
      </View>
    );
  }

  const score = detail.score ?? null;
  const totalEpisodes = detail.totalEpisodes;
  const status = getStatusLabel(detail.status);

  return (
    <View style={styles.hero}>
      {heroUri ? (
        <Image
          source={{ uri: heroUri }}
          style={styles.heroImage}
          resizeMode="cover"
          fadeDuration={300}
        />
      ) : (
        <View style={styles.heroFallback} />
      )}

      <View pointerEvents="none" style={styles.heroScrim}>
        {SCRIM_OPACITIES.map((opacity, index) => (
          <View key={`scrim-${index}`} style={[styles.scrimBand, { opacity }]} />
        ))}
      </View>

      <View style={[styles.heroContent, { paddingTop: insets.top + 16 }]}>
        <View style={styles.titleBlock}>
          <Text style={styles.animeTitle} numberOfLines={3}>
            {displayTitle}
          </Text>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statPill}>
            <Ionicons name="star" size={13} color="#fbbf24" />
            <Text style={styles.statPillValue} numberOfLines={1}>
              {score !== null ? score.toFixed(1) : 'N/A'}
            </Text>
          </View>

          <View style={styles.statPill}>
            <Ionicons name="albums-outline" size={13} color="#a78bfa" />
            <Text style={styles.statPillValue} numberOfLines={1}>
              {totalEpisodes > 0 ? `${totalEpisodes} eps` : '—'}
            </Text>
          </View>

          <View style={styles.statPill}>
            <Ionicons name="pulse-outline" size={13} color="#4ade80" />
            <Text style={styles.statPillValue} numberOfLines={1}>
              {status}
            </Text>
          </View>

          {!!detail.type && (
            <View style={styles.statPill}>
              <Ionicons name="tv-outline" size={13} color="#60a5fa" />
              <Text style={styles.statPillValue} numberOfLines={1}>
                {detail.type}
              </Text>
            </View>
          )}

          {!!detail.year && (
            <View style={styles.statPill}>
              <Ionicons name="calendar-outline" size={13} color="#f472b6" />
              <Text style={styles.statPillValue} numberOfLines={1}>
                {detail.year}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ----- Header móvil: portada de fondo con datos al pie -----
  hero: {
    position: 'relative',
    minHeight: 560,
    justifyContent: 'flex-end',
    backgroundColor: '#0b0f19',
    overflow: 'hidden',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1e293b',
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  scrimBand: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  heroContent: {
    paddingHorizontal: 16,
    paddingBottom: 22,
    gap: 12,
  },
  titleBlock: {
    gap: 4,
  },
  animeTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: 'bold',
    lineHeight: 31,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
  },
  statPillValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },

  // ----- Header web (sin cambios) -----
  webHeaderInfo: {
    marginBottom: 24,
    alignItems: 'center',
    width: '100%',
  },
  webCoverContainer: {
    width: 220,
    height: 320,
    backgroundColor: '#111827',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  webCoverImage: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  webCoverPlaceholder: {
    flex: 1,
    backgroundColor: '#111827',
  },
  webTitleContainer: {
    alignItems: 'center',
    width: '100%',
    minHeight: 60,
  },
  webAnimeTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
});
