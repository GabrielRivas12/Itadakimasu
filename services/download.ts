import * as FileSystem from 'expo-file-system'; // Usamos la API estándar actualizada
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const DownloadService = {
  async requestPermissions() {
    if (Platform.OS === 'web') return false;
    const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
    const { status: notifStatus } = await Notifications.requestPermissionsAsync();
    return mediaStatus === 'granted' && notifStatus === 'granted';
  },

  sanitizeName(name: string) {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  },

  async downloadEpisode(animeName: string, episodeNumber: number, url: string, onProgressCallback?: (progress: number) => void) {
    if (Platform.OS === 'web') throw new Error('Descarga no soportada en web');

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) throw new Error('Permisos denegados');

    // 1. Usamos documentDirectory para que el archivo sea persistente
    const folder = `${FileSystem.documentDirectory}downloads/`;
    const dirInfo = await FileSystem.getInfoAsync(folder);
    if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(folder, { intermediates: true });

    const filename = `${this.sanitizeName(animeName)}_ep${episodeNumber}.mp4`;
    const localUri = `${folder}${filename}`;

    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      localUri,
      {},
      (p) => {
        const progress = p.totalBytesWritten / p.totalBytesExpectedToWrite;
        if (ProgressCallback) ProgressCallback(progress);
      }
    );

    try {
      const result = await downloadResumable.downloadAsync();
      
      // 2. Validación moderna usando FileSystem.getInfoAsync (ya no da warning si se usa correctamente)
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists || fileInfo.size < 1024 * 1024) {
        throw new Error('Archivo inválido o descarga incompleta.');
      }

      // 3. Guardar en MediaLibrary
      const asset = await MediaLibrary.createAssetAsync(localUri);
      const albumName = `AnimeLT`; // Nombre único para tu app
      let album = await MediaLibrary.getAlbumAsync(albumName);
      
      if (!album) {
        album = await MediaLibrary.createAlbumAsync(albumName, asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }

      await Notifications.scheduleNotificationAsync({
        content: { title: '¡Descarga lista! ✅', body: `${animeName} - Ep ${episodeNumber}` },
        trigger: null,
      });

      return asset.uri;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
};