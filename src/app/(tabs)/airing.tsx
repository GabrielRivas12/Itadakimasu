import React, { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { AiringPage } from '../../features/airing/pages/AiringPage';
import { AiringSpcPage } from '../../features/airing_spcore/pages/AiringSpcPage';
import { useResponsive } from '../../hooks/useResponsive';
import { getApiSource } from '../../../services/cache';

export default function AiringScreen() {
  const [apiSource, setApiSource] = useState<'anilist' | 'senpaicore'>('anilist');
  const { isWeb } = useResponsive();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const source = await getApiSource();
        setApiSource(source);
      })();
    }, [])
  );

  const isSenpaiCoreMode = !isWeb && apiSource === 'senpaicore';

  return isSenpaiCoreMode ? <AiringSpcPage /> : <AiringPage />;
}