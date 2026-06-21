import { useCallback } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';

const TABLET_MIN_DIM = 768;

export function usePortraitOrientation() {
  const { width, height } = useWindowDimensions();
  const minDim = Math.min(width, height);
  const esTablet = minDim >= TABLET_MIN_DIM;

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') return;

      let activo = true;

      async function definirOrientacion() {
        try {
          if (!activo) return;
          if (!esTablet) {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          }
        } catch (error) {
          console.warn('Error al definir orientación:', error);
        }
      }

      definirOrientacion();

      return () => {
        activo = false;
      };
    }, [esTablet])
  );
}
