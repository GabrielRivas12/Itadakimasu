import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

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
  }, [opacity]);

  return <Animated.View style={[style, { opacity }]} />;
}

export function MediaplayerSkeleton() {
  return (
    <View>
      <View style={styles.player} />

      <View style={styles.navigation}>
        <Pulse style={styles.navButton} />
        <Pulse style={styles.navLabel} />
        <Pulse style={styles.navButton} />
      </View>

      <View style={styles.variantSection}>
        <View style={styles.selectorHeader}>
          <Pulse style={styles.headerIcon} />
          <Pulse style={styles.audioLabel} />
        </View>
        <View style={styles.segment}>
          <Pulse style={styles.segmentOption} />
          <Pulse style={styles.segmentOption} />
        </View>
      </View>

      <View style={styles.providerSection}>
        <View style={styles.selectorHeader}>
        </View>
      </View>

      <View style={styles.listSection}>
        <View style={styles.listHeader}>
          <View style={styles.listTitleGroup}>
            <View style={styles.titleAccent} />
            <Pulse style={styles.listTitle} />
          </View>
          <Pulse style={styles.listCount} />
        </View>

        <View style={styles.list}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View
              key={index}
              style={[styles.episodeRow, index < 5 && styles.itemDivider]}
            >
              <View style={styles.thumbnailWrap}>
                <Pulse style={styles.thumbnail} />
                <View style={styles.numberBadge} />
              </View>
              <View style={styles.episodeInfo}>
                <Pulse style={styles.episodeTitle} />
              </View>
              <Pulse style={styles.chevron} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  player: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#111827',
    marginBottom: 16,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  navButton: {
    minWidth: 110,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
  },
  navLabel: {
    width: 90,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#1e293b',
  },
  variantSection: {
    paddingHorizontal: 16,
    marginTop: 4,
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  headerIcon: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#1e293b',
  },
  audioLabel: {
    width: 48,
    height: 13,
    borderRadius: 4,
    backgroundColor: '#1e293b',
  },
  providerLabel: {
    width: 140,
    height: 13,
    borderRadius: 4,
    backgroundColor: '#1e293b',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    overflow: 'hidden',
  },
  segmentOption: {
    flex: 1,
    height: 38,
    backgroundColor: '#1e293b',
  },
  providerSection: {
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 20,
  },
  serverRow: {
    flexDirection: 'row',
    gap: 10,
  },
  serverPillWide: {
    width: 96,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1e293b',
  },
  serverPill: {
    width: 104,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1e293b',
  },
  serverPillSmall: {
    width: 88,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1e293b',
  },
  listSection: {
    paddingHorizontal: 16,
    marginBottom: 15
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  listTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  titleAccent: {
    width: 3,
    height: 22,
    borderRadius: 2,
    backgroundColor: '#8b5cf6',
  },
  listTitle: {
    width: 120,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#1e293b',
  },
  listCount: {
    width: 78,
    height: 12,
    borderRadius: 4,
    backgroundColor: '#1e293b',
  },
  list: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
  },
  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  thumbnailWrap: {
    width: 96,
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0b0f19',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#334155',
  },
  numberBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    width: 20,
    height: 12,
    borderRadius: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    width: '65%',
    height: 14,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  chevron: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
});
