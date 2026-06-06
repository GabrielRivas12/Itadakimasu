if (typeof global.setImmediate === 'undefined') {
  // @ts-ignore
  global.setImmediate = (fn: (...args: any[]) => void, ...args: any[]) => setTimeout(fn, 0, ...args);
}

import { useEffect } from 'react';
import { usePathname, Stack } from 'expo-router';
import '../../services/auth'; 
import { SystemBars } from 'react-native-edge-to-edge';
import { View, StyleSheet, Platform } from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { useResponsive } from '../hooks/useResponsive';
import { WebHeader } from '../components/common/WebHeader';
import { WebAdBanner } from '../components/common/WebAdBanner';

// Prevenimos que el Splash Screen se oculte automáticamente hasta que estemos listos
SplashScreen.preventAutoHideAsync().catch(() => {
  /* Ignorar errores si ya se está ocultando o no es compatible */
});

export default function RootLayout() {
  const { isWeb, isMobile } = useResponsive();
  const pathname = usePathname();
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    // Cuando las fuentes cargan (o fallan), ocultamos el splash
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Si no hay fuentes y no hay error aún, retornamos null pero el Splash seguirá visible
  if (!fontsLoaded && !fontError) {
    return null;
  }

  // No mostrar WebHeader ni WebAdBanner en la Landing Page (pathname === '/')
  const showWebHeader = isWeb && !isMobile && pathname !== '/';
  const showWebAd = isWeb && pathname !== '/';

  return (
    <View style={styles.container}>
      {/* SystemBars solo tiene sentido en Móvil (Android/iOS) */}
      {Platform.OS !== 'web' && <SystemBars style="light" />}
      
      {showWebHeader && <WebHeader />}

      <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
      </Stack>

      {showWebAd && <WebAdBanner />}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});