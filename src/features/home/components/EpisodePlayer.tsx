import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, ActivityIndicator, TouchableOpacity,
  Text, Platform, BackHandler
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

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

  console.log('[AntiAd] Protección cargada.');
})();
true;
`;

export const EpisodePlayer: React.FC<EpisodePlayerProps> = ({ url }) => {
  // FIX PRINCIPAL: en lugar de usar `url` directamente como source del WebView,
  // guardamos la ÚLTIMA url válida (no-null) en una ref. Así, cuando el hook
  // pasa url=null durante la transición entre episodios, el WebView NO se
  // desmonta ni se recarga — sigue mostrando el episodio anterior hasta que
  // llegue la nueva URL real. Esto preserva el wake lock nativo del sistema.
  const lastValidUrl = useRef<string | null>(null);
  if (url !== null) {
    lastValidUrl.current = url;
  }
  const activeUrl = lastValidUrl.current;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [key, setKey] = useState(0);
  const [blockedPopup, setBlockedPopup] = useState(false);

  const webViewRef = useRef<WebView>(null);
  const canGoBackRef = useRef(false);
  const prevUrlRef = useRef<string | null>(null);

  // Cuando llega una URL nueva (distinta a la anterior válida), recargamos el WebView.
  // Pero si url===null es solo una transición temporal, NO hacemos nada.
  useEffect(() => {
    if (url !== null && url !== prevUrlRef.current) {
      prevUrlRef.current = url;
      setError(false);
      setLoading(true);
      setKey(k => k + 1);
    }
  }, [url]);

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
    setKey(k => k + 1);
  };

  const showBlocked = useCallback(() => {
    setBlockedPopup(true);
    setTimeout(() => setBlockedPopup(false), 1500);
  }, []);

  // Sin URL válida aún: spinner inicial
  if (!activeUrl) {
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
        onLoadEnd={() => setLoading(false)}
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
  webview: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)' },
  centered: { justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#94a3b8', fontSize: 14 },
  errorText: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  retryText: { color: '#fff', fontWeight: 'bold' },
  popupNotification: { backgroundColor: 'rgba(0,0,0,0.9)' },
  blockedText: { color: '#10b981', fontSize: 14, fontWeight: 'bold' },
});