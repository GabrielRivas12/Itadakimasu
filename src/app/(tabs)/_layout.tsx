import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Platform, View, StyleSheet } from 'react-native';
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
        sceneStyle: { backgroundColor: '#0b0f19' },
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
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: 'bold',
          marginBottom: 0,
          marginTop: 2,
        },
        tabBarStyle: showBottomTabs ? {
          backgroundColor: '#0f172a',
          borderTopWidth: 0,
          height: isWeb ? 68 : (Platform.OS === 'ios' ? 88 : 60),
          paddingBottom: isWeb ? 12 : (Platform.OS === 'ios' ? 30 : 12),
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
        } : { display: 'none' },
        }}
        >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarLabel: 'Inicio',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activeIconWrapper]}>
              <Feather
                name="home"
                size={20}
                color={color}
              />
            </View>
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
            <View style={[styles.iconWrapper, focused && styles.activeIconWrapper]}>
              <Feather
                name="tv"
                size={20}
                color={color}
              />
            </View>
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
            <View style={[styles.iconWrapper, focused && styles.activeIconWrapper]}>
              <Feather
                name="search"
                size={20}
                color={color}
              />
            </View>
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
            <View style={[styles.iconWrapper, focused && styles.activeIconWrapper]}>
              <Feather
                name="user"
                size={20}
                color={color}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    width: 48,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconWrapper: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
});
