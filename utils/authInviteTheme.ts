import { COLORS } from '../constants/colors';

export type InviteBrandingSnapshot = {
  name: string;
  ministry_name: string;
  ministry_slogan: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
};

export function parseInviteHex(color: string | null | undefined): string | null {
  if (!color?.trim()) return null;
  const t = color.trim();
  if (/^#[0-9A-Fa-f]{6}$/i.test(t)) return t.toUpperCase();
  if (/^#[0-9A-Fa-f]{3}$/i.test(t)) {
    const r = t[1];
    const g = t[2];
    const b = t[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return null;
}

function darkenHex(hex: string, factor: number): string {
  const n = hex.slice(1);
  const r = Math.round(parseInt(n.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(n.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(n.slice(4, 6), 16) * factor);
  const c = (x: number) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

/** Degradê de fundo e botão principal. */
export function inviteGradientColors(branding: InviteBrandingSnapshot | null): [string, string] {
  if (!branding) return [COLORS.gradientStart, COLORS.gradientMiddle];
  const p = parseInviteHex(branding.primary_color);
  const s = parseInviteHex(branding.secondary_color);
  if (p && s) return [p, s];
  if (p) return [p, darkenHex(p, 0.72)];
  return [COLORS.gradientStart, COLORS.gradientMiddle];
}

export function inviteAccentColor(branding: InviteBrandingSnapshot | null): string {
  return parseInviteHex(branding?.primary_color ?? undefined) ?? COLORS.primary;
}

export function isLikelyLogoUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  return /^https?:\/\/.+/i.test(url.trim());
}

/** Título principal do header; null = usar bloco clássico "Guest JOVEM". */
export function inviteHeaderTitle(branding: InviteBrandingSnapshot | null): string | null {
  if (!branding) return null;
  const m = branding.ministry_name?.trim() ?? '';
  const n = branding.name?.trim() ?? '';
  if (m) return m;
  if (n) return n;
  return null;
}

/** Subtítulo abaixo do ministério (slogan definido pelo admin; não usa nome da igreja). */
export function inviteHeaderTagline(branding: InviteBrandingSnapshot | null): string {
  if (!branding) return 'Conectando jovens na fé';
  const s = branding.ministry_slogan?.trim() ?? '';
  if (s) return s;
  return 'Conectando jovens na fé';
}
