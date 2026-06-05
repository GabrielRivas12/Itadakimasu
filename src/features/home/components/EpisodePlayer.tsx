import React, { useState, useRef } from 'react';
import { StyleSheet, View, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

interface EpisodePlayerProps {
  url: string | null;
}

const getPlayerConfig = (): { userAgent: string; injectedJS: string } => {
  // Mantener User-Agent de escritorio para evitar que los servidores bloqueen la carga en móviles
  const desktopUA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/124.0.0.0 Safari/537.36';

  const commonJS = `
    (function() {
      // ── 1. ANTIPOPUP / ADS PARCHE EXTREMO ──
      window.open = function() { return null; };
      Object.defineProperty(window, 'open', { value: function() { return null; }, writable: false });
      
      window.alert = function() { return true; };
      window.confirm = function() { return true; };

      // ── 2. PREPARACIÓN BÁSICA DEL VIDEO (Sin forzar controles) ──
      function prepareVideo(video) {
        video.autoplay = false;
        video.playsInline = true;
        // Quitamos la línea de "video.controls = true/false" y alteración de zIndex 
        // para dejar que la interfaz por defecto del servidor tome el control.
        video.style.width = "100%";
        video.style.height = "100%";
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

      // ── 3. LIMPIEZA DE BANNERS / OVERLAYS EXTERNOS ──
      const blockers = [
        '#overlay', '.overlay', '.ad-container', '[id*="vast"]', 
        '[class*="blocker"]', '#popunder', 'iframe[src*="ads"]',
        'div[style*="position: absolute"][style*="z-index: 2147483647"]'
      ];
      
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
  const [key, setKey]         = useState(0); 
  const webViewRef = useRef<WebView>(null);

  if (!url) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  const { userAgent, injectedJS } = getPlayerConfig();

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
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={true}
        userAgent={userAgent}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        mixedContentMode="always"
        injectedJavaScript={injectedJS}
        onShouldStartLoadWithRequest={(req) => {
          const isTargetUrl = req.url === url || req.mainDocumentURL === url;
          
          const isAllowedDomain =
            req.url.includes('zilla-networks.com') ||
            req.url.includes('streamwish.com') ||
            req.url.includes('strw.com') ||
            req.url.includes('awish.pro') ||
            req.url.includes('mp4upload.com') || 
            req.url.startsWith('blob:') ||
            req.url.startsWith('data:');

          // El escudo contra redirecciones maliciosas sigue activo protegiendo el entorno
          if (!isTargetUrl && !isAllowedDomain) {
            console.log(`[AD BLOCK] Bloqueada redirección maliciosa a: ${req.url}`);
            return false; 
          }

          return true;
        }}
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

      {loading && !error && (
        <View style={[styles.overlay, styles.centered]} pointerEvents="none">
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      )}

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