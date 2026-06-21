import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { useResponsive } from '../../../hooks/useResponsive';

function Pulse({ style, children }: { style?: any; children?: React.ReactNode }) {
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

  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}

export function AiringSkeleton() {
  const { getColumns, isMobile } = useResponsive();
  const columns = getColumns(2, 3, 4, 6);

  return (
    <View style={styles.grid}>
      {Array.from({ length: columns * 3 }).map((_, i) => (
        <Pulse
          key={i}
          style={[
            styles.card,
            { width: `${100 / columns - 2}%` },
          ]}
        >
          <Pulse style={[styles.image, isMobile && styles.imageMobile]} />
          <View style={styles.content}>
            <Pulse style={styles.title} />
            <Pulse style={[styles.badge, { width: '40%' }]} />
          </View>
        </Pulse>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingTop: 8,
    justifyContent: 'flex-start',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginHorizontal: '1%',
    marginBottom: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 240,
    backgroundColor: '#0f172a',
  },
  imageMobile: {
    height: 180,
  },
  content: {
    padding: 10,
    gap: 4,
  },
  title: {
    height: 16,
    backgroundColor: '#0f172a',
    borderRadius: 3,
    width: '100%',
  },
  badge: {
    height: 12,
    backgroundColor: '#0f172a',
    borderRadius: 3,
  },
});
