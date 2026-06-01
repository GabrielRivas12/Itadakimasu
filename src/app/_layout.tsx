import '../../services/firebase'; // Inicialización modular
import { Stack } from 'expo-router';
import '../../services/auth'; 

export default function RootLayout() {

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
    </Stack>
  );
}
