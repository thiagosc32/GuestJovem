/**
 * Hook para layout responsivo na web.
 * Usa useWindowDimensions para reagir ao redimensionamento da janela.
 * No native retorna dimensões estáticas (Dimensions.get).
 */

import { useWindowDimensions, Platform } from 'react-native';
import { useMemo } from 'react';
import { BREAKPOINTS } from '../constants/dimensions';

/** Largura máxima do conteúdo na web (desktop) — evita que o app estique demais */
export const WEB_CONTENT_MAX_WIDTH = 480;

export function useResponsiveWeb() {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  return useMemo(() => {
    const isMobile = width < BREAKPOINTS.MOBILE;
    const isTablet = width >= BREAKPOINTS.MOBILE && width < BREAKPOINTS.TABLET;
    const isDesktop = width >= BREAKPOINTS.TABLET;
    const contentMaxWidth =
      isWeb && width > WEB_CONTENT_MAX_WIDTH ? WEB_CONTENT_MAX_WIDTH : width;

    return {
      width,
      height,
      isWeb,
      isMobile,
      isTablet,
      isDesktop,
      contentMaxWidth,
    };
  }, [width, height, isWeb]);
}
