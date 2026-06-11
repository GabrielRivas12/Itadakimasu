import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, ActivityIndicator, TouchableOpacity,
  Text, Platform, BackHandler, StatusBar
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';

interface EpisodePlayerProps {
  url: string | null;
}

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

const USER_AGENT = Platform.select({
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  default: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
});

const ANTI_AD_SCRIPT = `
(function() {
  window.open = function() { return null; };
  try {
    Object.defineProperty(window, 'open', { value: function() { return null; }, writable: false });
  } catch(e) {}

  const _noop = function() { return false; };
  try { window.location.assign  = _noop; } catch(e) {}
  try { window.location.replace = _noop; } catch(e) {}

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
      injectIntoIframe(node);
    }
  }

  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      m.addedNodes.forEach(cleanNode);
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.querySelectorAll('iframe').forEach(cleanNode);

  function notifyFullscreen(isFs) {
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'fullscreen', value: isFs }));
    } catch(e) {}
  }

  document.addEventListener('fullscreenchange', function() {
    notifyFullscreen(!!document.fullscreenElement);
  });
  document.addEventListener('webkitfullscreenchange', function() {
    notifyFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
  });
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      notifyFullscreen(true);
    } else {
      var isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      notifyFullscreen(isFs);
    }
  });

  console.log('[AntiAd] Protección cargada.');
})();
true;
`;

// ─── Helpers para immersive mode ─────────────────────────────────────────────
// react-native-edge-to-edge gestiona WindowInsetsController de forma exclusiva,
// por lo que setBehaviorAsync lanza un warning y no tiene efecto.
// La estrategia correcta es:
//   - setVisibilityAsync('hidden') para nav bar (sí soportado)
//   - SystemUI.setBackgroundColorAsync('transparent') para evitar flash
//   - StatusBar.setTranslucent(true) ANTES de setHidden (requisito de edge-to-edge)
//   - Doble llamada a setHidden con pequeño delay la primera vez, porque
//     edge-to-edge hace un layout pass extra que re-muestra los íconos.

// Contador de veces que se entró en fullscreen en esta sesión.
// La primera vez hay que esperar a que el sistema procese la orientación
// antes de ocultar el status bar.
let _immersiveCount = 0;

async function enterImmersiveMode() {
  try {
    _immersiveCount++;
    const isFirst = _immersiveCount === 1;

    // Nav bar: setVisibilityAsync sí funciona con edge-to-edge
    if (Platform.OS === 'android') {
      await NavigationBar.setVisibilityAsync('hidden');
    }

    // Evitar flash de color del sistema al ocultar barras
    await SystemUI.setBackgroundColorAsync('transparent');

    // Keep awake antes de la orientación
    await activateKeepAwakeAsync();

    // Rotar a landscape
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

    // La primera vez, el sistema Android hace un layout pass adicional
    // después del cambio de orientación que re-muestra el status bar.
    // Esperamos a que ese pass termine antes de ocultarlo.
    if (isFirst) {
      await new Promise(r => setTimeout(r, 150));
    }

    // translucent SIEMPRE antes de setHidden con edge-to-edge
    StatusBar.setTranslucent(true);
    StatusBar.setHidden(true, 'fade');

    // Segunda pasada sin animación para cubrir el layout pass tardío
    await new Promise(r => setTimeout(r, 80));
    StatusBar.setHidden(true, 'none');
  } catch (e) {
    console.error('[enterImmersiveMode]', e);
  }
}

