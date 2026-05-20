/**
 * Shared tokens for Binary Diffs + Binary Hardening Details (matches dashboard cards / reference UI).
 */
export const BH_CARD_RADIUS_PX = 12;
export const BH_CARD_SHADOW = '0 8px 24px -16px rgb(15 23 42 / 0.28)';
export const BH_BORDER = '#e5e7eb';
/** Active tab text + underline (reference) */
export const BH_TAB_ACTIVE = '#5C59B6';
export const BH_TAB_INACTIVE = '#64748b';
export const BH_TAB_UNDERLINE_PX = 3;
export const BH_THEME_EASE = '240ms cubic-bezier(0.22, 1, 0.36, 1)';
export const BH_THEME_TRANSITION = [
  `background ${BH_THEME_EASE}`,
  `background-color ${BH_THEME_EASE}`,
  `color ${BH_THEME_EASE}`,
  `border-color ${BH_THEME_EASE}`,
  `box-shadow ${BH_THEME_EASE}`,
  `opacity ${BH_THEME_EASE}`,
].join(', ');
export const BH_INTERACTIVE_TRANSITION = [
  `background-color ${BH_THEME_EASE}`,
  `color ${BH_THEME_EASE}`,
  `border-color ${BH_THEME_EASE}`,
  `box-shadow ${BH_THEME_EASE}`,
  'transform 160ms ease',
].join(', ');

/** Theme-aware tokens for light/dark mode. Use with useLayoutContext themeMode. */
export function getBinaryHardeningTheme(isDark) {
  if (isDark) {
    return {
      cardBg: '#1e293b',
      border: '#334155',
      borderStrong: '#475569',
      headerBg: '#0f172a',
      subheaderBg: '#1e293b',
      tabStripBg: '#111827',
      title: '#f8fafc',
      muted: '#94a3b8',
      mutedLight: '#cbd5e1',
      surfaceMuted: 'rgba(15,23,42,0.72)',
      surfaceRaised: '#0f172a',
      surfaceInset: '#111827',
      badgeBg: '#1e293b',
      badgeColor: '#e2e8f0',
      badgeBorder: '#334155',
      greenBg: 'rgba(52, 211, 153, 0.05)',
      greenText: '#6ee7b7',
      redBg: 'rgba(248, 113, 113, 0.05)',
      redText: '#fca5a5',
      amberBg: 'rgba(251, 191, 36, 0.05)',
      amberText: '#fcd34d',
      surfaceElevated: '#020617',
      divider: '#1e293b',
      lineStrong: 'rgba(148,163,184,0.18)',
      hoverSurface: 'rgba(59,130,246,0.05)',
      selectedSurface: 'rgba(59,130,246,0.1)',
      tableStripe: 'rgba(15,23,42,0.42)',
    };
  }
  return {
    cardBg: '#ffffff',
    border: '#d7e3ef',
    borderStrong: '#b8c8d8',
    headerBg: '#f3f7fb',
    subheaderBg: '#f7fbff',
    tabStripBg: '#f3f7fb',
    title: '#0f172a',
    muted: '#334155',
    mutedLight: '#475569',
    surfaceMuted: '#f8fbff',
    surfaceRaised: '#f3f7fb',
    surfaceInset: '#eef4fa',
    badgeBg: '#f6f9fc',
    badgeColor: '#0f172a',
    badgeBorder: '#d7e3ef',
    greenBg: '#f0fdf4',
    greenText: '#15803d',
    redBg: '#fef2f2',
    redText: '#b91c1c',
    amberBg: '#fffbeb',
    amberText: '#b45309',
    surfaceElevated: '#ffffff',
    divider: '#dbe5ef',
    lineStrong: '#c8d6e4',
    hoverSurface: '#f4f8ff',
    selectedSurface: '#e8f1ff',
    tableStripe: '#f9fbfe',
  };
}
