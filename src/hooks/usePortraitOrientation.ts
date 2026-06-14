import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';

export function usePortraitOrientation() {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') return;

      let isMounted = true;
      async function lockToPortrait() {
        try {
          if (isMounted) {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          }
        } catch (error) {
          console.warn('Failed to lock screen orientation to portrait:', error);
        }
      }

      lockToPortrait();

      return () => {
        isMounted = false;
      };
    }, [])
  );
}
