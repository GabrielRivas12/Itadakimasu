import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export const SettingsButton = () => {
  const router = useRouter();

  return (
    <TouchableOpacity 
      style={styles.button} 
      onPress={() => router.push('/settings')}
      activeOpacity={0.7}
    >
      <Ionicons name="settings-outline" size={24} color="#ffffff" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#161b2c',
    borderWidth: 1,
    borderColor: '#2d3748',
  },
});
