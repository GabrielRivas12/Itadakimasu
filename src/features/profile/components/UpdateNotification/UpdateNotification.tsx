import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const CURRENT_VERSION = Constants.expoConfig?.version || '1.0.0';
const GITHUB_API_URL = 'https://api.github.com/repos/GabrielRivas12/Itadakimasu/releases/latest';

// Función para comparar versiones semánticas (ej: 1.0.1 > 1.0.0)
function isNewerVersion(newVer: string, currentVer: string) {
  const n = newVer.split('.').map(v => parseInt(v) || 0);
  const c = currentVer.split('.').map(v => parseInt(v) || 0);

  for (let i = 0; i < Math.max(n.length, c.length); i++) {
    const v1 = n[i] || 0;
    const v2 = c[i] || 0;
    if (v1 > v2) return true;
    if (v1 < v2) return false;
  }
  return false;
}

export function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const checkForUpdates = async () => {
      try {
        const now = Date.now();
        const cleanCurrentVersion = CURRENT_VERSION.replace(/[vV]/g, '').trim();

        // 1. Mostrar actualización guardada si sigue vigente
        const savedUpdate = await AsyncStorage.getItem('@available_update');
        if (savedUpdate) {
          const { version, url } = JSON.parse(savedUpdate);
          const cleanSavedVersion = version.replace(/[vV]/g, '').trim();

          if (isNewerVersion(cleanSavedVersion, cleanCurrentVersion)) {
            setNewVersion(cleanSavedVersion);
            setDownloadUrl(url);
            setUpdateAvailable(true);
          } else {
            await AsyncStorage.multiRemove(['@available_update', '@next_update_check']);
            setUpdateAvailable(false);
          }
        }

        // 2. Ver si ya llegó el momento de verificar
        const nextCheck = await AsyncStorage.getItem('@next_update_check');
        if (nextCheck && now < parseInt(nextCheck)) return;

        // 3. Consultar GitHub
        const response = await fetch(GITHUB_API_URL, {
          headers: { 'Accept': 'application/vnd.github.v3+json' }
        });

        // Siempre programar el próximo chequeo, aunque falle
        const scheduleNext = async () => {
          const minMs = 1 * 60 * 60 * 1000;
          const maxMs = 5 * 60 * 60 * 1000;
          const randomDelay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
          await AsyncStorage.setItem('@next_update_check', (now + randomDelay).toString());
        };

        if (!response.ok) {
          await scheduleNext();
          return;
        }

        const data = await response.json();

        if (data?.tag_name) {
          const latestVersion = data.tag_name.replace(/[vV]/g, '').trim();

          if (isNewerVersion(latestVersion, cleanCurrentVersion)) {
            const apkAsset = data.assets?.find((asset: any) =>
              asset.name.toLowerCase().endsWith('.apk')
            );
            const url = apkAsset ? apkAsset.browser_download_url : data.html_url;

            setNewVersion(latestVersion);
            setDownloadUrl(url);
            setUpdateAvailable(true);

            await AsyncStorage.setItem('@available_update', JSON.stringify({ version: latestVersion, url }));
          } else {
            setUpdateAvailable(false);
            await AsyncStorage.removeItem('@available_update');
          }
        }

        await scheduleNext();
      } catch {
        // Error silencioso
      }
    };

    checkForUpdates();
  }, []);

  if (Platform.OS === 'web' || !updateAvailable) return null;

  const handleDownload = () => {
    if (downloadUrl) {
      Linking.openURL(downloadUrl);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Ionicons name="rocket-outline" size={24} color="#8b5cf6" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Actualización disponible</Text>
          <Text style={styles.subtitle}>Versión {newVersion} lista para descargar</Text>
        </View>
        <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
          <Ionicons name="cloud-download-outline" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Actualizar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
    marginBottom: 18,
  },
  content: {
    backgroundColor: '#161b2c',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  downloadButton: {
    backgroundColor: '#8b5cf6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
