import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useResponsive } from '../../../hooks/useResponsive';

export function HomeSkeleton() {
  const { getColumns } = useResponsive();
  const columns = getColumns(2, 3, 4, 5);

  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonBanner} />

      {/* Continue Watching Skeleton */}
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonScroll}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.skeletonSmallCard} />
        ))}
      </View>

      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonGrid}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <View
            key={i}
            style={[styles.skeletonCard, { width: `${100 / columns - 2}%` }]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonContainer: {
    paddingBottom: 24,
  },
  skeletonBanner: {
    width: '100%',
    height: 350,
    backgroundColor: '#1e293b',
  },
  skeletonTitle: {
    width: 150,
    height: 24,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  skeletonScroll: {
    flexDirection: 'row',
    paddingLeft: 16,
    marginBottom: 8,
  },
  skeletonSmallCard: {
    width: 120,
    height: 170,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginRight: 16,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    justifyContent: 'flex-start',
  },
  skeletonCard: {
    height: 200,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginHorizontal: '1%',
    marginBottom: 16,
  },
});
