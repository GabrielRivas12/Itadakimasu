import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, View, ActivityIndicator, TouchableOpacity,
  Text, Platform, BackHandler
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

interface EpisodePlayerProps {
  url: string | null;
}

// ─── Dominios del player permitidos ───────────────────────────────────────────
const ALLOWED_DOMAINS = [
  'zilla-networks.com',
  'streamwish.com',
  'strw.com',
  'awish.pro',
  'mp4upload.com',
];

const isAllowedUrl = (requestUrl: string): boolean => {
  if (requestUrl.startsWith('blob:') || requestUrl.startsWith('data:') || requestUrl === 'about:blank') return true;
  if (requestUrl.match(/\.(mp4|m3u8|webm|ogg|ts)(\?|$)/i)) return true;
  return ALLOWED_DOMAINS.some(d => requestUrl.includes(d));
};

// ─── User Agent ────────────────────────────────────────────────────────────────
const USER_AGENT = Platform.select({
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  default: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
});

// ─── Script anti-anuncios ──────────────────────────────────────────────────────
const ANTI_AD_SCRIPT = `
(function() {
  // ── 1. Bloquear window.open ───────────────────────────────────────────────
  window.open = function() { return null; };
  try {
    Object.defineProperty(window, 'open', { value: function() { return null; }, writable: false });
  } catch(e) {}

  // ── 2. Congelar location ──────────────────────────────────────────────────
  const _noop = function() { return false; };
  try { window.location.assign  = _noop; } catch(e) {}
  try { window.location.replace = _noop; } catch(e) {}

  // ── 3. Bloquear history ───────────────────────────────────────────────────
  const _origPush    = history.pushState.bind(history);
  const _origReplace = history.replaceState.bind(history);
  history.pushState = function(s, t, url) {
    if (url && !String(url).startsWith('/') && !String(url).startsWith('#')) return;
    _origPush(s, t, url);
  };
  history.replaceState = function(s, t, url) {
    if (url && !String(url).startsWith('/') && !String(url).startsWith('#')) return;
    _origReplace(s, t, url);
  };

  // ── 4. Bloquear clicks externos ───────────────────────────────────────────
  document.addEventListener('click', function(e) {
    let node = e.target;
    for (let i = 0; i < 10 && node && node !== document.body; i++, node = node.parentElement) {
      if (node.tagName === 'A') {
        const href = node.getAttribute('href') || '';
        const isExternal = href.startsWith('http') && !href.includes(window.location.hostname);
        const isMedia    = /\\.(mp4|m3u8|webm|ts)/i.test(href);
        if (isExternal && !isMedia) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
      }
    }
  }, true);

  // ── 5. Interceptar setTimeout/setInterval ─────────────────────────────────
  const _origTimeout  = window.setTimeout;
  const _origInterval = window.setInterval;
  const _badPattern   = /window\\.open|location\\.href\\s*=|location\\.replace|location\\.assign/;

  window.setTimeout = function(fn, delay, ...args) {
    if (typeof fn === 'string'   && _badPattern.test(fn))            return 0;
    if (typeof fn === 'function' && _badPattern.test(fn.toString())) return 0;
    return _origTimeout(fn, delay, ...args);
  };
  window.setInterval = function(fn, delay, ...args) {
    if (typeof fn === 'string'   && _badPattern.test(fn))            return 0;
    if (typeof fn === 'function' && _badPattern.test(fn.toString())) return 0;
    return _origInterval(fn, delay, ...args);
  };

  // ── 6. MutationObserver + protección en iframes ───────────────────────────
  const AD_HOSTS = [
    'doubleclick','googlesyndication','adnxs','adsrvr',
    'popads','popcash','exoclick','trafficjunky','adsterra',
    'hilltopads','propellerads','clickadu'
  ];

  function isAdSrc(src) {
    if (!src) return false;
    return AD_HOSTS.some(h => src.includes(h));
  }

  function injectIntoIframe(iframe) {
    try {
      iframe.addEventListener('load', function() {
        try {
          const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!iDoc) return;
          const s = iDoc.createElement('script');
          s.textContent = \`
            window.open = function() { return null; };
            try { Object.defineProperty(window,'open',{value:function(){return null;},writable:false}); } catch(e){}
            var _n = function(){return false;};
            try { window.location.assign  = _n; } catch(e) {}
            try { window.location.replace = _n; } catch(e) {}
            document.addEventListener('click', function(e) {
              var node = e.target;
              for (var i = 0; i < 10 && node && node !== document.body; i++, node = node.parentElement) {
                if (node.tagName === 'A') {
                  var h = node.getAttribute('href') || '';
                  if (h.startsWith('http') && !h.includes(window.location.hostname) && !/\\\\.(mp4|m3u8|webm|ts)/i.test(h)) {
                    e.preventDefault(); e.stopImmediatePropagation(); return;
                  }
                }
              }
            }, true);
          \`;
          (iDoc.head || iDoc.documentElement).appendChild(s);
        } catch(ex) {}
      });
    } catch(e) {}
  }

  function cleanNode(node) {
    if (!node || !node.tagName) return;

    if ((node.tagName === 'IFRAME' || node.tagName === 'SCRIPT') && isAdSrc(node.src)) {
      node.remove();
      return;
    }

    if (node.tagName === 'IFRAME') {
      try {
        const s = window.getComputedStyle(node);
        const w = node.getAttribute('width');
        const h = node.getAttribute('height');
        if (s.width === '0px' || s.height === '0px' || s.opacity === '0' || w === '0' || h === '0') {
          node.remove();
          return;
        }
      } catch(e) {}

      // Inyectar protección dentro del iframe
      injectIntoIframe(node);
    }
  }

  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      m.addedNodes.forEach(cleanNode);
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Limpiar iframes ya existentes
  document.querySelectorAll('iframe').forEach(cleanNode);

  console.log('[AntiAd] Protección cargada.');
})();
true;
`;

