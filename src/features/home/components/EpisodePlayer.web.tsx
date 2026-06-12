import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';

interface EpisodePlayerProps {
  url: string | null;
}

// ─── Palabras clave que identifican overlays falsos ───────────────────────────
const AD_OVERLAY_KEYWORDS = [
  'robot', 'captcha', 'verif', 'confirm', 'click to continue',
  'haz clic', 'no soy un robot', 'allow', 'subscribe', 'notification',
  'continuar', 'continue', 'press', 'skip ad', 'close ad', 'play',
  'reproducir', 'descargar', 'download', 'start', 'iniciar',
];

// Script que se inyecta dentro del iframe via srcdoc proxy o postMessage
// Elimina overlays falsos por texto y por estructura visual
const IFRAME_CLEANER_SCRIPT = `
(function() {
  function isAdOverlay(el) {
    if (!el || !el.tagName) return false;
    const style = window.getComputedStyle(el);
    
    // Si es un div gigante transparente o semi-transparente que cubre mucho
    const isBig = el.offsetWidth > window.innerWidth * 0.5 && el.offsetHeight > window.innerHeight * 0.5;
    const isTransparent = parseFloat(style.opacity) < 0.1 || style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.background === 'transparent';
    
    if (isBig && isTransparent && style.position === 'absolute') return true;

    const stylePos = style.position;
    const isOverlay = (stylePos === 'absolute' || stylePos === 'fixed')
                   && parseInt(style.zIndex || '0') > 1
                   && style.display !== 'none';
    if (!isOverlay) return false;

    // Verificar por texto sospechoso
    const text = (el.innerText || el.textContent || '').toLowerCase();
    const keywords = ${JSON.stringify(AD_OVERLAY_KEYWORDS)};
    const hasAdText = keywords.some(k => text.includes(k));

    // Verificar si contiene un link externo
    const hasExternalLink = Array.from(el.querySelectorAll('a')).some(a => {
      const href = a.getAttribute('href') || '';
      return href.startsWith('http') && !href.includes(window.location.hostname);
    });

    return hasAdText || hasExternalLink;
  }

  function removeAdOverlays() {
    const allEls = document.querySelectorAll('div, section, aside, article, a, center');
    allEls.forEach(el => {
      if (isAdOverlay(el)) {
        el.style.display = 'none';
        try { el.remove(); } catch(e) {}
      }
    });
    
    // Específico para MP4Upload: remover overlays conocidos
    if (window.location.hostname.includes('mp4upload')) {
      const ads = document.querySelectorAll('div[style*=\"z-index: 2147483647\"], .ad-overlay, #ad-layer');
      ads.forEach(ad => ad.remove());
    }
  }

  // Correr inmediatamente y con frecuencia
  removeAdOverlays();
  setInterval(removeAdOverlays, 1000);

  const observer = new MutationObserver(removeAdOverlays);
  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Bloquear window.open agresivamente
  window.open = function() { return { focus: function(){} }; };
  try { Object.defineProperty(window, 'open', { value: function(){ return { focus: function(){} }; }, writable: false }); } catch(e) {}
  
  console.log('[AntiAd] Cleaner ultra-agresivo activo.');
})();
`;

