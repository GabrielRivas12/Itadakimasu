import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Video, {
  ReactVideoSource,
  SelectedTrack,
  SelectedTrackType,
  TextTrackType,
} from 'react-native-video';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import { buildSubtitlesProxyUrl } from '../../../../services/anime1v';

export type SubtitleInput =
  | string
  | {
      url?: string;
      uri?: string;
      label?: string;
      title?: string;
      language?: string;
      lang?: string;
      default?: boolean;
      isDefault?: boolean;
    };

export interface SubtitleTrack {
  title: string;
  language: string;
  uri: string;
  isDefault: boolean;
}

export interface CustomVideoPlayerRef {
  play: () => void;
  pause: () => void;
  seek: (timeInSeconds: number) => void;
  selectTrack: (index: number) => void; // -1 = desactivar
  toggleSubtitles: () => void;
  getTracks: () => SubtitleTrack[];
  presentFullscreen: () => void;
  dismissFullscreen: () => void;
  toggleFullscreen: () => void;
}

export interface CustomVideoPlayerProps {
  videoUrl?: string | null;
  url?: string | null;
  source?: ReactVideoSource;
  headers?: Record<string, string>;
  poster?: string;
  title?: string;

  // Subtítulos VTT externos (se pasan directo al player nativo)
  vttUrl?: string | string[];
  subtitleUrl?: string;
  subtitles?: SubtitleInput[] | SubtitleInput;
  defaultSubtitleLanguage?: string;
  defaultSubtitleIndex?: number;
  subtitlesEnabled?: boolean;
  subtitleFontSize?: number; // tamaño del texto (nativo en Android / overlay JS)
  /**
   * 'auto'  : intenta nativo; si el player no detecta las pistas, usa render JS (recomendado)
   * 'native': solo nativo
   * 'js'    : siempre render JS (descarga el VTT y lo dibuja sobre el video)
   */
  subtitleRenderMode?: 'auto' | 'native' | 'js';
  /**
   * true = saltar el proxy de subtítulos del backend y usar la URL cruda
   * (.srt/.vtt del CDN). Útil para HentaiLA: htstreaming.com se descarga
   * directo y el render JS convierte SRT a VTT on-the-fly.
   */
  bypassSubtitleProxy?: boolean;
  /** URL base del backend, ej. https://mi-api.com (necesaria si los subtítulos vienen como ruta relativa /api/...) */
  apiBaseUrl?: string;

  showSubtitleMenu?: boolean; // botón CC mínimo para elegir pista

  /** Controles propios (play/pausa, barra, fullscreen). El fullscreen es un Modal propio para que los subtítulos se vean. */
  controls?: boolean;
  paused?: boolean;
  autoPlay?: boolean;
  repeat?: boolean;
  muted?: boolean;
  volume?: number;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'none';

  onLoad?: (data: any) => void;
  onProgress?: (p: any) => void;
  onError?: (msg: string) => void;
  onRetry?: () => void;
  onSubtitleTrackChange?: (track: SubtitleTrack | null, index: number) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;

  style?: StyleProp<ViewStyle>;
}

