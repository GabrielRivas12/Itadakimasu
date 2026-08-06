import Hls from 'hls.js';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { resolveAnime1VStream, buildVideoProxyUrl, isValidMediaUrl } from '../../../../services/anime1v';

interface EpisodePlayerProps {
  url: string | null;
}

const AD_OVERLAY_KEYWORDS = [
  'robot', 'captcha', 'verif', 'confirm', 'click to continue',
  'haz clic', 'no soy un robot', 'allow', 'subscribe', 'notification',
  'continuar', 'continue', 'press', 'skip ad', 'close ad', 'play',
  'reproducir', 'descargar', 'download', 'start', 'iniciar',
  '¡La Vida Es Más Divertida!', 'watch', 'ver', 'loading', 'cargando',
];

const MP4UPLOAD_AD_SELECTORS = [
  '[style*="z-index: 2147483647"]',
  '[style*="z-index:2147483647"]',
  '[style*="z-index: 2147483646"]',
  '#ad-layer', '#ad_layer', '.ad-layer', '.ad_layer',
  '#ads-overlay', '.ads-overlay',
  '#pop-overlay', '.pop-overlay', '.pop_overlay',
  '#banner', '.banner-ad', '.ad-banner',
  'iframe[src*="adserver"]', 'iframe[src*="googlesyndication"]',
  'iframe[src*="doubleclick"]', 'iframe[src*="adsystem"]',
  'iframe[src*="amazon-adsystem"]', 'iframe[src*="adnxs"]',
  'iframe[src*="moatads"]', 'iframe[src*="openx"]',
  'script[src*="popunder"]', 'script[src*="popcash"]',
  'script[src*="adcash"]', 'script[src*="exoclick"]',
  'script[src*="trafficjunky"]', 'script[src*="hilltopads"]',
  '.jw-overlays', '#jw-overlays',
  'a[href*="mp4upload"][target="_blank"]',
  'a[href*="go.php"]', 'a[href*="out.php"]', 'a[href*="click.php"]',
  'div[onclick*="open"]', 'div[onclick*="window.open"]',
  '#overlay_container', '.overlay_container',
  '#pre-overlay', '.pre-overlay',
  '.advertisement', '#advertisement', '[id*="google_ads"]',
  '[class*="google-ad"]', '[id*="div-gpt-ad"]',
  '.leaderboard', '.skyscraper', '.interstitial',
];

