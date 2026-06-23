import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStreak } from '../hooks/useStreak';

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function StreakBadge() {
  const streak = useStreak();
  const flameRotate = useRef(new Animated.Value(0)).current;
  const flameBob = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  const isActive = streak !== null && streak.currentStreak > 0 && streak.lastWatchDate === getToday();

  useEffect(() => {
    if (isActive) {
      const rotateAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(flameRotate, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(flameRotate, { toValue: -1, duration: 250, useNativeDriver: true }),
          Animated.timing(flameRotate, { toValue: 0.6, duration: 200, useNativeDriver: true }),
          Animated.timing(flameRotate, { toValue: -0.6, duration: 180, useNativeDriver: true }),
          Animated.timing(flameRotate, { toValue: 0, duration: 220, useNativeDriver: true }),
        ]),
        { iterations: 3 }
      );

      const bobAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(flameBob, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(flameBob, { toValue: 0, duration: 350, useNativeDriver: true }),
        ]),
        { iterations: 4 }
      );

      const glowAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.2, duration: 400, useNativeDriver: true }),
        ]),
        { iterations: 3 }
      );

      const anim = Animated.parallel([rotateAnim, bobAnim, glowAnim], { stopTogether: true });
      anim.start();

      return () => {
        anim.stop();
      };
    } else {
      flameRotate.setValue(0);
      flameBob.setValue(0);
      glowOpacity.setValue(0.3);
    }
  }, [isActive]);

  const hasStreak = streak !== null && streak.currentStreak > 0;
  const isInactiveToday = hasStreak && streak.lastWatchDate !== getToday();

  if (!hasStreak) {
    return (
      <View style={styles.container}>
        <Ionicons name="flame-outline" size={22} color="#475569" />
      </View>
    );
  }

  if (isInactiveToday) {
    return (
      <View style={styles.container}>
        <Ionicons name="flame-outline" size={22} color="#475569" />
        <Text style={styles.counterGray}>{streak.currentStreak}</Text>
      </View>
    );
  }

  const rotation = flameRotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-8deg', '8deg'],
  });

  const bobY = flameBob.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -3],
  });

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />
        <Animated.View style={{
          transform: [
            { rotate: rotation },
            { translateY: bobY },
          ],
        }}>
          <Ionicons name="flame" size={22} color="#f97316" />
        </Animated.View>
      </View>
      <Text style={styles.counter}>{streak.currentStreak}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
  },
  iconWrapper: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
  },
  counter: {
    color: '#f97316',
    fontSize: 14,
    fontWeight: 'bold',
  },
  counterGray: {
    color: '#475569',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
