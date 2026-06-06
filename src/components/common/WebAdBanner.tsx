import React, { useState, useEffect, useRef } from 'react';
import { View, Platform, StyleSheet, Animated } from 'react-native';
import { usePathname } from 'expo-router';
import { useResponsive } from '../../hooks/useResponsive';

interface WebAdBannerProps {
  type?: '728x90' | '468x60' | '320x50' | '300x250' | '160x600' | '160x300' | 'auto';
}

const AD_CONFIGS = {
  '728x90': { key: '04d928200e72e6dff1a017e433b845e7', format: 'iframe', height: 90, width: 728 },
  '468x60': { key: 'b35df60e7a73946fc66b968cb3ffab65', format: 'iframe', height: 60, width: 468 },
  '320x50': { key: '16affd95cd1d454da1939142754ae945', format: 'iframe', height: 50, width: 320 },
  '300x250': { key: 'a733bdaf4f27b1ce3ec7f0e5b677918f', format: 'iframe', height: 250, width: 300 },
  '160x600': { key: '7edc83645ddcd205f131887831663d87', format: 'iframe', height: 600, width: 160 },
  '160x300': { key: 'a29019b7212378df11e2dfa350d40ad3', format: 'iframe', height: 300, width: 160 },
};

export function WebAdBanner({ type = 'auto' }: WebAdBannerProps) {
  const pathname = usePathname();
  const { isWeb, isMobile, width: windowWidth } = useResponsive();
  const [isVisible, setIsVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // 1. RECARGA POR NAVEGACIÓN: Refrescar cuando cambia la ruta (pathname)
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [pathname]);

  // 2. RECARGA AUTOMÁTICA (Timer): Refrescar cada 60 segundos (no agresivo)
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 60000); // 60 segundos
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isVisible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [isVisible, refreshKey]);

  // VALIDACIÓN DE PLATAFORMA:
  if (Platform.OS !== 'web') return null;

  let selectedType = type;
  if (type === 'auto') {
    if (windowWidth >= 1024) selectedType = '728x90';
    else if (windowWidth >= 768) selectedType = '468x60';
    else selectedType = '320x50';
  }

  const config = AD_CONFIGS[selectedType as keyof typeof AD_CONFIGS];
  if (!config) return null;

  const adHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: transparent; overflow: hidden; min-height: ${config.height}px; }
        </style>
      </head>
      <body>
        <div id="ad-container">
          <script type="text/javascript">
            atOptions = {
              'key' : '${config.key}',
              'format' : '${config.format}',
              'height' : ${config.height},
              'width' : ${config.width},
              'params' : {}
            };
          </script>
          <script type="text/javascript" src="https://www.highperformanceformat.com/${config.key}/invoke.js?refresh=${refreshKey}"></script>
        </div>
        <script type="text/javascript">
          window.addEventListener('load', function() {
            setTimeout(function() {
              window.parent.postMessage('ad-loaded-${selectedType}-${refreshKey}', '*');
            }, 150);
          });
        </script>
      </body>
    </html>
  `;

  // Reset al cambiar de tipo o de refreshKey
  useEffect(() => {
    setIsVisible(false);
  }, [selectedType, refreshKey]);

  // Listener para el mensaje del iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === `ad-loaded-${selectedType}-${refreshKey}`) {
        setIsVisible(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedType, refreshKey]);

  return (
    <Animated.View 
      key={refreshKey}
      style={[
        styles.floatingContainer, 
        { 
          bottom: isMobile ? 95 : 25, 
          opacity: fadeAnim,
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0]
            })
          }]
        }
      ]}
    >
      <View style={styles.adCard}>
        <iframe
          srcDoc={adHtml}
          width={config.width}
          height={config.height}
          style={{ border: 'none', overflow: 'hidden', backgroundColor: 'transparent' }}
          title="Ad Container"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'fixed' as any,
    bottom: 25,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    zIndex: 999999,
    pointerEvents: 'none',
  },
  adCard: {
    backgroundColor: 'transparent',
    padding: 0,
    pointerEvents: 'auto',
    overflow: 'hidden',
  },
});