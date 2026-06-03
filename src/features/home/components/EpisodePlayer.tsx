import React, { useState, useRef } from 'react';
import { StyleSheet, View, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

interface EpisodePlayerProps {
  url: string | null;
}

// Servidores conocidos y cómo manejarlos
const getPlayerConfig = (url: string): { userAgent: string; injectedJS: string } => {
  const isZilla   = url.includes('zilla-networks.com');
  const isSWish   = url.includes('streamwish.com') || url.includes('strw.com') || url.includes('awish.pro');

  // User-agent de Chrome desktop — la mayoría de players embebidos
  // bloquean WebView por el UA de Android/iOS
  const desktopUA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/124.0.0.0 Safari/537.36';

  // JS inyectado al cargar la página:
  // 1. Asegura que los controles estén visibles y quita el autoplay del tag
  // 2. Elimina overlays/banners que bloqueen el player
  const commonJS = `
    (function() {
      function prepareVideo(video) {
        video.autoplay = false;
        video.playsInline = true;
        video.controls = true;
      }

      function processVideos() {
        document.querySelectorAll('video').forEach(prepareVideo);
      }

      processVideos();

      const observer = new MutationObserver(() => processVideos());
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
      });

      const blockers = ['#overlay', '.overlay', '.ad-container', '[id*="vast"]', '[class*="blocker"]'];
      blockers.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.remove());
      });
    })();
    true;
  `;

  return {
    userAgent: desktopUA,
    injectedJS: commonJS,
  };
};

export const EpisodePlayer: React.FC<EpisodePlayerProps> = ({ url }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [key, setKey]         = useState(0); // para forzar re-mount en retry
  const webViewRef = useRef<WebView>(null);

  if (!url) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  const { userAgent, injectedJS } = getPlayerConfig(url);

  const handleRetry = () => {
    setError(false);
    setLoading(true);
    setKey(k => k + 1);
  };

  return (
    <View style={styles.container}>
      <WebView
        key={key}
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        // ── Reproducción ──────────────────────────────
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={true}
        // ── Compatibilidad con players embebidos ──────
        userAgent={userAgent}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        mixedContentMode="always"          // Android: permite http dentro de https
        injectedJavaScript={injectedJS}
        // ── Manejo de navegación ──────────────────────
        // Evita que el player te saque del WebView al abrir links externos
        onShouldStartLoadWithRequest={(req) => {
          // Permitir solo la URL del player y sus recursos
          const allowed =
            req.url === url ||
            req.url.includes('zilla-networks.com') ||
            req.url.includes('streamwish.com') ||
            req.url.includes('strw.com') ||
            req.url.includes('awish.pro') ||
            req.url.startsWith('blob:') ||
            req.url.startsWith('data:') ||
            req.mainDocumentURL === url;
          return allowed;
        }}
        // ── Estados de carga ──────────────────────────
        onLoadStart={() => { setLoading(true); setError(false); }}
        onLoadEnd={()   => setLoading(false)}
        onError={()     => { setLoading(false); setError(true); }}
        renderLoading={() => (
          <View style={[styles.overlay, styles.centered]}>
            <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
        )}
        startInLoadingState
      />

      {/* Spinner mientras carga (encima del WebView) */}
      {loading && !error && (
        <View style={[styles.overlay, styles.centered]} pointerEvents="none">
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      )}

      {/* Error con opción de retry */}
      {error && (
        <View style={[styles.overlay, styles.centered]}>
          <Ionicons name="alert-circle-outline" size={40} color="#f43f5e" />
          <Text style={styles.errorText}>No se pudo cargar el video</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
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
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
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