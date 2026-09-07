import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '../../hooks/useResponsive';
import { StreakBadge } from '../../features/home/components/StreakBadge';
import { SettingsButton } from '../../features/settings/components/SettingsButton';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { isWeb, isMobile } = useResponsive();

  // En web, si no es móvil (tablet/desktop), ocultamos la barra de pestañas inferior
  const showBottomTabs = !isWeb || isMobile;
  // En móvil nativo el header lo controla el navigator; en web lo dibuja cada página
  const isNative = !isWeb;

  return (
    <Tabs
      screenOptions={{
        headerShown: !isWeb || isMobile,
        sceneStyle: { backgroundColor: '#0b0f19' },
        headerStyle: {
          backgroundColor: '#0b0f19',
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTitleStyle: {
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerTintColor: '#ffffff',
        headerShadowVisible: false,
        tabBarActiveTintColor: '#8b5cf6',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarShowLabel: false,
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: 'bold',
          marginBottom: 0,
          marginTop: 2,
        },
        tabBarStyle: showBottomTabs ? {
          backgroundColor: '#0f172a',
          borderTopWidth: 0,
          height: isWeb ? 78 : (45 + Math.max(insets.bottom, 12)),
          paddingBottom: isWeb ? 16 : Math.max(insets.bottom, 16),
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
          headerRight: () => (isNative ? <StreakBadge /> : null),
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activeIconWrapper]}>
              <Feather
                name="home"
                size={23}
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
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activeIconWrapper]}>
              <Feather
                name="tv"
                size={23}
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
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activeIconWrapper]}>
              <Feather
                name="search"
                size={23}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: 'Mi Colección',
          tabBarLabel: 'Colección',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activeIconWrapper]}>
              <Feather
                name="book"
                size={23}
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
          headerRight: () => (isNative ? <SettingsButton /> : null),
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activeIconWrapper]}>
              <Feather
                name="user"
                size={23}
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
    marginTop: 10,
  },
  activeIconWrapper: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
});
