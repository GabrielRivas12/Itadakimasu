import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const CURRENT_VERSION = Constants.expoConfig?.version || '1.0.0';
const GITHUB_API_URL = 'https://api.github.com/repos/GabrielRivas12/Itadakimasu/releases/latest';
const CHECK_INTERVAL = 5 * 24 * 60 * 60 * 1000; // 5 días en milisegundos

// Función auxiliar para comparar versiones semánticas (ej: 1.0.1 > 1.0.0)
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
        console.log('[UpdateCheck] Iniciando verificación...');
        const lastCheck = await AsyncStorage.getItem('@last_update_check');
        const now = Date.now();

        // 1. Verificar primero si ya tenemos una actualización guardada que sea superior
        const savedUpdate = await AsyncStorage.getItem('@available_update');
        if (savedUpdate) {
          const { version, url } = JSON.parse(savedUpdate);
          if (isNewerVersion(version, CURRENT_VERSION)) {
            console.log('[UpdateCheck] Mostrando actualización guardada:', version);
            setNewVersion(version);
            setDownloadUrl(url);
            setUpdateAvailable(true);
          } else {
            await AsyncStorage.removeItem('@available_update');
          }
        }

        // 2. Comprobar GitHub (Temporalmente sin el bloqueo de 5 días para que puedas probarlo)
         if (lastCheck && now - parseInt(lastCheck) < CHECK_INTERVAL) return;

        console.log('[UpdateCheck] Consultando GitHub:', GITHUB_API_URL);
        const response = await fetch(GITHUB_API_URL, {
          headers: { 'Accept': 'application/vnd.github.v3+json' }
        });
        
        if (!response.ok) {
          console.warn('[UpdateCheck] Error en respuesta de GitHub:', response.status);
          return;
        }

        const data = await response.json();
        
        if (data && data.tag_name) {
          const latestVersion = data.tag_name.replace('v', '');
          console.log('[UpdateCheck] Versión en GitHub:', latestVersion, 'Versión local:', CURRENT_VERSION);
          
          if (isNewerVersion(latestVersion, CURRENT_VERSION)) {
            // Buscar el APK en los assets. Si no hay, usar la URL de la release
            const apkAsset = data.assets?.find((asset: any) => 
              asset.name.toLowerCase().endsWith('.apk')
            );
            
            const url = apkAsset ? apkAsset.browser_download_url : data.html_url;
            console.log('[UpdateCheck] ¡Nueva versión encontrada! URL:', url);

            setNewVersion(latestVersion);
            setDownloadUrl(url);
            setUpdateAvailable(true);

            await AsyncStorage.setItem('@available_update', JSON.stringify({
              version: latestVersion,
              url: url
            }));
          } else {
            console.log('[UpdateCheck] La app está actualizada.');
            setUpdateAvailable(false);
            await AsyncStorage.removeItem('@available_update');
          }

          await AsyncStorage.setItem('@last_update_check', now.toString());
        }
      } catch (error) {
        console.warn('[UpdateCheck] Error al verificar actualizaciones:', error);
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
