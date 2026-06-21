import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import { preloadAllData } from '../../../../services/dataPreloader';
import { FeaturedBanner } from '../components/FeaturedBanner';
import { ContinueWatching } from '../components/ContinueWatching';
import { TrendingGrid } from '../components/TrendingGrid';
import { HomeSkeleton } from '../components/HomeSkeleton';
import { useHome } from '../hooks/useHome';
import { ResponsiveContainer } from '../../../components/common/ResponsiveContainer';
import { useResponsive } from '../../../hooks/useResponsive';
import { DownloadApkButton } from '../components/DownloadApkButton';
import { UpdateNotification } from '../components/UpdateNotification/UpdateNotification';
import { usePortraitOrientation } from '../../../hooks/usePortraitOrientation';

export function HomePage() {
  usePortraitOrientation();
  const {
    trending,
    continueWatching,
    featured,
    loading,
    refreshing,
    loadingMoreState,
    fadeAnim,
    onRefresh,
    handleAnimePress,
    handleScroll,
  } = useHome();

  useEffect(() => { preloadAllData(); }, []);

  const { isWeb, getContentWidth, isMobile } = useResponsive();

  return (
    <View style={styles.container}>
      <View style={[
        styles.header, 
        isWeb && { maxWidth: getContentWidth(), alignSelf: 'center', width: '100%' },
        isWeb && isMobile && { paddingTop: 20, paddingHorizontal: 16 }
      ]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Inicio</Text>
            <Text style={styles.headerSubtitle}>Bienvenido a Itadakimasu!</Text>
          </View>
          {isWeb && isMobile && <DownloadApkButton />}
        </View>
      </View>
      {loading ? (
        <ResponsiveContainer>
          <HomeSkeleton />
        </ResponsiveContainer>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ResponsiveContainer
            contentContainerStyle={styles.scrollContent}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
            }
          >
            {featured && (
              <FeaturedBanner featured={featured} onPress={handleAnimePress} />
            )}
            <ContinueWatching items={continueWatching} onPress={handleAnimePress} />
            <Text style={styles.sectionTitle}>Tendencias ahora</Text>
            <TrendingGrid trending={trending} onPress={handleAnimePress} />
            <UpdateNotification />
            {loadingMoreState && (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color="#8b5cf6" />
              </View>
            )}
          </ResponsiveContainer>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 15,
    backgroundColor: '#0b0f19',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  loadingMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
