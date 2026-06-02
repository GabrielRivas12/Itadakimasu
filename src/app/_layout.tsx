import '../../services/firebase'; // Inicialización modular
import { Stack } from 'expo-router';
import '../../services/auth'; 
import { SystemBars } from 'react-native-edge-to-edge';
import { View, StyleSheet } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';
import { WebHeader } from '../components/common/WebHeader';

export default function RootLayout() {
  const { isWeb, isMobile } = useResponsive();

  return (
    <View style={styles.container}>
      <SystemBars style="light" />
      {isWeb && !isMobile && <WebHeader />}
      <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
});