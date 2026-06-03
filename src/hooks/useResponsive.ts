import { useWindowDimensions, Platform } from 'react-native';

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isWeb = Platform.OS === 'web';
  const isMobile = width < BREAKPOINTS.md;
  const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
  const isDesktop = width >= BREAKPOINTS.lg;

  const getColumns = (mobile = 2, tablet = 3, desktop = 4, largeDesktop = 6) => {
    if (width >= BREAKPOINTS.xl) return largeDesktop;
    if (width >= BREAKPOINTS.lg) return desktop;
    if (width >= BREAKPOINTS.md) return tablet;
    return mobile;
  };

  const getContentWidth = () => {
    if (width >= BREAKPOINTS.xl) return BREAKPOINTS.xl;
    if (width >= BREAKPOINTS.lg) return BREAKPOINTS.lg;
    return '100%';
  };

  return {
    width,
    height,
    isWeb,
    isMobile,
    isTablet,
    isDesktop,
    getColumns,
    getContentWidth,
    breakpoints: BREAKPOINTS,
  };
}
