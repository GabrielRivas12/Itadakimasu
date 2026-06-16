import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, ActivityIndicator, TouchableOpacity,
  Text, Platform, BackHandler, StatusBar
} from 'react-native';
import Video from 'react-native-video';
import { Ionicons } from '@expo/vector-icons';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';
import { resolveAnime1VStream } from '../../../../services/anime1v';

interface NativeEpisodePlayerProps {
  url: string | null;
  onError?: (error: string) => void;
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
    if (Platform.OS !== 'web') {
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

export const NativeEpisodePlayer: React.FC<NativeEpisodePlayerProps> = ({ url, onError }) => {
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<any>(null);

  useEffect(() => {
    if (url) {
      resolveStream(url);
    }
    return () => {
      exitImmersiveMode();
    };
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

  const resolveStream = async (targetUrl: string) => {
    setResolving(true);
    setError(null);
    setResolvedUrl(null);
    setLoading(true);

    try {
      console.log(`[NativePlayer] Intentando resolver localmente o vía API: ${targetUrl}`);

      // 1. Detección local de Zilla-networks (HLS)
      if (targetUrl.includes('zilla-networks.com')) {
        const parts = targetUrl.split('?')[0].split('/');
        const id = parts[parts.length - 1] || parts[parts.length - 2];
        if (id && id.length >= 16) {
          const directM3u8 = `https://player.zilla-networks.com/m3u8/${id}`;
          console.log(`[NativePlayer] Resuelto localmente (Zilla HLS): ${directM3u8}`);
          setHeaders({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': 'https://player.zilla-networks.com/'
          });
          setResolvedUrl(directM3u8);
          setResolving(false);
          setLoading(false);
          return;
        }
      }

      // 2. Detección local de Pixeldrain
      if (targetUrl.includes('pixeldrain.com')) {
        const match = targetUrl.match(/\/u\/([a-zA-Z0-9]+)/);
        if (match && match[1]) {
          const directUrl = `https://pixeldrain.com/api/file/${match[1]}?download`;
          console.log(`[NativePlayer] Resuelto localmente (Pixeldrain): ${directUrl}`);
          setHeaders({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
          });
          setResolvedUrl(directUrl);
          setResolving(false);
          setLoading(false);
          return;
        }
      }

      // 3. Detección por scraping local de Mp4Upload
      if (targetUrl.includes('mp4upload.com')) {
        console.log(`[NativePlayer] Scraping HTML de Mp4Upload: ${targetUrl}`);
        const response = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': 'https://www.mp4upload.com/'
          }
        });
        const html = await response.text();
        const match = html.match(/src:\s*"([^"]+\.mp4)"/);
        if (match && match[1]) {
          const directUrl = match[1];
          console.log(`[NativePlayer] Resuelto Mp4Upload: ${directUrl}`);
          setHeaders({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': 'https://www.mp4upload.com/'
          });
          setResolvedUrl(directUrl);
          setResolving(false);
          setLoading(false);
          return;
        }
      }

      // 4. Detección por scraping y decodificación local de Streamwish / ghbrisk
      const isStreamwishFamily = targetUrl.includes('ghbrisk.com') || 
                                 targetUrl.includes('streamwish.com') || 
                                 targetUrl.includes('strw.com') || 
                                 targetUrl.includes('awish.pro');
                                 
      if (isStreamwishFamily) {
        console.log(`[NativePlayer] Scraping HTML y desempaquetando Streamwish/ghbrisk: ${targetUrl}`);
        const response = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': targetUrl
          }
        });
        const html = await response.text();
        
        // Buscar bloque packer javascript: eval(function(p,a,c,k,e,d)...
        // Capturamos p (grupo 2), a (grupo 3), c (grupo 4) y k (grupo 6)
        const packerMatch = html.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?return p\}\s*\(\s*(['"])([\s\S]*?)\1\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(['"])([\s\S]*?)\5\.split\(/);
        if (packerMatch) {
          try {
            const p = packerMatch[2];
            const a = parseInt(packerMatch[3]);
            const wordsStr = packerMatch[6];
            const k = wordsStr.split('|');
            
            // Desempaquetador Dean Edwards Packer
            const decoded = p.replace(/\b\w+\b/g, (w) => {
              const num = parseInt(w, a);
              return k[num] || w;
            });
                
                // Extraer el enlace m3u8
                const m3u8Match = decoded.match(/https?:\/\/[^"']+\.m3u8[^"']*/);
                if (m3u8Match) {
                  const directUrl = m3u8Match[0].replace(/\\/g, '');
                  console.log(`[NativePlayer] Resuelto localmente Streamwish/ghbrisk: ${directUrl}`);
                  setHeaders({
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Referer': targetUrl
                  });
                  setResolvedUrl(directUrl);
                  setResolving(false);
                  setLoading(false);
                  return;
                }
              } catch (unpackErr) {
                console.error('[NativePlayer] Error al desempaquetar script de Streamwish:', unpackErr);
              }
            }
          }

      // 5. Fallback a la API de resolución
      const res = await resolveAnime1VStream(targetUrl);
      
      if (res && res.success && res.streamUrl) {
        console.log(`[NativePlayer] Stream resuelto vía API (${res.server}): ${res.streamUrl}`);
        
        const customHeaders: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        };

        if (res.resolvedFrom) {
          try {
            const urlObj = new URL(res.resolvedFrom);
            customHeaders['Referer'] = `${urlObj.protocol}//${urlObj.hostname}/`;
          } catch (_) {
            customHeaders['Referer'] = res.resolvedFrom;
          }
        }

        setHeaders(customHeaders);
        setResolvedUrl(res.streamUrl);
      } else {
        const msg = 'El reproductor nativo no soporta la extracción automática para este servidor. Usa el reproductor web de arriba.';
        setError(msg);
        onError?.(msg);
      }
    } catch (err: any) {
      console.error('[NativePlayer] Error resolviendo stream:', err);
      const msg = 'El reproductor nativo no soporta este servidor o el endpoint del backend está desactivado. Usa el reproductor web de arriba.';
      setError(msg);
      onError?.(msg);
    } finally {
      setResolving(false);
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (url) resolveStream(url);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <View style={[styles.container, isFullscreen && styles.containerFullscreen]}>
      {resolving && (
        <View style={[styles.overlay, styles.centered]}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.infoText}>Extrayendo video directo...</Text>
        </View>
      )}

      {error && (
        <View style={[styles.overlay, styles.centered]}>
          <Ionicons name="alert-circle-outline" size={40} color="#f43f5e" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {resolvedUrl && (
        <View style={{ flex: 1, position: 'relative' }}>
          <Video
            ref={videoRef}
            source={{
              uri: resolvedUrl,
              type: resolvedUrl.includes('m3u8') ? 'm3u8' : undefined,
              headers: headers,
            }}
            style={styles.video}
            controls={true}
            paused={true}
            resizeMode="contain"
            onLoadStart={() => setLoading(true)}
            onLoad={() => setLoading(false)}
            onError={(e) => {
              console.error('[NativePlayer Video Error]', e);
              const msg = 'No se pudo reproducir el stream nativo.';
              setError(msg);
              setLoading(false);
              onError?.(msg);
            }}
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
  );
};

const styles = StyleSheet.create({
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
