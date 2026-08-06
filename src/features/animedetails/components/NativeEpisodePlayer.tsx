import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, ActivityIndicator, TouchableOpacity,
  Text, Platform, BackHandler, StatusBar, Dimensions
} from 'react-native';
import Video from 'react-native-video';
import { Ionicons } from '@expo/vector-icons';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';

interface NativeEpisodePlayerProps {
  url: string | null;
  resolving?: boolean;
  resolveFailed?: boolean;
  onError?: (error: string) => void;
  onRetry?: () => void;
}

let _immersiveCount = 0;

async function enterImmersiveMode() {
  try {
    _immersiveCount++;
    const isFirst = _immersiveCount === 1;

    if (Platform.OS === 'android') {
      await NavigationBar.setVisibilityAsync('hidden');
    }
    await SystemUI.setBackgroundColorAsync('transparent');
    await activateKeepAwakeAsync();

    if (isFirst) {
      await new Promise(r => setTimeout(r, 150));
    }
    StatusBar.setTranslucent(true);
    StatusBar.setHidden(true, 'fade');

    await new Promise(r => setTimeout(r, 80));
    StatusBar.setHidden(true, 'none');
  } catch (e) {
    console.error('[enterImmersiveMode]', e);
  }
}

async function exitImmersiveMode() {
  try {
    const { width, height } = Dimensions.get('window');
    const esTablet = Math.min(width, height) >= 768;
    if (Platform.OS !== 'web' && !esTablet) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
    StatusBar.setTranslucent(true);
    StatusBar.setHidden(false, 'fade');

    if (Platform.OS === 'android') {
      await NavigationBar.setVisibilityAsync('visible');
      await SystemUI.setBackgroundColorAsync('transparent');
    }
    await deactivateKeepAwake();
  } catch (e) {
    console.error('[exitImmersiveMode]', e);
  }
}

export const NativeEpisodePlayer: React.FC<NativeEpisodePlayerProps> = ({
  url,
  resolving = false,
  resolveFailed = false,
  onError,
  onRetry,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<any>(null);

  useEffect(() => {
    setError(null);
    setLoading(true);
  }, [url]);

  useEffect(() => {
    if (isFullscreen) {
      enterImmersiveMode();
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } else {
      exitImmersiveMode();
    }
  }, [isFullscreen]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isFullscreen) {
        setIsFullscreen(false);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [isFullscreen]);

  useEffect(() => {
    return () => {
      exitImmersiveMode();
    };
  }, []);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    onRetry?.();
  };

  const handleVideoError = (e: any) => {
    console.error('[NativePlayer Video Error]', e);
    const msg = 'No se pudo reproducir el stream nativo.';
    setError(msg);
    setLoading(false);
    onError?.(msg);
  };

  const showResolvingOverlay = resolving || (url === null && !resolveFailed && !error);
  const showErrorOverlay = !showResolvingOverlay && (error !== null || (url === null && resolveFailed));

  return (
    <>
      {isFullscreen && <View style={styles.placeholder} />}
      <View style={[styles.container, isFullscreen && styles.containerFullscreen]}>
        {showResolvingOverlay && (
          <View style={[styles.overlay, styles.centered]}>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={styles.infoText}>Extrayendo video directo...</Text>
          </View>
        )}

        {showErrorOverlay && (
          <View style={[styles.overlay, styles.centered]}>
            <Ionicons name="alert-circle-outline" size={40} color="#f43f5e" />
            <Text style={styles.errorText}>{error || 'No se pudo extraer el stream directo.'}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {url && (
          <View style={{ flex: 1, position: 'relative' }}>
            <Video
              ref={videoRef}
              source={{
                uri: url,
                type: url.includes('m3u8') ? 'm3u8' : undefined,
              }}
              style={styles.video}
              controls={true}
              paused={true}
              resizeMode="contain"
              onLoadStart={() => setLoading(true)}
              onLoad={() => setLoading(false)}
              onError={handleVideoError}
              onFullscreenPlayerWillPresent={() => setIsFullscreen(true)}
              onFullscreenPlayerDidPresent={() => setIsFullscreen(true)}
              onFullscreenPlayerWillDismiss={() => setIsFullscreen(false)}
              onFullscreenPlayerDidDismiss={() => setIsFullscreen(false)}
            />

            {loading && (
              <View style={[styles.videoOverlay, styles.centered]} pointerEvents="none">
                <ActivityIndicator size="large" color="#8b5cf6" />
              </View>
            )}
          </View>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    marginBottom: 16,
  },
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  containerFullscreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    aspectRatio: undefined,
    borderRadius: 0,
    marginBottom: 0,
    zIndex: 9999,
  },
  video: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#070a13',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryBtn: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },

});
