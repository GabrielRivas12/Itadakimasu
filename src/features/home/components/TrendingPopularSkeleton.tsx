import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { useResponsive } from '../../../hooks/useResponsive';

function Pulse({ style }: { style?: any }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return <Animated.View style={[style, { opacity }]} />;
}

export function TrendingPopularSkeleton() {
  const { getColumns } = useResponsive();
  const columns = getColumns(2, 3, 4, 6);

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View
            key={i}
            style={[styles.card, { width: `${100 / columns - 2}%` }]}
          >
            <Pulse style={styles.cardImage} />
            <View style={styles.cardContent}>
              <Pulse style={styles.cardTitle} />
              <Pulse style={[styles.cardSubtitle, { width: '70%' }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    justifyContent: 'flex-start',
  },
  card: {
    marginHorizontal: '1%',
    marginBottom: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: '#0f172a',
  },
  cardContent: {
    padding: 10,
    gap: 4,
  },
  cardTitle: {
    height: 14,
    backgroundColor: '#0f172a',
    borderRadius: 3,
    width: '100%',
  },
  cardSubtitle: {
    height: 11,
    backgroundColor: '#0f172a',
    borderRadius: 3,
  },
});