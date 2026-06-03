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

  if (useScrollView) {
    return (
      <ScrollView
        style={[styles.flex, isWeb && styles.webBg]}
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

  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  webBg: {
    backgroundColor: '#0b0f19',
  },
});
