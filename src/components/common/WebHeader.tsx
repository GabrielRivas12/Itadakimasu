import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { Link, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '../../hooks/useResponsive';

const NAV_ITEMS = [
  { name: 'Inicio', path: '/home', icon: 'home' },
  { name: 'En Emisión', path: '/airing', icon: 'radio' },
  { name: 'Explorar', path: '/explore', icon: 'search' },
  { name: 'Perfil', path: '/profile', icon: 'person' },
];

export function WebHeader() {
  const { getContentWidth } = useResponsive();
  const pathname = usePathname();

  return (
    <View style={styles.headerWrapper}>
      {/* 1. Corregido: Combinamos de forma plana el estilo estático y el maxWidth dinámico */}
      <View style={StyleSheet.flatten([styles.container, { maxWidth: getContentWidth() }])}>
        
        <View style={styles.leftSection}>
          <Link href="/home" asChild>
            <TouchableOpacity style={styles.logoContainer}>
              <View style={styles.logoIcon}>
                <Ionicons name="play" size={20} color="#ffffff" />
              </View>
              <Text style={styles.logoText}>Itadakimasu!</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <View style={styles.navSection}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path as any} asChild>
                {/* 2. Corregido: El array de estilos del TouchableOpacity ahora usa flatten */}
                <TouchableOpacity style={StyleSheet.flatten([styles.navItem, isActive && styles.navItemActive])}>
                  {/* El Text está dentro, pero aplicamos flatten por buena práctica con condicionales */}
                  <Text style={StyleSheet.flatten([styles.navText, isActive && styles.navTextActive])}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              </Link>
            );
          })}
        </View>

        {/* Espaciador para mantener el logo a la izquierda y nav centrado si es necesario, o simplemente remover la sección derecha */}
        <View style={{ width: 150, opacity: 0 }} pointerEvents="none" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    height: 70,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    justifyContent: 'center',
    zIndex: 1000,
  },
  container: {
    flexDirection: 'row',
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  navSection: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: '#161b2c',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  navItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: '#8b5cf6',
  },
  navText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  navTextActive: {
    color: '#ffffff',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    padding: 8,
  },
  profileButton: {
    padding: 2,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1e293b',
  },
});