import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, getChurchBrandingById } from '../services/supabase';
import { COLORS } from '../constants/colors';

export type ChurchBranding = {
  id: string;
  name: string;
  ministry_name: string;
  ministry_slogan: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
};

type ChurchBrandingContextValue = {
  branding: ChurchBranding | null;
  loading: boolean;
  refresh: () => Promise<void>;
  themeColors: typeof COLORS & { primary: string; secondary: string };
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

  const themeColors = useMemo(
    () => ({
      ...COLORS,
      primary: branding?.primary_color?.trim() || COLORS.primary,
      secondary: branding?.secondary_color?.trim() || COLORS.secondary,
    }),
    [branding]
  );

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
