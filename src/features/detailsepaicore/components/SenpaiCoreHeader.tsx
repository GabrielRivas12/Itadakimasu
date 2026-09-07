import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { Anime1VDetail, buildImageProxyUrl } from '../../../../services/anime1v';
import { useResponsive } from '../../../hooks/useResponsive';

interface SenpaiCoreHeaderProps {
  detail: Anime1VDetail;
}

export function SenpaiCoreHeader({ detail }: SenpaiCoreHeaderProps) {
  const { isWeb } = useResponsive();

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
          {!!detail.titleJapanese && (
            <Text style={styles.webJapaneseTitle}>{detail.titleJapanese}</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.bannerContainer}>
        {backdropUri ? (
          <Image
            source={{ uri: backdropUri }}
            style={styles.bannerImage}
            resizeMode="cover"
            fadeDuration={300}
          />
        ) : coverUri ? (
          <View style={styles.defaultBanner}>
            <Image source={{ uri: coverUri }} style={styles.defaultBannerImage} resizeMode="contain" fadeDuration={300} />
          </View>
        ) : (
          <View style={styles.defaultBanner} />
        )}
        <View style={styles.bannerOverlay} />
      </View>

      <View style={styles.detailsHeader}>
        <View style={styles.coverImageContainer}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverImage} fadeDuration={300} />
          ) : (
            <View style={styles.coverPlaceholder} />
          )}
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.animeTitle} numberOfLines={3}>
            {displayTitle}
          </Text>
          {!!detail.titleJapanese && (
            <Text style={styles.japaneseTitle} numberOfLines={2}>
              {detail.titleJapanese}
            </Text>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    height: 240,
    marginHorizontal: -16,
    width: 'auto',
    backgroundColor: '#1e293b',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  defaultBanner: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultBannerImage: {
    width: 140,
    height: 210,
    opacity: 0.35,
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 15, 25, 0.65)',
  },
  detailsHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -80,
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  coverImageContainer: {
    width: 110,
    height: 165,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1e293b',
    backgroundColor: '#1e293b',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  titleContainer: {
    flex: 1,
    marginLeft: 16,
    paddingBottom: 4,
    minHeight: 80,
    justifyContent: 'flex-end',
  },
  animeTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  japaneseTitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
  },
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
  webJapaneseTitle: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
  },
});