const buildCleanerScript = (adKeywords: string[], adSelectors: string[]) => `
(function() {
  if (window.__antiAdInjected) return;
  window.__antiAdInjected = true;
  const AD_KEYWORDS = ${JSON.stringify(adKeywords)};
  const AD_SELECTORS = ${JSON.stringify(adSelectors)};
  const noop = () => ({ focus: () => {}, close: () => {} });
  window.open = noop;
  try { Object.defineProperty(window, 'open', { value: noop, writable: false, configurable: false }); } catch(_) {}
  const _pushState    = history.pushState.bind(history);
  const _replaceState = history.replaceState.bind(history);
  Object.defineProperty(window, 'location', {
    get: () => window._safeLocation || location,
    set: (v) => { console.warn('[AntiAd] location redirect bloqueado:', v); },
    configurable: true,
  });
  document.write    = () => {};
  document.writeln  = () => {};
  const origAddEvent = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, listener, opts) {
    if (type === 'click' || type === 'mousedown' || type === 'touchstart') {
      const wrapped = function(e) {
        try {
          const fnStr = listener.toString();
          if (/window\\.open|location\\.href|popup|popunder/i.test(fnStr)) {
            e.stopImmediatePropagation();
            return;
          }
        } catch(_) {}
        return listener.apply(this, arguments);
      };
      return origAddEvent.call(this, type, wrapped, opts);
    }
    return origAddEvent.call(this, type, listener, opts);
  };
  function removeBySelectors() {
    AD_SELECTORS.forEach(sel => {
      try {
        document.querySelectorAll(sel).forEach(el => {
          el.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;';
          try { el.remove(); } catch(_) {}
        });
      } catch(_) {}
    });
  }
  function isAdOverlay(el) {
    if (!el || !el.tagName || el.tagName === 'VIDEO' || el.tagName === 'HTML' || el.tagName === 'BODY') return false;
    const style = window.getComputedStyle(el);
    const pos   = style.position;
    const zi    = parseInt(style.zIndex || '0', 10);
    if (pos !== 'absolute' && pos !== 'fixed') return false;
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const bigW = el.offsetWidth  > window.innerWidth  * 0.4;
    const bigH = el.offsetHeight > window.innerHeight * 0.4;
    if (zi > 100 && bigW && bigH) {
      const text = (el.innerText || el.textContent || '').toLowerCase().trim();
      const hasKw = AD_KEYWORDS.some(k => text.includes(k));
      const hasExtLink = Array.from(el.querySelectorAll('a')).some(a => {
        const href = a.getAttribute('href') || '';
        return href.startsWith('http') && !href.includes(window.location.hostname);
      });
      if (hasKw || hasExtLink || text.length === 0) return true;
    }
    const bg = style.backgroundColor;
    const op = parseFloat(style.opacity);
    const isTransparent = op < 0.05 || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent';
    if (isTransparent && bigW && bigH && pos === 'absolute') return true;
    return false;
  }
  function removeAdOverlays() {
    document.querySelectorAll('div,section,aside,article,a,center,span,table').forEach(el => {
      if (isAdOverlay(el)) {
        el.style.cssText = 'display:none!important;';
        try { el.remove(); } catch(_) {}
      }
    });
  }
  function blockAdIframes() {
    document.querySelectorAll('iframe').forEach(fr => {
      const src = fr.src || fr.getAttribute('src') || '';
      const adSrcPatterns = [
        'googlesyndication','doubleclick','adserver','exoclick',
        'trafficjunky','hilltopads','popcash','adcash','openx',
        'adnxs','moatads','amazon-adsystem','adsystem','popunder',
      ];
      if (adSrcPatterns.some(p => src.includes(p))) {
        fr.style.cssText = 'display:none!important;';
        try { fr.remove(); } catch(_) {}
      }
    });
  }
  const observer = new MutationObserver(() => {
    removeBySelectors();
    removeAdOverlays();
    blockAdIframes();
  });
  function startObserver() {
    const root = document.body || document.documentElement;
    if (root) {
      observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['style','class'] });
    }
  }
  const origCreateElement = document.createElement.bind(document);
  document.createElement = function(tag) {
    const el = origCreateElement(tag);
    if (tag.toLowerCase() === 'script') {
      const origSetAttribute = el.setAttribute.bind(el);
      el.setAttribute = function(name, value) {
        if (name === 'src') {
          const adScriptPatterns = ['popunder','popcash','adcash','exoclick','trafficjunky','hilltopads'];
          if (adScriptPatterns.some(p => value.includes(p))) {
            console.warn('[AntiAd] Script de anuncio bloqueado:', value);
            return;
          }
        }
        return origSetAttribute(name, value);
      };
    }
    return el;
  };
  removeBySelectors();
  removeAdOverlays();
  blockAdIframes();
  startObserver();
  setInterval(() => {
    removeBySelectors();
    removeAdOverlays();
    blockAdIframes();
  }, 800);
  console.log('[AntiAd] v2 — Protección completa activa.');
})();
`;

const IFRAME_CLEANER_SCRIPT = buildCleanerScript(AD_OVERLAY_KEYWORDS, MP4UPLOAD_AD_SELECTORS);

