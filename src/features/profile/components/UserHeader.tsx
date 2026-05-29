import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';

interface UserHeaderProps {
  name: string;
  role: string;
  avatarUrl: string;
}

export function UserHeader({ name, role, avatarUrl }: UserHeaderProps) {
  return (
    <View style={styles.header}>
      <Image
        source={{ uri: avatarUrl }}
        style={styles.avatar}
      />
      <View style={styles.headerInfo}>
        <Text style={styles.profileName}>{name}</Text>
        <Text style={styles.profileRole}>{role}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  headerInfo: {
    marginLeft: 16,
  },
  profileName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileRole: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
});
