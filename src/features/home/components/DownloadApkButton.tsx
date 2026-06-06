import React from 'react';
import { StyleSheet, Text, TouchableOpacity, Linking, Platform, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '../../../hooks/useResponsive';

interface DownloadApkButtonProps {
  style?: ViewStyle;
}

export function DownloadApkButton({ style }: DownloadApkButtonProps) {
  const { isWeb } = useResponsive();

  // Solo mostrar en Web
  if (!isWeb) return null;

  const handleDownload = () => {
    // Aquí iría el link de tu APK
    Linking.openURL('https://itadakimasu.online');
  };

  return (
    <TouchableOpacity 
      style={[styles.button, style]} 
      onPress={handleDownload}
      activeOpacity={0.8}
    >
      <Ionicons name="logo-android" size={18} color="#ffffff" />
      <Text style={styles.text}>Obtener APK</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#8b5cf6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    // @ts-ignore
    cursor: 'pointer',
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
