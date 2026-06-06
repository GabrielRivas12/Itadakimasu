import React from 'react';
import { StyleSheet, View, ViewStyle, ScrollView } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  useScrollView?: boolean;
  onScroll?: (event: any) => void;
  scrollEventThrottle?: number;
  refreshControl?: React.ReactElement;
}

export function ResponsiveContainer({
  children,
  style,
  contentContainerStyle,
  useScrollView = true,
  onScroll,
  scrollEventThrottle,
  refreshControl,
}: ResponsiveContainerProps) {
  const { isWeb, getContentWidth } = useResponsive();

  const containerStyle = [
    styles.container,
    isWeb && { maxWidth: getContentWidth(), alignSelf: 'center', width: '100%' },
    style,
  ];

  return (
    <ScrollView
      style={[styles.flex, styles.bg]}
      contentContainerStyle={[
        styles.scrollContent,
        isWeb && { maxWidth: getContentWidth(), alignSelf: 'center', width: '100%' },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={!isWeb}
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  scrollContent: {
    flexGrow: 1,
  },
  bg: {
    backgroundColor: '#0b0f19',
  },
});
