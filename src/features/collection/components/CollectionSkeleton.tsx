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

export function CollectionSkeleton() {
  const { isWeb, getContentWidth, getColumns, isMobile } = useResponsive();
  const columns = getColumns(1, 1, 2, 2);

  return (
    <View style={styles.container}>
      <View style={[
        styles.header,
        isWeb && { maxWidth: getContentWidth(), alignSelf: 'center', width: '100%' },
        isWeb && isMobile && { paddingTop: 20, paddingHorizontal: 16 }
      ]}>
        <Pulse style={styles.headerTitle} />
        <Pulse style={[styles.headerSubtitle, { width: '65%' }]} />
      </View>

      <View style={[
        styles.content,
        isWeb && { maxWidth: getContentWidth(), alignSelf: 'center', width: '100%' },
      ]}>
        <Pulse style={styles.statsCard} />

        <View style={styles.tabsRow}>
          <Pulse style={styles.tab} />
          <Pulse style={styles.tab} />
          <Pulse style={styles.tab} />
        </View>

        {Array.from({ length: 4 }).map((_, i) => (
          <Pulse key={i} style={[styles.listCard, columns > 1 && { width: `${100 / columns - 1}%` }]}>
            <Pulse style={styles.listImage} />
            <View style={styles.listContent}>
              <Pulse style={styles.listTitle} />
              <Pulse style={[styles.listMeta, { width: '40%' }]} />
              <View style={styles.genreRow}>
                <Pulse style={styles.genreTag} />
                <Pulse style={styles.genreTag} />
              </View>
            </View>
          </Pulse>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 15,
    backgroundColor: '#0b0f19',
  },
  headerTitle: {
    width: 160,
    height: 28,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    marginBottom: 6,
  },
  headerSubtitle: {
    height: 14,
    backgroundColor: '#1e293b',
    borderRadius: 4,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  statsCard: {
    width: '100%',
    height: 80,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 20,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    height: 36,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  listCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    padding: 10,
    alignItems: 'center',
  },
  listImage: {
    width: 70,
    height: 105,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  listContent: {
    flex: 1,
    marginLeft: 12,
    gap: 6,
  },
  listTitle: {
    height: 16,
    backgroundColor: '#0f172a',
    borderRadius: 3,
    width: '80%',
  },
  listMeta: {
    height: 12,
    backgroundColor: '#0f172a',
    borderRadius: 3,
  },
  genreRow: {
    flexDirection: 'row',
    gap: 6,
  },
  genreTag: {
    width: 60,
    height: 18,
    backgroundColor: '#0f172a',
    borderRadius: 4,
  },
});