function formatTime(sec: number): string {
  const t = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? h + ':' : ''}${mm}:${String(s).padStart(2, '0')}`;
}

interface Cue {
  start: number;
  end: number;
  text: string;
}

function parseTimestamp(t: string): number {
  const m = t.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})$/);
  if (!m) return NaN;
  const [, h, mi, se, ms] = m;
  return (h ? Number(h) : 0) * 3600 + Number(mi) * 60 + Number(se) + Number(ms.padEnd(3, '0')) / 1000;
}

function parseVtt(raw: string): Cue[] {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r/g, '');
  const cues: Cue[] = [];
  for (const block of text.split(/\n{2,}/)) {
    const lines = block.split('\n');
    const idx = lines.findIndex((l) => l.includes('-->'));
    if (idx < 0) continue;
    const [a, b] = lines[idx].split('-->');
    const start = parseTimestamp(a);
    const end = parseTimestamp(b.trim().split(/\s+/)[0]);
    if (isNaN(start) || isNaN(end)) continue;
    const body = lines.slice(idx + 1).join('\n').replace(/<[^>]+>/g, '').trim();
    if (body) cues.push({ start, end, text: body });
  }
  return cues;
}

function joinBase(base: string | undefined, path: string): string {
  if (!base) {
    console.warn('[CustomVideoPlayer] Subtítulo con ruta relativa y sin apiBaseUrl:', path);
    return path;
  }
  return `${base.replace(/\/+$/, '')}${path}`;
}

// Convierte lo que devuelve el backend en una URL absoluta que el player nativo pueda descargar.
function resolveSubtitleUri(raw: string, apiBaseUrl?: string, bypassSubtitleProxy?: boolean): string {
  const uri = (raw || '').trim();
  if (!uri) return '';

  // Ruta relativa del backend (/api/v1/anime/subtitles-proxy.vtt?url=...) -> absoluta
  if (uri.startsWith('/')) return joinBase(apiBaseUrl, uri);

  // SRT/ASS absoluto (ej. cdn.htstreaming.com) -> pasar por el proxy que lo convierte a WebVTT
  const alreadyProxied = /subtitles-proxy/i.test(uri);
  if (!bypassSubtitleProxy && !alreadyProxied && /\.(srt|ass)(\?|#|$)/i.test(uri)) {
    const proxied = buildSubtitlesProxyUrl(uri);
    return proxied.startsWith('/') ? joinBase(apiBaseUrl, proxied) : proxied;
  }
  return uri;
}

function normalizeSubtitles(
  vttUrl: CustomVideoPlayerProps['vttUrl'],
  subtitleUrl: string | undefined,
  subtitles: CustomVideoPlayerProps['subtitles'],
  defaultLang: string,
  apiBaseUrl?: string,
  bypassSubtitleProxy?: boolean
): SubtitleTrack[] {
  const out: SubtitleTrack[] = [];
  const push = (rawUri: string, title: string, language: string, isDefault: boolean) => {
    const uri = resolveSubtitleUri(rawUri, apiBaseUrl, bypassSubtitleProxy);
    if (!uri) return;
    out.push({ uri, title, language: language.toLowerCase(), isDefault });
  };

  const vttList = vttUrl ? (Array.isArray(vttUrl) ? vttUrl : [vttUrl]) : [];
  vttList.forEach((u, i) =>
    push(u, vttList.length === 1 ? 'Subtítulos' : `Subtítulos ${i + 1}`, defaultLang, i === 0)
  );

  if (subtitleUrl) push(subtitleUrl, 'Subtítulos', defaultLang, out.length === 0);

  if (subtitles) {
    const arr = Array.isArray(subtitles) ? subtitles : [subtitles];
    arr.forEach((item, i) => {
      if (!item) return;
      if (typeof item === 'string') {
        push(item, `Subtítulos ${i + 1}`, defaultLang, i === 0 && out.length === 0);
      } else {
        const lang = (item.language || item.lang || defaultLang).toLowerCase();
        const label =
          item.label ||
          item.title ||
          (lang === 'es' ? 'Español' : lang === 'en' ? 'Inglés' : lang.toUpperCase());
        push(item.url || item.uri || '', label, lang, Boolean(item.default ?? item.isDefault));
      }
    });
  }
  return out;
}

export const CustomVideoPlayer = forwardRef<CustomVideoPlayerRef, CustomVideoPlayerProps>(
  (
    {
      videoUrl,
      url,
      source,
      headers,
      poster,
      title,
      vttUrl,
      subtitleUrl,
      subtitles,
      defaultSubtitleLanguage = 'es',
      defaultSubtitleIndex,
      subtitlesEnabled = true,
      subtitleFontSize = 16,
      apiBaseUrl,
      subtitleRenderMode = 'auto',
      showSubtitleMenu = true,
      bypassSubtitleProxy = false,
      controls = true,
      paused: externalPaused,
      autoPlay = true,
      repeat = false,
      muted = false,
      volume = 1,
      resizeMode = 'contain',
      onLoad,
      onProgress,
      onError,
      onRetry,
      onSubtitleTrackChange,
      onFullscreenChange,
      style,
    },
    ref
  ) => {
    const videoRef = useRef<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [internalPaused, setInternalPaused] = useState(!autoPlay);
    const [menuOpen, setMenuOpen] = useState(false);
    const lastTrackRef = useRef(0);
    const [useJsSubs, setUseJsSubs] = useState(subtitleRenderMode === 'js');
    const [jsCues, setJsCues] = useState<Cue[][]>([]);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [scrubTime, setScrubTime] = useState<number | null>(null);
    const [barWidth, setBarWidth] = useState(1);
    const scrubRef = useRef<number | null>(null);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isFullscreenRef = useRef(false);
    const nativeCountRef = useRef(0);
    const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      if (!__DEV__) return;
      try {
        console.log('[RNV]', Platform.OS, 'react-native-video', require('react-native-video/package.json').version);
      } catch {}
    }, []);

    const playbackUri =
      videoUrl ||
      url ||
      (source && typeof source === 'object' && 'uri' in source ? (source as any).uri : null);

    // Pistas calculadas de forma síncrona: ya existen en el primer render,
    // así el source NO cambia después y el video NO se recarga.
    const tracks = useMemo(
      () => {
        const t = normalizeSubtitles(vttUrl, subtitleUrl, subtitles, defaultSubtitleLanguage, apiBaseUrl, bypassSubtitleProxy);
        if (__DEV__) console.log('[CustomVideoPlayer] URIs de subtítulos:', t.map((x) => x.uri));
        return t;
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [JSON.stringify(vttUrl), subtitleUrl, JSON.stringify(subtitles), defaultSubtitleLanguage, apiBaseUrl, bypassSubtitleProxy]
    );

    // Clave de las pistas: si cambian (llegan tarde), se remonta el <Video> para que
    // las pistas entren en el source INICIAL del player nativo.
    const tracksKey = useMemo(() => tracks.map((t) => t.uri).join('|'), [tracks]);
    const lastTimeRef = useRef(0);

    // Diagnóstico (solo dev): verifica que cada VTT responda y empiece con WEBVTT
    useEffect(() => {
      if (!__DEV__) return;
      tracks.forEach(async (t) => {
        try {
          const res = await fetch(t.uri, { headers: headers || {} });
          const body = await res.text();
          console.log(
            `[Subs check] ${t.title} -> HTTP ${res.status} | ${res.headers.get('content-type')} | ` +
              JSON.stringify(body.slice(0, 80))
          );
        } catch (e: any) {
          console.warn(`[Subs check] ${t.title} -> FALLÓ fetch:`, e?.message);
        }
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tracksKey]);

    const initialIndex = useMemo(() => {
      if (!subtitlesEnabled || tracks.length === 0) return -1;
      if (defaultSubtitleIndex !== undefined && tracks[defaultSubtitleIndex]) {
        return defaultSubtitleIndex;
      }
      const byDefault = tracks.findIndex((t) => t.isDefault);
      if (byDefault >= 0) return byDefault;
      const byLang = tracks.findIndex((t) => t.language === defaultSubtitleLanguage.toLowerCase());
      return byLang >= 0 ? byLang : 0;
    }, [tracks, subtitlesEnabled, defaultSubtitleIndex, defaultSubtitleLanguage]);

    // null = "usar el inicial"; número = elección manual del usuario
    const [manualIndex, setManualIndex] = useState<number | null>(null);
    const activeIndex = manualIndex ?? initialIndex;

    const videoSource = useMemo(() => {
      if (!playbackUri) return undefined;
      const base = source && typeof source === 'object' ? (source as any) : {};
      return {
        ...base,
        uri: playbackUri,
        headers: headers || base.headers,
        // al remontar por cambio de pistas, retomar donde iba
        startPosition: lastTimeRef.current > 1 ? Math.floor(lastTimeRef.current * 1000) : undefined,
        type: playbackUri.includes('.m3u8') ? 'm3u8' : base.type,
        textTracks: tracks.map((t) => ({
          title: t.title,
          language: t.language as any,
          type: TextTrackType.VTT,
          uri: t.uri,
        })),
      } as ReactVideoSource;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playbackUri, tracks, isFullscreen, JSON.stringify(headers)]);

    // Si dibujamos en JS, el nativo se desactiva para no duplicar texto
    const selectedTextTrack: SelectedTrack = useMemo(
      () =>
        activeIndex >= 0 && !useJsSubs
          ? { type: SelectedTrackType.INDEX, value: activeIndex }
          : { type: SelectedTrackType.DISABLED },
      [activeIndex, useJsSubs]
    );

    // Al cambiar las pistas: reiniciar detección nativa
    useEffect(() => {
      nativeCountRef.current = 0;
      setJsCues([]);
      setUseJsSubs(subtitleRenderMode === 'js');
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      return () => {
        if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tracksKey, subtitleRenderMode]);

    // Respaldo JS: descargar y parsear los VTT
    useEffect(() => {
      if (!useJsSubs || tracks.length === 0) return;
      let cancelled = false;
      Promise.all(
        tracks.map(async (t) => {
          try {
            const res = await fetch(t.uri, { headers: headers || {} });
            return res.ok ? parseVtt(await res.text()) : [];
          } catch {
            return [];
          }
        })
      ).then((all) => {
        if (!cancelled) setJsCues(all);
      });
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [useJsSubs, tracksKey]);

    const currentCueText = useMemo(() => {
      if (!useJsSubs || activeIndex < 0) return null;
      const cues = jsCues[activeIndex];
      if (!cues) return null;
      const c = cues.find((x) => currentTime >= x.start && currentTime <= x.end);
      return c ? c.text : null;
    }, [useJsSubs, activeIndex, jsCues, currentTime]);

    const selectTrack = useCallback(
      (idx: number) => {
        setManualIndex(idx);
        if (idx >= 0) lastTrackRef.current = idx;
        onSubtitleTrackChange?.(idx >= 0 ? tracks[idx] : null, idx);
        setMenuOpen(false);
      },
      [tracks, onSubtitleTrackChange]
    );

    const toggleSubtitles = useCallback(() => {
      if (activeIndex >= 0) selectTrack(-1);
      else if (tracks.length) selectTrack(Math.min(lastTrackRef.current, tracks.length - 1));
    }, [activeIndex, tracks, selectTrack]);

    isFullscreenRef.current = isFullscreen;

    const paused = externalPaused ?? internalPaused;

    // ---- Fullscreen propio (Modal): los subtítulos viven dentro, así que siempre se ven ----
    const enterFullscreen = useCallback(async () => {
      setIsFullscreen(true);
      onFullscreenChange?.(true);
      StatusBar.setHidden(true, 'fade');
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        if (Platform.OS === 'android') await NavigationBar.setVisibilityAsync('hidden');
      } catch {}
    }, [onFullscreenChange]);

    const exitFullscreen = useCallback(async () => {
      setIsFullscreen(false);
      onFullscreenChange?.(false);
      StatusBar.setHidden(false, 'fade');
      try {
        const { width, height } = Dimensions.get('window');
        if (Math.min(width, height) >= 768) await ScreenOrientation.unlockAsync();
        else await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        if (Platform.OS === 'android') await NavigationBar.setVisibilityAsync('visible');
      } catch {}
    }, [onFullscreenChange]);

    const toggleFullscreen = useCallback(() => {
      if (isFullscreenRef.current) exitFullscreen();
      else enterFullscreen();
    }, [enterFullscreen, exitFullscreen]);

    useEffect(
      () => () => {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        if (isFullscreenRef.current) {
          StatusBar.setHidden(false);
          ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
        }
      },
      []
    );

    // ---- Controles propios ----
    const scheduleHide = useCallback(() => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setShowControls(false), 3500);
    }, []);

    const revealControls = useCallback(() => {
      setShowControls(true);
      scheduleHide();
    }, [scheduleHide]);

    useEffect(() => {
      if (paused) {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        setShowControls(true);
      } else {
        scheduleHide();
      }
    }, [paused, scheduleHide]);

    const togglePlay = () => {
      setInternalPaused(!paused);
      revealControls();
    };

    const seekTo = (t: number) => {
      const clamped = Math.max(0, duration > 0 ? Math.min(t, duration) : t);
      videoRef.current?.seek(clamped);
      lastTimeRef.current = clamped;
      setCurrentTime(clamped);
    };

    const onScrub = (x: number) => {
      const ratio = Math.min(1, Math.max(0, x / barWidth));
      const t = ratio * duration;
      scrubRef.current = t;
      setScrubTime(t);
    };

    const commitScrub = () => {
      if (scrubRef.current !== null) seekTo(scrubRef.current);
      scrubRef.current = null;
      setScrubTime(null);
      revealControls();
    };

    useImperativeHandle(
      ref,
      () => ({
        play: () => setInternalPaused(false),
        pause: () => setInternalPaused(true),
        seek: (t) => videoRef.current?.seek(t),
        selectTrack,
        toggleSubtitles,
        getTracks: () => tracks,
        presentFullscreen: enterFullscreen,
        dismissFullscreen: exitFullscreen,
        toggleFullscreen,
      }),
      [selectTrack, toggleSubtitles, tracks, enterFullscreen, exitFullscreen, toggleFullscreen]
    );

    const renderSurface = (fs: boolean) => {
      const subFont = fs ? Math.round(subtitleFontSize * 1.25) : subtitleFontSize;
      const controlsVisible = controls && showControls && !loading && !error;
      const ccAvailable = showSubtitleMenu && tracks.length > 0;
      const topRowVisible = controlsVisible || (!controls && ccAvailable && !loading && !error);
      const shownTime = scrubTime ?? currentTime;
      const ratio = duration > 0 ? Math.min(1, shownTime / duration) : 0;

      return (
        <View style={fs ? styles.fullscreen : [styles.container, style]}>
          {playbackUri ? (
            <Video
              key={`${tracksKey}|${fs ? 'fs' : 'inline'}`}
              ref={videoRef}
              source={videoSource}
              poster={poster}
              style={styles.video}
              controls={false}
              paused={paused}
              repeat={repeat}
              muted={muted}
              volume={volume}
              resizeMode={resizeMode}
              selectedTextTrack={selectedTextTrack}
              subtitleStyle={{ fontSize: subFont, paddingBottom: fs ? 48 : 24, subtitlesFollowVideo: true }}
              progressUpdateInterval={250}
              onLoadStart={() => {
                setError(null);
                setLoading(true);
              }}
              onLoad={(d) => {
                setLoading(false);
                setDuration(d?.duration || 0);
                onLoad?.(d);
                if (subtitleRenderMode === 'auto' && tracks.length > 0) {
                  if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
                  fallbackTimerRef.current = setTimeout(() => {
                    if (nativeCountRef.current === 0) {
                      console.log('[Subs] El player nativo no detectó pistas -> usando render JS');
                      setUseJsSubs(true);
                    }
                  }, 1500);
                }
              }}
              onProgress={(p) => {
                lastTimeRef.current = p.currentTime;
                if (scrubRef.current === null) setCurrentTime(p.currentTime);
                onProgress?.(p);
              }}
              onEnd={() => {
                if (!repeat) setInternalPaused(true);
                setShowControls(true);
              }}
              onTextTracks={(d) => {
                console.log('[Video] textTracks detectados:', d.textTracks);
                nativeCountRef.current = d.textTracks?.length ?? 0;
                if (nativeCountRef.current > 0 && subtitleRenderMode === 'auto') setUseJsSubs(false);
              }}
              onError={(e) => {
                console.error('[Video error]', e);
                const msg = 'No se pudo reproducir el video.';
                setError(msg);
                setLoading(false);
                onError?.(msg);
              }}
            />
          ) : null}

          {/* Tap sobre el video: mostrar/ocultar controles */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => (showControls ? setShowControls(false) : revealControls())}
          />

          {/* Subtítulos (render JS). Dentro del mismo contenedor => visibles en fullscreen */}
          {currentCueText ? (
            <View
              style={[
                styles.jsSubBox,
                { bottom: controlsVisible ? (fs ? 68 : 58) : fs ? 16 : 14 },
              ]}
              pointerEvents="none"
            >
              <View style={styles.jsSubWrap}>
                {/* Contorno negro: 8 copias desplazadas detrás del texto principal */}
                {[-1.5, 0, 1.5].map((x) =>
                  [-1.5, 0, 1.5].map((y) =>
                    x === 0 && y === 0 ? null : (
                      <Text
                        key={`o-${x}-${y}`}
                        style={[
                          styles.jsSubText,
                          styles.jsSubOutline,
                          {
                            fontSize: subFont,
                            lineHeight: subFont * 1.3,
                            transform: [{ translateX: x }, { translateY: y }],
                          },
                        ]}
                      >
                        {currentCueText}
                      </Text>
                    )
                  )
                )}
                <Text style={[styles.jsSubText, { fontSize: subFont, lineHeight: subFont * 1.3 }]}>
                  {currentCueText}
                </Text>
              </View>
            </View>
          ) : null}

          {controlsVisible && <View style={styles.controlsDim} pointerEvents="none" />}

          {topRowVisible && (
            <View style={[styles.topRow, fs && styles.topRowFs]}>
              {ccAvailable && (
                <TouchableOpacity style={styles.iconBtn} onPress={() => setMenuOpen(true)}>
                  <Ionicons
                    name="logo-closed-captioning"
                    size={20}
                    color={activeIndex >= 0 ? '#a855f7' : '#cbd5e1'}
                  />
                </TouchableOpacity>
              )}
              {controls && (
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => {
                    revealControls();
                    toggleFullscreen();
                  }}
                >
                  <Ionicons name={fs ? 'contract' : 'expand'} size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {controlsVisible && (
            <View style={styles.centerRow} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => {
                  seekTo(lastTimeRef.current - 10);
                  revealControls();
                }}
              >
                <Ionicons name="play-back" size={26} color="#fff" />
                <Text style={styles.skipText}>10</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.playBtn} onPress={togglePlay}>
                <Ionicons name={paused ? 'play' : 'pause'} size={34} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => {
                  seekTo(lastTimeRef.current + 10);
                  revealControls();
                }}
              >
                <Ionicons name="play-forward" size={26} color="#fff" />
                <Text style={styles.skipText}>10</Text>
              </TouchableOpacity>
            </View>
          )}

          {controlsVisible && (
            <View style={[styles.bottomBar, fs && styles.bottomBarFs]}>
              <Text style={styles.timeText}>{formatTime(shownTime)}</Text>
              <View
                style={styles.barTouch}
                onLayout={(e) => setBarWidth(e.nativeEvent.layout.width || 1)}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={(e) => onScrub(e.nativeEvent.locationX)}
                onResponderMove={(e) => onScrub(e.nativeEvent.locationX)}
                onResponderRelease={commitScrub}
                onResponderTerminate={commitScrub}
              >
                <View style={styles.barTrack} pointerEvents="none">
                  <View style={[styles.barFill, { width: `${ratio * 100}%` }]} />
                </View>
                <View
                  pointerEvents="none"
                  style={[styles.thumb, { left: Math.max(0, ratio * barWidth - 7) }]}
                />
              </View>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          )}

          {(loading || !playbackUri) && !error && (
            <View style={[styles.overlay, styles.centered]} pointerEvents="none">
              <ActivityIndicator size="large" color="#8b5cf6" />
              {title ? <Text style={styles.title}>{title}</Text> : null}
            </View>
          )}

          {error && (
            <View style={[styles.overlay, styles.centered]}>
              <Ionicons name="alert-circle-outline" size={40} color="#f43f5e" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => {
                  setError(null);
                  setLoading(true);
                  onRetry?.();
                }}
              >
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          )}

          <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuOpen(false)}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Subtítulos</Text>
                {[{ title: 'Desactivados' }, ...tracks].map((t, i) => {
                  const idx = i - 1;
                  const selected = activeIndex === idx;
                  return (
                    <TouchableOpacity
                      key={`${t.title}-${i}`}
                      style={[styles.option, selected && styles.optionActive]}
                      onPress={() => selectTrack(idx)}
                    >
                      <Text style={[styles.optionText, selected && styles.optionTextActive]}>{t.title}</Text>
                      {selected && <Ionicons name="checkmark-circle" size={18} color="#8b5cf6" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
      );
    };

    return (
      <>
        {/* En fullscreen dejamos un hueco negro para no mover el layout; el Video vive en el Modal */}
        {isFullscreen ? <View style={[styles.container, style]} /> : renderSurface(false)}

        <Modal
          visible={isFullscreen}
          animationType="fade"
          statusBarTranslucent
          supportedOrientations={['landscape', 'landscape-left', 'landscape-right', 'portrait']}
          onRequestClose={exitFullscreen}
        >
          {isFullscreen ? renderSurface(true) : null}
        </Modal>
      </>
    );
  }
);

CustomVideoPlayer.displayName = 'CustomVideoPlayer';

const styles = StyleSheet.create({
  container: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', overflow: 'hidden' },
  fullscreen: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1, backgroundColor: '#000' },
  controlsDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  topRow: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', gap: 8 },
  topRowFs: { top: 24, right: 28 },
  iconBtn: {
    backgroundColor: 'rgba(15,23,42,0.85)',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  centerRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
  },
  playBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(139,92,246,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: { alignItems: 'center', justifyContent: 'center', padding: 6 },
  skipText: { color: '#fff', fontSize: 10, fontWeight: '700', marginTop: -2 },
  bottomBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bottomBarFs: { left: 32, right: 32, bottom: 20 },
  timeText: { color: '#fff', fontSize: 12, fontWeight: '600', minWidth: 38, textAlign: 'center' },
  barTouch: { flex: 1, height: 28, justifyContent: 'center' },
  barTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  barFill: { height: 4, backgroundColor: '#8b5cf6' },
  thumb: {
    position: 'absolute',
    top: 7,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
  },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  centered: { justifyContent: 'center', alignItems: 'center', gap: 12 },
  title: { color: '#e2e8f0', fontSize: 13, fontWeight: '600', paddingHorizontal: 16, textAlign: 'center' },
  errorText: { color: '#94a3b8', fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
  retryBtn: { backgroundColor: '#8b5cf6', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: 'bold' },
  jsSubBox: { position: 'absolute', left: 16, right: 16, bottom: 44, alignItems: 'center' },
  jsSubWrap: { maxWidth: '94%', alignItems: 'center', justifyContent: 'center' },
  jsSubText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700',
  },
  jsSubOutline: {
    position: 'absolute',
    left: 0,
    right: 0,
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#1e293b',
  },
  optionActive: { backgroundColor: 'rgba(139,92,246,0.2)', borderWidth: 1, borderColor: '#8b5cf6' },
  optionText: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
  optionTextActive: { color: '#fff', fontWeight: '700' },
});

export const CustomNativePlayer = CustomVideoPlayer;
export default CustomVideoPlayer;