import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;

export const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1200,
};

export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
};

export const BORDER_RADIUS = {
  SM: 4,
  MD: 8,
  LG: 12,
  XL: 16,
};

export const ICON_SIZES = {
  SM: 16,
  MD: 24,
  LG: 32,
  XL: 48,
};

export const BUTTON_HEIGHT = {
  SM: 36,
  MD: 48,
  LG: 56,
};

export const getResponsiveWidth = (percentage: number) => {
  return (width * percentage) / 100;
};

export const getResponsiveHeight = (percentage: number) => {
  return (height * percentage) / 100;
};

export const isSmallDevice = width < BREAKPOINTS.MOBILE;
export const isMediumDevice = width >= BREAKPOINTS.MOBILE && width < BREAKPOINTS.TABLET;
export const isLargeDevice = width >= BREAKPOINTS.TABLET;

export const getResponsiveFontSize = (size: number) => {
  if (Platform.OS === 'web' && width >= BREAKPOINTS.TABLET) {
    return size + 2;
  }
  return size;
};

export const getResponsiveSpacing = (mobile: number, desktop: number) => {
  if (Platform.OS === 'web' && width >= BREAKPOINTS.TABLET) {
    return desktop;
  }
  return mobile;
};

export const getMaxWidth = () => {
  if (Platform.OS === 'web' && width >= BREAKPOINTS.DESKTOP) {
    return BREAKPOINTS.DESKTOP;
  }
  return width;
};