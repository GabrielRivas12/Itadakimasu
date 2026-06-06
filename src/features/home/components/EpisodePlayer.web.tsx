import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';

interface EpisodePlayerProps {
  url: string | null;
}

// ─── Palabras clave que identifican overlays falsos ───────────────────────────
const AD_OVERLAY_KEYWORDS = [
  'robot', 'captcha', 'verif', 'confirm', 'click to continue',
  'haz clic', 'no soy un robot', 'allow', 'subscribe', 'notification',
  'continuar', 'continue', 'press', 'skip ad', 'close ad',
];

// Script que se inyecta dentro del iframe via srcdoc proxy o postMessage
// Elimina overlays falsos por texto y por estructura visual
const IFRAME_CLEANER_SCRIPT = `
(function() {
  function isAdOverlay(el) {
    if (!el || !el.tagName) return false;
    const style = window.getComputedStyle(el);
    // Debe ser un elemento posicionado encima del contenido
    const isOverlay = (style.position === 'absolute' || style.position === 'fixed')
                   && parseInt(style.zIndex || '0') > 1
                   && style.display !== 'none';
    if (!isOverlay) return false;

    // Verificar por texto sospechoso
    const text = (el.innerText || el.textContent || '').toLowerCase();
    const keywords = ${JSON.stringify(AD_OVERLAY_KEYWORDS)};
    const hasAdText = keywords.some(k => text.includes(k));

    // Verificar si contiene un link externo (el botón "No soy un robot")
    const hasExternalLink = Array.from(el.querySelectorAll('a')).some(a => {
      const href = a.getAttribute('href') || '';
      return href.startsWith('http') && !href.includes(window.location.hostname);
    });

    return hasAdText || hasExternalLink;
  }

  function removeAdOverlays() {
    // Buscar en todos los elementos del DOM
    const allEls = document.querySelectorAll('div, section, aside, article');
    allEls.forEach(el => {
      if (isAdOverlay(el)) {
        console.log('[AntiAd] Eliminando overlay:', el.className, el.innerText?.slice(0, 50));
        el.style.display = 'none';
        try { el.remove(); } catch(e) {}
      }
    });
  }

  // Correr inmediatamente
  removeAdOverlays();

  // MutationObserver: eliminar overlays que se inyectan dinámicamente
  const observer = new MutationObserver(function(mutations) {
    let shouldClean = false;
    mutations.forEach(m => {
      if (m.addedNodes.length > 0) shouldClean = true;
    });
    if (shouldClean) removeAdOverlays();
  });
  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Bloquear window.open y redirecciones
  window.open = function() { return null; };
  try { Object.defineProperty(window, 'open', { value: function(){ return null; }, writable: false }); } catch(e) {}
  var _noop = function() { return false; };
  try { window.location.assign  = _noop; } catch(e) {}
  try { window.location.replace = _noop; } catch(e) {}

  console.log('[AntiAd] Cleaner activo en iframe.');
})();
`;

export const EpisodePlayer: React.FC<EpisodePlayerProps> = ({ url }) => {
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const iframeRef             = useRef<HTMLIFrameElement>(null);
  const blockedTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanerIntervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (blockedTimerRef.current)    clearTimeout(blockedTimerRef.current);
      if (cleanerIntervalRef.current) clearInterval(cleanerIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (url) setLoading(true);
  }, [url]);

  const showBlocked = useCallback(() => {
    setBlocked(true);
    if (blockedTimerRef.current) clearTimeout(blockedTimerRef.current);
    blockedTimerRef.current = setTimeout(() => setBlocked(false), 1500);
  }, []);

  // ── Inyectar el cleaner dentro del iframe ──────────────────────────────────
  // Solo funciona si el iframe es same-origin. Si es cross-origin, el sandbox
  // + interceptación de clicks es la defensa.
  const injectCleaner = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iDoc || !iDoc.body) return;
      // Evitar inyectar dos veces
      if ((iDoc as any).__cleanerInjected) return;
      (iDoc as any).__cleanerInjected = true;

      const script = iDoc.createElement('script');
      script.textContent = IFRAME_CLEANER_SCRIPT;
      (iDoc.head || iDoc.documentElement).appendChild(script);
      console.log('[EpisodePlayer] Cleaner inyectado en iframe');
    } catch (e) {
      // cross-origin: ignorar, el sandbox y el escudo de clicks hacen el trabajo
    }
  }, []);

  const handleIframeLoad = useCallback(() => {
    setLoading(false);
    injectCleaner();

    // Re-inyectar cada 2s por si el player recarga su contenido internamente
    if (cleanerIntervalRef.current) clearInterval(cleanerIntervalRef.current);
    cleanerIntervalRef.current = setInterval(injectCleaner, 2000);

    // Detener después de 30s (el video ya debería estar corriendo)
    setTimeout(() => {
      if (cleanerIntervalRef.current) clearInterval(cleanerIntervalRef.current);
    }, 30000);
  }, [injectCleaner]);

  // ── Escudo de clicks: intercepta TODOS los clicks sobre el iframe ──────────
  // A diferencia de la versión anterior, este escudo NO se desactiva solo.
  // Cada click es evaluado: si cae sobre un elemento sospechoso lo bloquea,
  // si cae sobre el video/player lo pasa al iframe.
  const handleShieldClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const rect = iframe.getBoundingClientRect();
      const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iDoc) {
        // cross-origin: no podemos inspeccionar, pasar el click directamente
        // removiendo el escudo temporalmente
        (e.currentTarget as HTMLDivElement).style.pointerEvents = 'none';
        setTimeout(() => {
          (e.currentTarget as HTMLDivElement).style.pointerEvents = 'auto';
        }, 200);
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

      // Detectar si el elemento clickeado es un overlay falso
      const isExternalLink = href.startsWith('http') && !href.includes(iframeHost);
      const isAdText       = AD_OVERLAY_KEYWORDS.some(k => text.includes(k));
      const isAdElement    = isExternalLink || (isAdText && tag !== 'VIDEO');

      if (isAdElement) {
        // Bloquear + intentar eliminar el overlay padre
        showBlocked();
        let node: HTMLElement | null = el;
        for (let i = 0; i < 6 && node; i++) {
          const s = window.getComputedStyle(node);
          if (s.position === 'absolute' || s.position === 'fixed') {
            node.style.display = 'none';
            try { node.remove(); } catch(_) {}
            break;
          }
          node = node.parentElement;
        }
      } else {
        // Click legítimo: pasarlo al elemento real
        el.click();
      }
    } catch (err) {
      // cross-origin: bajar el escudo momentáneamente para que el click pase
      (e.currentTarget as HTMLDivElement).style.pointerEvents = 'none';
      setTimeout(() => {
        if (e.currentTarget) {
          (e.currentTarget as HTMLDivElement).style.pointerEvents = 'auto';
        }
      }, 150);
    }
  }, [showBlocked]);

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
          <Text style={styles.shieldIcon}>🛡️</Text>
          <Text style={styles.blockedText}>Anuncio bloqueado</Text>
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
  blockedOverlay: { backgroundColor: 'rgba(0,0,0,0.90)' },
  shieldIcon:   { fontSize: 28 },
  blockedText:  { color: '#10b981', fontSize: 14, fontWeight: 'bold' },
});