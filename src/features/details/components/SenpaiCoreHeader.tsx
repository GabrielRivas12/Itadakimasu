import { StyleSheet, Text, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Anime1VDetail, buildImageProxyUrl } from '../../../../services/anime1v';
import { useResponsive } from '../../../hooks/useResponsive';
import { getStatusLabel } from '../utils/detailFormat';

interface SenpaiCoreHeaderProps {
  detail: Anime1VDetail;
  compact?: boolean;
}

export function SenpaiCoreHeader({ detail, compact = false }: SenpaiCoreHeaderProps) {
  const { isWeb } = useResponsive();
  const insets = useSafeAreaInsets();

  const rawBackdrop = detail.backcover || detail.backdrop;
  const backdropUri = rawBackdrop ? buildImageProxyUrl(rawBackdrop) : null;
  const coverUri = detail.image ? buildImageProxyUrl(detail.image) : null;
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
    <View style={[styles.hero, { paddingTop: compact ? 0 : insets.top + 0 }]}>
      {backdropUri && (
        <Image
          source={{ uri: backdropUri }}
          style={styles.heroBackdrop}
          resizeMode="cover"
          fadeDuration={300}
        />
      )}
      <View pointerEvents="none" style={styles.heroOverlay} />

      <View style={styles.heroContent}>
        <View style={styles.coverContainer}>
          {coverUri ? (
            <Image
              source={{ uri: coverUri }}
              style={styles.coverImage}
              resizeMode="cover"
              fadeDuration={300}
            />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="image-outline" size={26} color="#475569" />
            </View>
          )}
        </View>

        <View style={styles.infoColumn}>
          <Text style={styles.animeTitle} numberOfLines={3}>
            {displayTitle}
          </Text>

          <View style={styles.statRow}>
            <View style={styles.statPill}>
              <Ionicons name="star" size={12} color="#fbbf24" />
              <Text style={styles.statPillValue} numberOfLines={1}>
                {score !== null ? score.toFixed(1) : 'N/A'}
              </Text>
            </View>

            <View style={styles.statPill}>
              <Ionicons name="albums-outline" size={12} color="#a78bfa" />
              <Text style={styles.statPillValue} numberOfLines={1}>
                {totalEpisodes > 0 ? `${totalEpisodes} eps` : '—'}
              </Text>
            </View>

            <View style={styles.statPill}>
              <Ionicons name="pulse-outline" size={12} color="#4ade80" />
              <Text style={styles.statPillValue} numberOfLines={1}>
                {status}
              </Text>
            </View>

            {!!detail.type && (
              <View style={styles.statPill}>
                <Ionicons name="tv-outline" size={12} color="#60a5fa" />
                <Text style={styles.statPillValue} numberOfLines={1}>
                  {detail.type}
                </Text>
              </View>
            )}

            {!!detail.year && (
              <View style={styles.statPill}>
                <Ionicons name="calendar-outline" size={12} color="#f472b6" />
                <Text style={styles.statPillValue} numberOfLines={1}>
                  {detail.year}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    position: 'relative',
    backgroundColor: '#0b0f19',
    overflow: 'hidden',
  },
  heroBackdrop: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    opacity: 0.9,
    marginTop: 25
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11, 15, 25, 0.82)',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  infoColumn: {
    flex: 1,
    gap: 10,
    paddingTop: 2,
  },
  coverContainer: {
    width: 104,
    height: 156,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animeTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    lineHeight: 27,
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
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
  },
  statPillValue: {
    color: '#ffffff',
    fontSize: 12,
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
