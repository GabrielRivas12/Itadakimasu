import { useState, useEffect, useRef } from 'react';
import { getStreak, streakEvents, StreakData, clearStreakCache } from '../../../../services/streak';
import { onAuthStateChangedCallback } from '../../../../services/auth';

export function useStreak() {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const authUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    getStreak().then(setStreak);

    const onUpdate = (data: StreakData) => setStreak(data);
    streakEvents.on('streakUpdated', onUpdate);

    const unsubAuth = onAuthStateChangedCallback((user) => {
      if (!user) {
        clearStreakCache();
        setStreak(null);
      } else {
        getStreak().then(setStreak);
      }
    });
    authUnsubRef.current = unsubAuth;

    return () => {
      streakEvents.off('streakUpdated', onUpdate);
      if (authUnsubRef.current) {
        authUnsubRef.current();
        authUnsubRef.current = null;
      }
    };
  }, []);

  return streak;
}
