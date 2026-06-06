import React, { useState, useEffect, useRef } from 'react';
import { View, Platform, StyleSheet, Animated } from 'react-native';
import { usePathname } from 'expo-router';
import { useResponsive } from '../../hooks/useResponsive';

// Definición de la interfaz
interface WebAdBannerProps {
  type?: '728x90' | '468x60' | '320x50' | '300x250' | '160x600' | '160x300' | 'auto';
}

export function WebAdBanner({ type = 'auto' }: WebAdBannerProps) {
  // Mover la configuración DENTRO del componente garantiza que siempre esté definida
  const AD_CONFIGS = {
    '728x90': { key: '04d928200e72e6dff1a017e433b845e7', format: 'iframe', height: 90, width: 728 },
    '468x60': { key: 'b35df60e7a73946fc66b968cb3ffab65', format: 'iframe', height: 60, width: 468 },
    '320x50': { key: '16affd95cd1d454da1939142754ae945', format: 'iframe', height: 50, width: 320 },
    '300x250': { key: 'a733bdaf4f27b1ce3ec7f0e5b677918f', format: 'iframe', height: 250, width: 300 },
    '160x600': { key: '7edc83645ddcd205f131887831663d87', format: 'iframe', height: 600, width: 160 },
    '160x300': { key: 'a29019b7212378df11e2dfa350d40ad3', format: 'iframe', height: 300, width: 160 },
  };

  const pathname = usePathname();
  const { width: windowWidth, isMobile } = useResponsive();
  const [refreshKey, setRefreshKey] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Lógica de selección de tipo
  let selectedType = type;
  if (type === 'auto') {
    if (windowWidth >= 1024) selectedType = '728x90';
    else if (windowWidth >= 768) selectedType = '468x60';
    else selectedType = '320x50';
  }

  const config = AD_CONFIGS[selectedType as keyof typeof AD_CONFIGS];

  // Refrescar cuando cambia la ruta
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [pathname]);

  // Animación
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [refreshKey, selectedType]);

  if (Platform.OS !== 'web' || !config) return null;

  const adHtml = `
    <html>
      <body style="margin:0; padding:0; display:flex; justify-content:center; align-items:center;">
        <script type="text/javascript">
          atOptions = { 'key' : '${config.key}', 'format' : '${config.format}', 'height' : ${config.height}, 'width' : ${config.width}, 'params' : {} };
        </script>
        <script type="text/javascript" src="https://www.highperformanceformat.com/${config.key}/invoke.js"></script>
      </body>
    </html>
  `;

  // Determinar si la ruta actual muestra la barra de navegación inferior (Bottom Tabs)
  const isTabRoute = ['/home', '/airing', '/explore', '/profile'].some(route => pathname.startsWith(route));

  //NO MODFICAR 
  return (
    <Animated.View style={[styles.floatingContainer, { opacity: fadeAnim, bottom: (isMobile && isTabRoute) ? 95 : 25 }]}>
      <iframe
        srcDoc={adHtml}
        width={config.width}
        height={config.height}
        style={{ border: 'none' }}
      />
    </Animated.View>
  );
  //NO MODFICAR
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'fixed' as any,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99999,
    pointerEvents: 'auto',
  },
});