import React from 'react';
import { StyleSheet, Text, TouchableOpacity, Linking, ViewStyle, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '../../../hooks/useResponsive';

interface DownloadApkButtonProps {
  style?: ViewStyle;
}

export function DownloadApkButton({ style }: DownloadApkButtonProps) {
  const { isWeb } = useResponsive();

  if (!isWeb) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(
        'https://api.github.com/repos/GabrielRivas12/Itadakimasu/releases/latest'
      );

      const release = await response.json();

      const apkAsset = release.assets?.find(
        (asset: any) => asset.name.toLowerCase().endsWith('.apk')
      );

      if (!apkAsset) {
        Alert.alert('Error', 'No se encontró ningún APK en el último release.');
        return;
      }

      Linking.openURL(apkAsset.browser_download_url);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo obtener la última versión.');
    }
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