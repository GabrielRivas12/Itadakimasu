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

export function HomeSkeleton() {
  const { getColumns, isMobile } = useResponsive();
  const columns = getColumns(2, 3, 4, 5);

  return (
    <View style={styles.container}>
      <Pulse style={[styles.banner, isMobile && styles.bannerMobile]} />

      <Pulse style={styles.sectionTitle} />
      <View style={styles.scrollRow}>
        {[1, 2, 3].map((i) => (
          <Pulse key={i} style={styles.smallCard} />
        ))}
      </View>

      <Pulse style={styles.sectionTitle} />
      <View style={styles.grid}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Pulse
            key={i}
            style={[
              styles.gridCard,
              { width: `${100 / columns - 2}%` },
            ]}
          >
            <Pulse style={[styles.gridImage, isMobile && styles.gridImageMobile]} />
            <View style={styles.gridContent}>
              <Pulse style={styles.gridTitle} />
              <Pulse style={[styles.gridSubtitle, { width: '60%' }]} />
            </View>
          </Pulse>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  banner: {
    height: 220,
    margin: 16,
    backgroundColor: '#1e293b',
    borderRadius: 16,
  },
  bannerMobile: {
    height: 180,
    margin: 12,
  },
  sectionTitle: {
    width: 180,
    height: 22,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  scrollRow: {
    flexDirection: 'row',
    paddingLeft: 16,
    marginBottom: 8,
  },
  smallCard: {
    width: 120,
    height: 170,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginRight: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    justifyContent: 'flex-start',
  },
  gridCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginHorizontal: '1%',
    marginBottom: 16,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: 240,
    backgroundColor: '#0f172a',
  },
  gridImageMobile: {
    height: 180,
  },
  gridContent: {
    padding: 10,
    gap: 4,
  },
  gridTitle: {
    height: 16,
    backgroundColor: '#0f172a',
    borderRadius: 3,
    width: '100%',
  },
  gridSubtitle: {
    height: 12,
    backgroundColor: '#0f172a',
    borderRadius: 3,
  },
});
