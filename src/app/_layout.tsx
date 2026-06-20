if (typeof globalThis.setImmediate === 'undefined') {
  globalThis.setImmediate = (fn: (...args: any[]) => void, ...args: any[]) => setTimeout(fn, 0, ...args);
}

import { usePathname, Stack } from 'expo-router';
import '../../services/auth';
import { SystemBars } from 'react-native-edge-to-edge';
import { View, StyleSheet, Platform } from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useResponsive } from '../hooks/useResponsive';
import { WebHeader } from '../components/common/WebHeader';
import { WebAdBanner } from '../components/common/WebAdBanner';

export default function RootLayout() {
  const { isWeb, isMobile } = useResponsive();
  const pathname = usePathname();
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: '#0b0f19' }} />;
  }

  const showWebHeader = isWeb && !isMobile && pathname !== '/';
  const showWebAd = isWeb && pathname !== '/';

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {Platform.OS !== 'web' && <SystemBars style="light" />}

        {showWebHeader && <WebHeader />}

        <Stack screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: { backgroundColor: '#0b0f19' }
        }}>
          <Stack.Screen name="index" options={{ animation: 'none' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
          <Stack.Screen name="animedetails" options={{ animation: 'none' }} />
          <Stack.Screen name="(settings)/settings" options={{ animation: 'none' }} />
          <Stack.Screen name="(settings)/edit-profile" options={{ animation: 'none' }} />
          <Stack.Screen name="(settings)/privacy" options={{ animation: 'none' }} />
          <Stack.Screen name="(settings)/system-details" options={{ animation: 'none' }} />
        </Stack>

        {showWebAd && <WebAdBanner />}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
});