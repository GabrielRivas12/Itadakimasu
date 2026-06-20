import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';

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

export function SkeletonLoader() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Pulse style={styles.banner} />

        <View style={styles.headerRow}>
          <Pulse style={styles.cover} />
          <View style={styles.headerInfo}>
            <Pulse style={styles.titleLine} />
            <Pulse style={[styles.titleLine, { width: '60%' }]} />
            <Pulse style={[styles.subtitleLine, { width: '35%' }]} />
          </View>
        </View>

        <Pulse style={styles.statusCard} />

        <View style={styles.statsRow}>
          <Pulse style={styles.statCard} />
          <Pulse style={styles.statCard} />
          <Pulse style={styles.statCard} />
        </View>

        <View style={styles.section}>
          <Pulse style={styles.sectionTitle} />
          <Pulse style={styles.textLine} />
          <Pulse style={styles.textLine} />
          <Pulse style={[styles.textLine, { width: '65%' }]} />
        </View>

        <View style={styles.section}>
          <Pulse style={styles.sectionTitle} />
          <Pulse style={styles.trailerBox} />
        </View>

        <View style={styles.section}>
          <Pulse style={styles.sectionTitle} />
          <View style={styles.specRow}>
            <Pulse style={styles.specItem} />
            <Pulse style={styles.specItem} />
            <Pulse style={styles.specItem} />
            <Pulse style={styles.specItem} />
          </View>
          <View style={styles.specRow}>
            <Pulse style={styles.specItem} />
            <Pulse style={styles.specItem} />
          </View>
        </View>

        <View style={styles.section}>
          <Pulse style={styles.sectionTitle} />
          <View style={styles.charRow}>
            <Pulse style={styles.charItem} />
            <Pulse style={styles.charItem} />
            <Pulse style={styles.charItem} />
            <Pulse style={styles.charItem} />
          </View>
        </View>

        <View style={styles.section}>
          <Pulse style={styles.sectionTitle} />
          <Pulse style={styles.episodeBox} />
          <Pulse style={[styles.episodeBox, { width: '75%' }]} />
          <Pulse style={[styles.episodeBox, { width: '85%' }]} />
        </View>

        <View style={styles.section}>
          <Pulse style={styles.sectionTitle} />
          <View style={styles.relatedRow}>
            <Pulse style={styles.relatedItem} />
            <Pulse style={styles.relatedItem} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  content: {
    paddingBottom: 40,
  },
  banner: {
    width: '100%',
    height: 240,
    backgroundColor: '#1e293b',
  },
  headerRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -80,
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  cover: {
    width: 110,
    height: 165,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#0b0f19',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
    paddingBottom: 4,
    height: 80,
    justifyContent: 'flex-end',
  },
  titleLine: {
    height: 20,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    marginBottom: 8,
    width: '100%',
  },
  subtitleLine: {
    height: 14,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    marginTop: 4,
  },
  statusCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    height: 60,
    backgroundColor: '#1e293b',
    borderRadius: 12,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    height: 72,
    backgroundColor: '#1e293b',
    borderRadius: 12,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  sectionTitle: {
    height: 18,
    width: 120,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    marginBottom: 12,
  },
  textLine: {
    height: 14,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    marginBottom: 10,
    width: '100%',
  },
  trailerBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#1e293b',
    borderRadius: 12,
  },
  specRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  specItem: {
    flex: 1,
    height: 36,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  charRow: {
    flexDirection: 'row',
    gap: 12,
  },
  charItem: {
    width: 80,
    height: 110,
    backgroundColor: '#1e293b',
    borderRadius: 10,
  },
  episodeBox: {
    height: 48,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    marginBottom: 8,
    width: '100%',
  },
  relatedRow: {
    flexDirection: 'row',
    gap: 12,
  },
  relatedItem: {
    flex: 1,
    height: 140,
    backgroundColor: '#1e293b',
    borderRadius: 12,
  },
});
