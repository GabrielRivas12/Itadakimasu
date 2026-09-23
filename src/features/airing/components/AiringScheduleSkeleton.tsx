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

export function AiringScheduleSkeleton() {
  const { getColumns } = useResponsive();
  const columns = getColumns(2, 3, 4, 6);

  return (
    <View style={styles.grid}>
      {Array.from({ length: columns * 3 }).map((_, i) => (
        <View key={i} style={[styles.card, { width: `${100 / columns - 2}%` }]}>
          <View style={styles.imageWrapper}>
            <Pulse style={styles.cardImage} />
            <Pulse style={styles.badge} />
          </View>
          <View style={styles.cardContent}>
            <Pulse style={styles.title} />
            <Pulse style={[styles.meta, { width: '60%' }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 24,
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
  imageWrapper: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: '#0f172a',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 48,
    height: 16,
    borderRadius: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
  },
  cardContent: {
    padding: 10,
    gap: 5,
  },
  title: {
    height: 15,
    backgroundColor: '#0f172a',
    borderRadius: 3,
    width: '100%',
  },
  meta: {
    height: 11,
    backgroundColor: '#0f172a',
    borderRadius: 3,
  },
});