// ─── Componente ────────────────────────────────────────────────────────────────
export const EpisodePlayer: React.FC<EpisodePlayerProps> = ({ url }) => {
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(false);
  const [key, setKey]                   = useState(0);
  const [blockedPopup, setBlockedPopup] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const canGoBackRef = useRef(false);

  // Hardware back en Android
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBackRef.current) {
        webViewRef.current?.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  const handleRetry = () => {
    setError(false);
    setLoading(true);
    setBlockedPopup(false);
    setKey(k => k + 1);
  };

  const showBlocked = () => {
    setBlockedPopup(true);
    setTimeout(() => setBlockedPopup(false), 1500);
  };

  if (!url) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        key={key}
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}

        // ── Reproducción ──────────────────────────────────────────────────────
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}

        // ── Configuración ──────────────────────────────────────────────────────
        userAgent={USER_AGENT}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled={false}
        mixedContentMode="always"
        cacheEnabled

        // ── CLAVE 1: bloquear múltiples ventanas a nivel nativo (Android) ──────
        // Sin esto, window.open y target="_blank" abren el browser del sistema
        // bypasseando completamente onShouldStartLoadWithRequest
        setSupportMultipleWindows={false}

        // ── CLAVE 2: lista de orígenes (mantener '*' para no romper el player) ─
        originWhitelist={['*']}

        // ── CLAVE 3: script ANTES que cualquier JS de la página ───────────────
        injectedJavaScriptBeforeContentLoaded={ANTI_AD_SCRIPT}

        // ── CLAVE 4: interceptar window.open a nivel nativo ───────────────────
        onOpenWindow={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.log('[BLOQUEADO onOpenWindow]', nativeEvent.targetUrl);
          showBlocked();
          // No hacer nada = ventana bloqueada nativamente
        }}

        // ── Filtro de navegación ──────────────────────────────────────────────
        onShouldStartLoadWithRequest={(req) => {
          const { url: reqUrl, navigationType, isTopFrame } = req;

          // Siempre permitir la URL original
          if (reqUrl === url) return true;

          // Permitir recursos multimedia
          if (reqUrl.match(/\.(mp4|m3u8|webm|ogg|ts)(\?|$)/i)) return true;
          if (reqUrl.startsWith('blob:') || reqUrl.startsWith('data:')) return true;

          // Bloquear top-frame a dominio no permitido
          if (isTopFrame && !isAllowedUrl(reqUrl)) {
            console.log('[BLOQUEADO top-frame]', reqUrl);
            showBlocked();
            return false;
          }

          // Bloquear clicks hacia dominios externos
          if (navigationType === 'click' && !isAllowedUrl(reqUrl)) {
            console.log('[BLOQUEADO click]', reqUrl);
            showBlocked();
            return false;
          }

          return true;
        }}

        // ── Fallback: si la URL cambió a algo no permitido, volver atrás ──────
        onNavigationStateChange={(nav) => {
          canGoBackRef.current = nav.canGoBack;
          if (
            nav.url !== url &&
            !isAllowedUrl(nav.url) &&
            !nav.url.match(/\.(mp4|m3u8)/i)
          ) {
            webViewRef.current?.goBack();
          }
        }}

        onLoadStart={() => { setLoading(true); setError(false); }}
        onLoadEnd={()   => setLoading(false)}
        onError={({ nativeEvent }) => {
          console.error('[WebView Error]', nativeEvent);
          setLoading(false);
          setError(true);
        }}
      />

      {/* Spinner de carga */}
      {loading && !error && (
        <View style={[styles.overlay, styles.centered]} pointerEvents="none">
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Cargando reproductor...</Text>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={[styles.overlay, styles.centered]}>
          <Ionicons name="alert-circle-outline" size={40} color="#f43f5e" />
          <Text style={styles.errorText}>No se pudo cargar el video</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notificación cuando se bloquea un anuncio */}
      {blockedPopup && (
        <View style={[styles.overlay, styles.centered, styles.popupNotification]} pointerEvents="none">
          <Ionicons name="shield-checkmark" size={30} color="#10b981" />
          <Text style={styles.blockedText}>Anuncio bloqueado</Text>
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
  webview:  { flex: 1, backgroundColor: '#000' },
  overlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)' },
  centered: { justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:  { color: '#94a3b8', fontSize: 14 },
  errorText:    { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  retryText:         { color: '#fff', fontWeight: 'bold' },
  popupNotification: { backgroundColor: 'rgba(0,0,0,0.9)' },
  blockedText:       { color: '#10b981', fontSize: 14, fontWeight: 'bold' },
});