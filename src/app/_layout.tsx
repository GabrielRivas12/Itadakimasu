import '../../services/firebase'; // Inicialización modular
import { Stack } from 'expo-router';
import '../../services/auth'; 
import { SystemBars } from 'react-native-edge-to-edge';

export default function RootLayout() {

  return (
    <>
      <SystemBars style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
      </Stack>
    </>
  );
}
