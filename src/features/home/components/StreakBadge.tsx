import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStreak } from '../hooks/useStreak';

export function StreakBadge() {
  const streak = useStreak();
  const flameScale = useRef(new Animated.Value(1)).current;
  const flameOpacity = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (streak && streak.currentStreak > 0) {
      const flicker = Animated.parallel([
        Animated.sequence([
          Animated.timing(flameScale, { toValue: 1.08, duration: 150, useNativeDriver: true }),
          Animated.timing(flameScale, { toValue: 0.95, duration: 120, useNativeDriver: true }),
          Animated.timing(flameScale, { toValue: 1.04, duration: 100, useNativeDriver: true }),
          Animated.timing(flameScale, { toValue: 1, duration: 130, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(flameOpacity, { toValue: 0.75, duration: 100, useNativeDriver: true }),
          Animated.timing(flameOpacity, { toValue: 1, duration: 140, useNativeDriver: true }),
          Animated.timing(flameOpacity, { toValue: 0.85, duration: 80, useNativeDriver: true }),
          Animated.timing(flameOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.3, duration: 100, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.7, duration: 80, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.5, duration: 100, useNativeDriver: true }),
        ]),
      ]);

      const anim = Animated.loop(flicker, { iterations: 3 });
      anim.start(() => {
        flameScale.setValue(1);
        flameOpacity.setValue(1);
        glowOpacity.setValue(0);
      });
      return () => anim.stop();
    } else {
      flameScale.setValue(1);
      flameOpacity.setValue(1);
      glowOpacity.setValue(0);
    }
  }, [streak?.currentStreak]);

  if (!streak || streak.currentStreak === 0) {
    return (
      <View style={styles.container}>
        <Ionicons name="flame-outline" size={22} color="#475569" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />
        <Animated.View style={{
          transform: [{ scale: flameScale }],
          opacity: flameOpacity,
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
});
