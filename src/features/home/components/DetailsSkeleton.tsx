import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export function SkeletonLoader() {
  return (
    <View style={styles.skeletonContainer}>
      {/* Banner Skeleton */}
      <View style={styles.bannerSkeleton} />
      
      {/* Header Info Skeleton */}
      <View style={styles.headerSkeleton}>
        <View style={styles.coverSkeleton} />
        <View style={styles.titleInfoSkeleton}>
          <View style={styles.titleLineSkeleton} />
          <View style={[styles.titleLineSkeleton, { width: '60%' }]} />
          <View style={styles.studioLineSkeleton} />
        </View>
      </View>

      {/* Stats Skeleton */}
      <View style={styles.statsSkeleton} />
      
      {/* Description Skeleton */}
      <View style={styles.textSkeleton} />
      <View style={styles.textSkeleton} />
      <View style={[styles.textSkeleton, { width: '40%' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonContainer: {
    backgroundColor: '#0b0f19',
    flex: 1,
  },
  bannerSkeleton: {
    width: '100%',
    height: 240,
    backgroundColor: '#1e293b',
  },
  headerSkeleton: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -80,
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  coverSkeleton: {
    width: 110,
    height: 165,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#0b0f19',
  },
  titleInfoSkeleton: {
    flex: 1,
    marginLeft: 16,
    paddingBottom: 4,
    height: 80,
    justifyContent: 'flex-end',
  },
  titleLineSkeleton: {
    height: 20,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    marginBottom: 8,
    width: '100%',
  },
  studioLineSkeleton: {
    height: 14,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    marginTop: 4,
    width: '40%',
  },
  statsSkeleton: {
    marginHorizontal: 16,
    height: 80,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 24,
  },
  textSkeleton: {
    marginHorizontal: 16,
    height: 16,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    marginBottom: 12,
    width: '90%',
  },
});