function buildProxySrcdoc(targetUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#000; width:100vw; height:100vh; overflow:hidden; }
  iframe { width:100%; height:100%; border:none; display:block; }
</style>
<script>
${IFRAME_CLEANER_SCRIPT}
</script>
</head>
<body>
<iframe
  src="${targetUrl}"
  sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowfullscreen
></iframe>
</body>
</html>`;
}

type PlayerState = 'loading' | 'stream_ready' | 'iframe' | 'error';

export const EpisodePlayer: React.FC<EpisodePlayerProps> = ({ url }) => {
  const [playerState, setPlayerState] = useState<PlayerState>('loading');
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'hls' | 'mp4' | null>(null);
  const [resolving, setResolving] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const blockedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shieldRef = useRef<HTMLDivElement>(null);

  const [blocked, setBlocked] = useState(false);
  const [forceLoadIframe, setForceLoadIframe] = useState(false);

  const isMp4Upload = url?.toLowerCase().includes('mp4upload') ?? false;
  const isMega = (url?.toLowerCase().includes('mega.nz') || url?.toLowerCase().includes('mega.co.nz')) ?? false;
  const isAndroid = typeof window !== 'undefined' && /Android/i.test(navigator.userAgent);
  const showMegaAndroidUI = isMega && isAndroid && !forceLoadIframe;

  /* ---------- helpers ---------- */

  const stopHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  const stopVideo = useCallback(() => {
    stopHls();
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
  }, [stopHls]);

  const showBlocked = useCallback(() => {
    setBlocked(true);
    if (blockedTimerRef.current) clearTimeout(blockedTimerRef.current);
    blockedTimerRef.current = setTimeout(() => setBlocked(false), 1500);
  }, []);

  /* ---------- effects ---------- */

  useEffect(() => {
    if (!url) {
      setResolving(false);
      setPlayerState('loading');
      return;
    }

    const lowerUrl = url.toLowerCase();
    const isHls = lowerUrl.endsWith('.m3u8') || lowerUrl.includes('.m3u8?');
    const isMp4 = lowerUrl.endsWith('.mp4') || lowerUrl.includes('.mp4?');

    if (isHls || isMp4) {
      setResolving(false);
      setStreamUrl(url);
      setMediaType(isHls ? 'hls' : 'mp4');
      setPlayerState('stream_ready');
      return;
    }

    let cancelled = false;
    setResolving(true);

    resolveAnime1VStream(url)
      .then((res) => {
        if (cancelled) return;
        if (res?.success && res.streamUrl && (res.mediaType === 'hls' || res.mediaType === 'mp4') && isValidMediaUrl(res.streamUrl)) {
          if (res.mediaType === 'hls') {
            setStreamUrl(buildVideoProxyUrl(res.streamUrl));
            setMediaType('hls');
          } else {
            setStreamUrl(res.streamUrl);
            setMediaType('mp4');
          }
          setPlayerState('stream_ready');
        } else {
          setPlayerState('iframe');
        }
      })
      .catch(() => {
        if (!cancelled) setPlayerState('iframe');
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  /* Iniciar reproductor cuando stream_ready */
  useEffect(() => {
    if (playerState !== 'stream_ready' || !streamUrl || !videoRef.current) return;

    console.log('[EpisodePlayer] stream_ready effect:', { mediaType, hasVideo: !!videoRef.current, url: streamUrl.substring(0, 80) });
    stopHls();

    if (mediaType === 'hls') {
      if (Hls.isSupported()) {
        const hls = new Hls({
          maxMaxBufferLength: 30,
          enableWorker: true,
          manifestLoadingMaxRetry: 3,
          levelLoadingMaxRetry: 3,
          fragLoadingMaxRetry: 3,
        });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('[EpisodePlayer] HLS MANIFEST_PARSED, playing...');
          videoRef.current?.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          console.warn('[EpisodePlayer] HLS error:', data.type, data.details, data.fatal ? 'FATAL' : 'non-fatal');
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              console.warn('[EpisodePlayer] HLS network error, attempting retry...');
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              console.warn('[EpisodePlayer] HLS media error, attempting recovery...');
              hls.recoverMediaError();
            } else {
              console.error('[EpisodePlayer] HLS unrecoverable error, falling back to iframe');
              hls.destroy();
              hlsRef.current = null;
              setPlayerState('iframe');
            }
          }
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = streamUrl;
      }
    } else {
      const vid = videoRef.current;
      const onError = () => {
        console.warn('[EpisodePlayer] Video error, details:', vid.error?.code, vid.error?.message);
        setPlayerState('iframe');
      };
      vid.addEventListener('error', onError);
      vid.src = streamUrl;
      vid.load();
      vid.play().catch(() => {});
      return () => {
        vid.removeEventListener('error', onError);
      };
    }
  }, [playerState, streamUrl, mediaType, stopHls]);

  /* cleanup on unmount */
  useEffect(() => () => {
    stopVideo();
    if (blockedTimerRef.current) clearTimeout(blockedTimerRef.current);
    if (cleanerIntervalRef.current) clearInterval(cleanerIntervalRef.current);
  }, [stopVideo]);

  /* ---------- iframe ad-block ---------- */

  const injectCleaner = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const iDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
      if (!iDoc?.body) return;
      if ((iDoc as any).__antiAdInjected) return;
      const script = iDoc.createElement('script');
      script.textContent = IFRAME_CLEANER_SCRIPT;
      (iDoc.head ?? iDoc.documentElement).appendChild(script);
    } catch (_) {}
  }, []);

  const handleIframeLoad = useCallback(() => {
    injectCleaner();
    if (!isMp4Upload) return;
    if (cleanerIntervalRef.current) clearInterval(cleanerIntervalRef.current);
    cleanerIntervalRef.current = setInterval(injectCleaner, 1000);
    setTimeout(() => {
      if (cleanerIntervalRef.current) clearInterval(cleanerIntervalRef.current);
    }, 60_000);
  }, [injectCleaner, isMp4Upload]);

  const handleShieldClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const rect = iframe.getBoundingClientRect();
      const iDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
      if (!iDoc) {
        const shield = e.currentTarget as HTMLDivElement;
        shield.style.pointerEvents = 'none';
        setTimeout(() => { shield.style.pointerEvents = 'auto'; }, isMp4Upload ? 60 : 140);
        return;
      }
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      const el = iDoc.elementFromPoint(relX, relY) as HTMLElement | null;
      if (!el) return;
      const tag = el.tagName.toUpperCase();
      const href = (el as HTMLAnchorElement).href || '';
      const text = (el.innerText || el.textContent || '').toLowerCase();
      const iHost = (iframe.src || '').split('/').slice(0, 3).join('/');
      const isExtLink = href.startsWith('http') && !href.includes(iHost);
      const isAdText = AD_OVERLAY_KEYWORDS.some(k => text.includes(k));
      const isVideo = tag === 'VIDEO' || tag === 'HTML' || tag === 'BODY';
      const isAd = isExtLink || (isAdText && !isVideo);
      if (isAd) {
        showBlocked();
        let node: HTMLElement | null = el;
        for (let i = 0; i < 10 && node; i++) {
          const s = window.getComputedStyle(node);
          const zi = parseInt(s.zIndex || '0', 10);
          if (s.position === 'absolute' || s.position === 'fixed' || zi > 100) {
            node.style.cssText = 'display:none!important;';
            try { node.remove(); } catch (_) { }
            break;
          }
          node = node.parentElement;
        }
      } else {
        el.click();
      }
    } catch (_) {
      const shield = e.currentTarget as HTMLDivElement;
      shield.style.pointerEvents = 'none';
      setTimeout(() => { shield.style.pointerEvents = 'auto'; }, isMp4Upload ? 60 : 140);
    }
  }, [showBlocked, isMp4Upload]);

  useEffect(() => {
    if (!isMp4Upload) return;
    const handler = (e: MessageEvent) => {
      const data = typeof e.data === 'string' ? e.data : JSON.stringify(e.data ?? '');
      if (/window\.open|location\.href|popup|redirect|popunder/i.test(data)) {
        showBlocked();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [showBlocked, isMp4Upload]);

  useEffect(() => {
    if (!isMp4Upload) return;
    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      if (anchor && anchor.target === '_blank') {
        const href = anchor.href || '';
        if (url && !href.includes(new URL(url).hostname)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          showBlocked();
        }
      }
    };
    document.addEventListener('click', handleDocClick, true);
    return () => document.removeEventListener('click', handleDocClick, true);
  }, [isMp4Upload, url, showBlocked]);

  /* ---------- render ---------- */

  if (!url) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  /* Mega en Android */
  if (showMegaAndroidUI) {
    const handleOpenMega = () => {
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    };
    return (
      <View style={[styles.container, styles.megaContainer]}>
        <View style={styles.megaGlassCard}>
          <svg width="64" height="64" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: 16 }}>
            <circle cx="50" cy="50" r="50" fill="url(#megaGrad)" />
            <path d="M25 70V30L50 50L75 30V70H63V48L50 58L37 48V70H25Z" fill="white" />
            <defs>
              <linearGradient id="megaGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ff4e50" />
                <stop offset="1" stopColor="#f9d423" />
              </linearGradient>
            </defs>
          </svg>
          <Text style={styles.megaTitle}>Servidor MEGA Detectado</Text>
          <Text style={styles.megaDescription}>
            Para reproducir este video en Android con la mejor calidad y sin restricciones de navegación, te recomendamos abrir el enlace externo en la aplicación oficial de MEGA o en tu navegador.
          </Text>
          <TouchableOpacity style={styles.megaButton} onPress={handleOpenMega} activeOpacity={0.8}>
            <Text style={styles.megaButtonText}>ABRIR EN MEGA</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.megaSecondaryButton} onPress={() => setForceLoadIframe(true)} activeOpacity={0.7}>
            <Text style={styles.megaSecondaryButtonText}>Intentar reproducir en el navegador</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* Resolviendo URL embed -> stream directo */
  if (resolving) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.statusText}>Extrayendo video directo...</Text>
      </View>
    );
  }

  /* Stream directo resuelto (HLS o MP4) */
  if (playerState === 'stream_ready' && streamUrl) {
    return (
      <View style={styles.container}>
        <video
          ref={videoRef}
          style={videoStyles.element}
          controls
          playsInline
          autoPlay
        />
      </View>
    );
  }

  /* Iframe (fallback) */
  return (
    <View style={styles.container}>
      <iframe
        ref={iframeRef}
        src={url}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        title="Anime Video Player"
        style={iframeStyles.iframe}
        onLoad={handleIframeLoad}
      />

      {playerState === 'loading' && (
        <View style={[styles.overlay, styles.centered]} {...{ pointerEvents: 'none' }}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      )}

      {blocked && (
        <View style={[styles.blockedBadge]} {...{ pointerEvents: 'none' }} />
      )}
    </View>
  );
};

const videoStyles: Record<string, React.CSSProperties> = {
  element: {
    width: '100%',
    height: '100%',
    display: 'block',
    backgroundColor: '#000',
  },
};

const iframeStyles: Record<string, React.CSSProperties> = {
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    display: 'block',
    backgroundColor: '#000',
  },
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative' as any,
  },
  megaContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#070a13',
    padding: 24,
  },
  megaGlassCard: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 24,
    alignItems: 'center',
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    // @ts-ignore
    backdropFilter: 'blur(16px)',
  },
  megaTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  megaDescription: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  megaButton: {
    width: '100%',
    backgroundColor: '#ff4b4b',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#ff4b4b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  megaButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  megaSecondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  megaSecondaryButtonText: {
    color: '#94a3b8',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  overlay: {
    position: 'absolute' as any,
    top: 0, left: 0, right: 0, bottom: 0,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12 as any,
  },
  statusText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  blockedBadge: {
    position: 'absolute' as any,
    bottom: 12,
    left: '50%',
    transform: [{ translateX: -80 }] as any,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  blockedText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
