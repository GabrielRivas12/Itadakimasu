import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export function SkeletonLoader() {
  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonHeader} />
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonStats} />
      <View style={styles.skeletonText} />
      <View style={styles.skeletonText} />
      <View style={styles.skeletonTextShort} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 100,
  },
  skeletonHeader: {
    width: width - 32,
    height: 200,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 16,
  },
  skeletonTitle: {
    width: width - 32,
    height: 28,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    marginBottom: 16,
  },
  skeletonStats: {
    width: width - 32,
    height: 60,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    marginBottom: 24,
  },
  skeletonText: {
    width: width - 32,
    height: 16,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonTextShort: {
    width: (width - 32) * 0.7,
    height: 16,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    marginBottom: 12,
  },
});
