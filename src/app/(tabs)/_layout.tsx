import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '../../hooks/useResponsive';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { isWeb, isMobile } = useResponsive();

  // En web, si no es móvil (tablet/desktop), ocultamos la barra de pestañas inferior
  const showBottomTabs = !isWeb || isMobile;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#0f172a',
          shadowColor: 'transparent',
          elevation: 0,
          height: Platform.OS === 'ios' ? 90 : 56,
        },
        headerTitleStyle: {
          color: '#f8fafc',
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerTintColor: '#f8fafc',
        tabBarActiveTintColor: '#8b5cf6',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: showBottomTabs ? {
          backgroundColor: '#0f172a',
          borderTopWidth: 1,
          borderTopColor: '#1e293b',
          height: isWeb
            ? (isMobile ? 75 : 75) 
            : (Platform.OS === 'ios' ? 88 : 64 + insets.bottom),
          paddingBottom: isWeb
            ? (isMobile ? 10 : 10) 
            : (Platform.OS === 'ios' ? 28 : (insets.bottom > 0 ? insets.bottom : 10)),
          paddingTop: 10,
        } : { display: 'none' },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarLabel: 'Inicio',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="airing"
        options={{
          title: 'En Emisión',
          tabBarLabel: 'En Emisión',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'radio' : 'radio-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explorar',
          tabBarLabel: 'Explorar',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'search' : 'search-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Mi Perfil',
          tabBarLabel: 'Perfil',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
