import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export function HomeSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonBanner} />
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonGrid}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={styles.skeletonCard} />
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
    height: 450,
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
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    justifyContent: 'space-between',
  },
  skeletonCard: {
    width: (width - 48) / 3,
    height: 180,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    marginHorizontal: 8,
    marginBottom: 16,
  },
});