async function exitImmersiveMode() {
  try {
    await ScreenOrientation.unlockAsync();

    // Mantener translucent para edge-to-edge
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

// ─────────────────────────────────────────────────────────────────────────────

export const EpisodePlayer: React.FC<EpisodePlayerProps> = ({ url }) => {
  const lastValidUrl = useRef<string | null>(null);
  if (url !== null) lastValidUrl.current = url;
  const activeUrl = lastValidUrl.current;

  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(false);
  const [key, setKey]                   = useState(0);
  const [blockedPopup, setBlockedPopup] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const webViewRef        = useRef<WebView>(null);
  const canGoBackRef      = useRef(false);
  const prevUrlRef        = useRef<string | null>(null);
  const isFullscreenRef   = useRef(false);
  // Guardamos el valor ANTERIOR de isFullscreen para que el efecto sepa
  // exactamente qué transición ocurrió (false→true o true→false).
  const prevFullscreenRef = useRef(false);

  useEffect(() => {
    if (url !== null && url !== prevUrlRef.current) {
      prevUrlRef.current = url;
      setError(false);
      setLoading(true);
      setKey(k => k + 1);
    }
  }, [url]);

  useEffect(() => {
    isFullscreenRef.current = isFullscreen;
  }, [isFullscreen]);

  // ── Gestionar immersive mode al cambiar fullscreen ────────────────────────
  // Usamos dos efectos separados con responsabilidades claras:
  //   1. Efecto de mount/unmount: solo para cleanup al desmontar el componente.
  //   2. Efecto de isFullscreen: reacciona a cambios, pero ignora el primer render.
  useEffect(() => {
    // Cleanup al desmontar el componente: restaurar siempre el sistema.
    return () => {
      exitImmersiveMode();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // En el PRIMER render isFullscreen=false — no hacer nada todavía.
    // prevFullscreenRef arranca en false, así que la transición false→false
    // (primer render) no dispara exit ni enter.
    const wasFullscreen = prevFullscreenRef.current;
    prevFullscreenRef.current = isFullscreen;

    if (isFullscreen && !wasFullscreen) {
      // false → true: entrar en immersive
      enterImmersiveMode();
    } else if (!isFullscreen && wasFullscreen) {
      // true → false: salir de immersive
      exitImmersiveMode();
    }
    // false → false (primer render) y true → true: no hacer nada.

    // SIN cleanup aquí: si limpiamos en el return, el efecto anterior
    // (wasFullscreen=false) llamaría exitImmersiveMode justo después de que
    // el nuevo efecto (isFullscreen=true) llamó enterImmersiveMode,
    // cancelando el keep awake y la orientación landscape.
  }, [isFullscreen]);

  // ── Hardware back button ──────────────────────────────────────────────────
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isFullscreenRef.current) {
        webViewRef.current?.injectJavaScript(
          '(document.exitFullscreen || document.webkitExitFullscreen || function(){}).call(document); true;'
        );
        return true;
      }
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
    setKey(k => k + 1);
  };

  const showBlocked = useCallback(() => {
    setBlockedPopup(true);
    setTimeout(() => setBlockedPopup(false), 1500);
  }, []);

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'fullscreen') {
        setIsFullscreen(data.value);
      }
    } catch (_) {}
  }, []);

  if (!activeUrl) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    // Cuando está en fullscreen, expandimos el contenedor para cubrir toda la pantalla
    <View style={[styles.container, isFullscreen && styles.containerFullscreen]}>
      <WebView
        key={key}
        ref={webViewRef}
        source={{ uri: activeUrl }}
        style={styles.webview}

        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}

        userAgent={USER_AGENT}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled={false}
        mixedContentMode="always"
        cacheEnabled
        setSupportMultipleWindows={false}
        originWhitelist={['*']}
        injectedJavaScriptBeforeContentLoaded={ANTI_AD_SCRIPT}

        onMessage={handleMessage}

        onOpenWindow={(syntheticEvent) => {
          console.log('[BLOQUEADO onOpenWindow]', syntheticEvent.nativeEvent.targetUrl);
          showBlocked();
        }}

        onShouldStartLoadWithRequest={(req) => {
          const { url: reqUrl, navigationType, isTopFrame } = req;
          if (reqUrl === activeUrl) return true;
          if (reqUrl.match(/\.(mp4|m3u8|webm|ogg|ts)(\?|$)/i)) return true;
          if (reqUrl.startsWith('blob:') || reqUrl.startsWith('data:')) return true;
          if (isTopFrame && !isAllowedUrl(reqUrl)) {
            console.log('[BLOQUEADO top-frame]', reqUrl);
            showBlocked();
            return false;
          }
          if (navigationType === 'click' && !isAllowedUrl(reqUrl)) {
            console.log('[BLOQUEADO click]', reqUrl);
            showBlocked();
            return false;
          }
          return true;
        }}

        onNavigationStateChange={(nav) => {
          canGoBackRef.current = nav.canGoBack;
          if (
            nav.url !== activeUrl &&
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

      {loading && !error && (
        <View style={[styles.overlay, styles.centered]} pointerEvents="none">
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Cargando reproductor...</Text>
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
  // En fullscreen: ocupa toda la pantalla ignorando insets
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