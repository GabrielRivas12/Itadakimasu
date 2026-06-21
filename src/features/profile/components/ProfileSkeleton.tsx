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

export function ProfileSkeleton() {
  const { isWeb, getContentWidth, isMobile } = useResponsive();

  return (
    <View style={styles.container}>
      <View style={[
        styles.header,
        isWeb && { maxWidth: getContentWidth(), alignSelf: 'center', width: '100%' },
        isWeb && isMobile && { paddingTop: 20, paddingHorizontal: 16 }
      ]}>
        <View style={styles.headerRow}>
          <View>
            <Pulse style={styles.headerTitle} />
            <Pulse style={[styles.headerSubtitle, { width: '60%' }]} />
          </View>
          <Pulse style={styles.settingsIcon} />
        </View>
      </View>

      <View style={[
        styles.content,
        isWeb && { maxWidth: getContentWidth(), alignSelf: 'center', width: '100%' },
      ]}>
        <View style={styles.userRow}>
          <Pulse style={styles.avatar} />
          <View style={styles.userInfo}>
            <Pulse style={styles.userName} />
            <Pulse style={[styles.userRole, { width: '70%' }]} />
          </View>
          <Pulse style={styles.logoutIcon} />
        </View>

        <Pulse style={styles.sectionTitle} />
        <View style={styles.topAnimeGrid}>
          {[1, 2, 3].map((i) => (
            <Pulse key={i} style={styles.topAnimeCard} />
          ))}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 15,
    backgroundColor: '#0b0f19',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    width: 120,
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
  settingsIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#1e293b',
    borderRadius: 10,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1e293b',
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
    gap: 6,
  },
  userName: {
    height: 20,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    width: '50%',
  },
  userRole: {
    height: 13,
    backgroundColor: '#1e293b',
    borderRadius: 4,
  },
  logoutIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#1e293b',
    borderRadius: 10,
  },
  sectionTitle: {
    width: 100,
    height: 18,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    marginBottom: 16,
  },
  topAnimeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  topAnimeCard: {
    flex: 1,
    height: 200,
    backgroundColor: '#1e293b',
    borderRadius: 12,
  },
});
