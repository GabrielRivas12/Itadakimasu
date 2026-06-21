import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Linking,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YoutubeIframe from 'react-native-youtube-iframe';

interface AnimeTrailerProps {
  trailer?: {
    id: string;
    site: string;
    thumbnail: string | null;
  } | null;
}

function getEmbedUrl(trailer: { id: string; site: string }): string | null {
  if (trailer.site === 'youtube') {
    return `https://www.youtube.com/embed/${trailer.id}`;
  }
  if (trailer.site === 'dailymotion') {
    return `https://www.dailymotion.com/embed/video/${trailer.id}`;
  }
  return null;
}

function getWatchUrl(trailer: { id: string; site: string }): string | null {
  if (trailer.site === 'youtube') {
    return `https://www.youtube.com/watch?v=${trailer.id}`;
  }
  if (trailer.site === 'dailymotion') {
    return `https://www.dailymotion.com/video/${trailer.id}`;
  }
  return null;
}

function getThumbnailUrl(trailer: { id: string; site: string; thumbnail: string | null }): string | null {
  if (trailer.thumbnail) return trailer.thumbnail;
  if (trailer.site === 'youtube') {
    return `https://img.youtube.com/vi/${trailer.id}/hqdefault.jpg`;
  }
  return null;
}

function TrailerWeb({ trailer }: { trailer: { id: string; site: string } }) {
  const embedUrl = getEmbedUrl(trailer);
  if (!embedUrl) return null;

  return (
    <View style={styles.webContainer}>
      <iframe
        src={embedUrl}
        style={iframeStyles.iframe}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        title="Anime Trailer"
      />
    </View>
  );
}

function TrailerNative({ trailer }: { trailer: { id: string; site: string; thumbnail: string | null } }) {
  const screenWidth = Dimensions.get('window').width;
  const isYoutube = trailer.site === 'youtube';
  const watchUrl = getWatchUrl(trailer);
  const thumbnailUrl = getThumbnailUrl(trailer);
  const playerHeight = (screenWidth - 32) * (9 / 16);

  if (isYoutube) {
    return (
      <View style={styles.nativeContainer}>
        <YoutubeIframe
          videoId={trailer.id}
          height={playerHeight}
          play={true}
        />
      </View>
    );
  }

  if (!watchUrl) return null;

  return (
    <TouchableOpacity style={styles.nativeContainer} onPress={() => Linking.openURL(watchUrl)} activeOpacity={0.8}>
      {thumbnailUrl ? (
        <Image
          source={{ uri: thumbnailUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.placeholderThumbnail}>
          <Ionicons name="play-circle" size={48} color="#8b5cf6" />
        </View>
      )}
      <View style={styles.playOverlay}>
        <Ionicons name="play-circle" size={48} color="#ffffff" />
        <Text style={styles.playText}>Ver Trailer</Text>
      </View>
    </TouchableOpacity>
  );
}

export const AnimeTrailer: React.FC<AnimeTrailerProps> = ({ trailer }) => {
  if (!trailer?.id || !trailer?.site) return null;

  const supportedSites = ['youtube', 'dailymotion'];
  if (!supportedSites.includes(trailer.site)) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Trailer</Text>
      {Platform.OS === 'web' ? (
        <TrailerWeb trailer={trailer as { id: string; site: string }} />
      ) : (
        <TrailerNative trailer={trailer as { id: string; site: string; thumbnail: string | null }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
    paddingLeft: 12,
  },
  webContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  nativeContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    gap: 8,
  },
  playText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

const iframeStyles: Record<string, React.CSSProperties> = {
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    display: 'block',
  },
};