export const EpisodePlayer: React.FC<EpisodePlayerProps> = ({ url }) => {
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const iframeRef             = useRef<HTMLIFrameElement>(null);
  const blockedTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanerIntervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMp4Upload           = url?.toLowerCase().includes('mp4upload');

  useEffect(() => {
    return () => {
      if (blockedTimerRef.current)    clearTimeout(blockedTimerRef.current);
      if (cleanerIntervalRef.current) clearInterval(cleanerIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (url) {
      setLoading(true);
      setBlocked(false);
    }
  }, [url]);

  const showBlocked = useCallback(() => {
    setBlocked(true);
    if (blockedTimerRef.current) clearTimeout(blockedTimerRef.current);
    blockedTimerRef.current = setTimeout(() => setBlocked(false), 2000);
  }, []);

  const injectCleaner = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iDoc || !iDoc.body) return;
      if ((iDoc as any).__cleanerInjected) return;
      (iDoc as any).__cleanerInjected = true;

      const script = iDoc.createElement('script');
      script.textContent = IFRAME_CLEANER_SCRIPT;
      (iDoc.head || iDoc.documentElement).appendChild(script);
    } catch (e) {
      // Cross-origin: el sandbox se encarga
    }
  }, []);

  const handleIframeLoad = useCallback(() => {
    setLoading(false);
    injectCleaner();

    if (cleanerIntervalRef.current) clearInterval(cleanerIntervalRef.current);
    cleanerIntervalRef.current = setInterval(injectCleaner, 1500);

    setTimeout(() => {
      if (cleanerIntervalRef.current) clearInterval(cleanerIntervalRef.current);
    }, 45000);
  }, [injectCleaner]);

  const handleShieldClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Si es MP4Upload, somos más cautelosos con los clicks
    if (isMp4Upload) {
      // Los primeros 2 clicks en reproductores gratuitos suelen ser anuncios
      // Aquí intentamos bloquear la apertura de pestañas bajando el escudo muy poco tiempo
      showBlocked();
    }

    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const rect = iframe.getBoundingClientRect();
      const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (!iDoc) {
        // Cross-origin: Bajamos escudo momentáneamente pero notificamos bloqueo
        (e.currentTarget as HTMLDivElement).style.pointerEvents = 'none';
        setTimeout(() => {
          if (e.currentTarget) {
            (e.currentTarget as HTMLDivElement).style.pointerEvents = 'auto';
          }
        }, isMp4Upload ? 80 : 150); // Tiempo más corto para MP4Upload
        return;
      }

      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      const el   = iDoc.elementFromPoint(relX, relY) as HTMLElement | null;

      if (!el) return;

      const tag      = el.tagName;
      const href     = (el as HTMLAnchorElement).href || '';
      const text     = (el.innerText || el.textContent || '').toLowerCase();
      const iframeHost = iframe.src.split('/')[2] ?? '';

      const isExternalLink = href.startsWith('http') && !href.includes(iframeHost);
      const isAdText       = AD_OVERLAY_KEYWORDS.some(k => text.includes(k));
      const isAdElement    = isExternalLink || (isAdText && tag !== 'VIDEO' && tag !== 'HTML');

      if (isAdElement) {
        showBlocked();
        let node: HTMLElement | null = el;
        for (let i = 0; i < 8 && node; i++) {
          const s = window.getComputedStyle(node);
          if (s.position === 'absolute' || s.position === 'fixed' || parseInt(s.zIndex) > 100) {
            node.style.display = 'none';
            try { node.remove(); } catch(_) {}
            break;
          }
          node = node.parentElement;
        }
      } else {
        el.click();
      }
    } catch (err) {
      (e.currentTarget as HTMLDivElement).style.pointerEvents = 'none';
      setTimeout(() => {
        if (e.currentTarget) {
          (e.currentTarget as HTMLDivElement).style.pointerEvents = 'auto';
        }
      }, isMp4Upload ? 80 : 150);
    }
  }, [showBlocked, isMp4Upload]);

  // Escuchar postMessage del iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      const data = typeof e.data === 'string' ? e.data : JSON.stringify(e.data ?? '');
      if (/window\.open|location\.href|popup|redirect/i.test(data)) {
        showBlocked();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [showBlocked]);

  if (!url) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── iframe con sandbox ────────────────────────────────────────────────
          SIN allow-popups         → bloquea window.open
          SIN allow-top-navigation → bloquea location.href = '...'
      ────────────────────────────────────────────────────────────────────── */}
      <iframe
        ref={iframeRef}
        src={url}
        // @ts-ignore
        sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        title="Anime Video Player"
        style={iframeStyles.iframe}
        onLoad={handleIframeLoad}
      />

      {/* ── Escudo permanente ─────────────────────────────────────────────────
          Siempre activo encima del iframe. Evalúa cada click antes de pasarlo.
          En cross-origin se baja 150ms para dejar pasar el click nativo.
      ────────────────────────────────────────────────────────────────────── */}
      {!loading && (
        <div
          onClick={handleShieldClick}
          style={divStyles.shield}
        />
      )}

      {/* Spinner */}
      {loading && (
        <View style={[styles.overlay, styles.centered]} {...{ pointerEvents: 'none' }}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Cargando reproductor...</Text>
        </View>
      )}

      {/* Notificación de bloqueo */}
      {blocked && (
        <View style={[styles.overlay, styles.centered, styles.blockedOverlay]} {...{ pointerEvents: 'none' }}>
        </View>
      )}
    </View>
  );
};

const divStyles: Record<string, React.CSSProperties> = {
  shield: {
    position:   'absolute',
    top:        0,
    left:       0,
    width:      '100%',
    height:     '100%',
    zIndex:     10,
    cursor:     'pointer',
    background: 'transparent',
  },
};

const iframeStyles: Record<string, React.CSSProperties> = {
  iframe: {
    width:           '100%',
    height:          '100%',
    border:          'none',
    display:         'block',
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
    // @ts-ignore
    position: 'relative',
  },
  overlay: {
    // @ts-ignore
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  centered: {
    justifyContent: 'center',
    alignItems:     'center',
    // @ts-ignore
    gap: 12,
  },
  loadingText:  { color: '#94a3b8', fontSize: 14 },
  blockedOverlay: { backgroundColor: 'transparent' },
  shieldIcon:   { fontSize: 28 },
  blockedText:  { color: '#10b981', fontSize: 14, fontWeight: 'bold' },
});