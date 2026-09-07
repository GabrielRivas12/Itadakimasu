import React, { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { ExplorePage } from '../../features/explore/pages/ExplorePage';
import { ExploreSpcPage } from '../../features/explore_spcore/pages/ExploreSpcPage';
import { useResponsive } from '../../hooks/useResponsive';
import { getApiSource } from '../../../services/cache';

export default function ExploreRoute() {
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

  return isSenpaiCoreMode ? <ExploreSpcPage /> : <ExplorePage />;
}