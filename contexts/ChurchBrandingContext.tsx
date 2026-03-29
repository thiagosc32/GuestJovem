import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, getChurchBrandingById, isSupabaseConfigured, supabase } from '../services/supabase';
import { COLORS } from '../constants/colors';
import { brandedGradientStops, brandedHeaderSoftGradient, brandedPrimaryDark } from '../utils/authInviteTheme';

export type ChurchBranding = {
  id: string;
  name: string;
  ministry_name: string;
  ministry_slogan: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
};

/** Cores do app com paleta da igreja (gradientes de cabeçalho incluídos). */
export type ChurchAppTheme = typeof COLORS & {
  primary: string;
  secondary: string;
  gradientStart: string;
  gradientMiddle: string;
  primaryDark: string;
  headerSoftGradient: [string, string];
};

type ChurchBrandingContextValue = {
  branding: ChurchBranding | null;
  loading: boolean;
  refresh: () => Promise<void>;
  themeColors: ChurchAppTheme;
};

const ChurchBrandingContext = createContext<ChurchBrandingContextValue | null>(null);

export function ChurchBrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<ChurchBranding | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      const cid = user && 'church_id' in user ? (user as { church_id?: string | null }).church_id : null;
      if (!cid) {
        setBranding(null);
        return;
      }
      const row = await getChurchBrandingById(cid);
      if (row) setBranding(row);
      else setBranding(null);
    } catch {
      setBranding(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setBranding(null);
        setLoading(false);
        return;
      }
      if (!session?.user) {
        setBranding(null);
        setLoading(false);
        return;
      }
      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        setTimeout(() => {
          void refresh();
        }, 0);
      }
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  const themeColors = useMemo((): ChurchAppTheme => {
    const p = branding?.primary_color?.trim() || null;
    const s = branding?.secondary_color?.trim() || null;
    const [gradientStart, gradientMiddle] = brandedGradientStops(p, s);
    const headerSoftGradient = brandedHeaderSoftGradient(p, s);
    const primaryDark = brandedPrimaryDark(p);
    return {
      ...COLORS,
      primary: p || COLORS.primary,
      secondary: s || COLORS.secondary,
      gradientStart,
      gradientMiddle,
      primaryDark,
      headerSoftGradient,
    };
  }, [branding]);

  const value = useMemo(
    () => ({ branding, loading, refresh, themeColors }),
    [branding, loading, refresh, themeColors]
  );

  return <ChurchBrandingContext.Provider value={value}>{children}</ChurchBrandingContext.Provider>;
}

export function useChurchBranding() {
  const ctx = useContext(ChurchBrandingContext);
  if (!ctx) throw new Error('useChurchBranding outside ChurchBrandingProvider');
  return ctx;
}

const defaultAppTheme: ChurchAppTheme = {
  ...COLORS,
  primary: COLORS.primary,
  secondary: COLORS.secondary,
  gradientStart: COLORS.gradientStart,
  gradientMiddle: COLORS.gradientMiddle,
  primaryDark: COLORS.primaryDark,
  headerSoftGradient: ['#FFFFFF', '#F0F4FF'],
};

/** Cores globais: paleta da igreja quando disponível (cabeçalhos, gradientes). */
export function useAppTheme(): ChurchAppTheme {
  const ctx = useContext(ChurchBrandingContext);
  return ctx?.themeColors ?? defaultAppTheme;
}
