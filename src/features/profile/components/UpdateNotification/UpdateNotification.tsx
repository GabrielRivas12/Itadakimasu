import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Constants from 'expo-constants';

// Obtenemos la versión directamente del package.json/app.json a través de Expo
const CURRENT_VERSION = Constants.expoConfig?.version || '1.0.0';


export function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  // Solo mostrar en Móvil
  if (Platform.OS === 'web') return null;

  useEffect(() => {
    // Función para consultar la API de GitHub (Placeholder)
    const checkForUpdates = async () => {
      try {
        // --- COMIENZO DE LÓGICA DE PETICIÓN ---
        // Aquí iría la llamada a: https://api.github.com/repos/USUARIO/REPO/releases/latest
        // Por ahora lo dejamos como placeholder para no hacer peticiones reales
        
        /*
        const response = await fetch('https://api.github.com/repos/tu-usuario/tu-repo/releases/latest');
        const data = await response.json();
        const latestVersion = data.tag_name.replace('v', '');
        
        if (latestVersion !== CURRENT_VERSION) {
          setNewVersion(latestVersion);
          setDownloadUrl(data.html_url);
          setUpdateAvailable(true);
        }
        */
        
        // Simulación para propósitos de UI (Descomentar para ver cómo queda)
        setUpdateAvailable(true);
        setNewVersion('1.0.0');
        setDownloadUrl('https://github.com/tu-usuario/tu-repo/releases');

      } catch (error) {
        console.warn('Error al verificar actualizaciones:', error);
      }
    };

    // Verificamos cada vez que se monta el componente en el perfil
    checkForUpdates();
  }, []);

  if (!updateAvailable) return null;

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
