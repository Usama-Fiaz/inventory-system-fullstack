import { CardBody, CardHeader } from 'react-bootstrap';
import { useLayoutContext } from '@/context/useLayoutContext';
import {
  BH_THEME_TRANSITION,
  getBinaryHardeningTheme,
} from '@/app/(admin)/dashboard/binary-hardening/binaryHardeningTheme';

export const UI_FONT_STACK =
  '"Ubuntu", "Cantarell", "Noto Sans", "DejaVu Sans", "Liberation Sans", "Segoe UI", Roboto, sans-serif';

export function tableHeaderCellStyle(isDark, t) {
  return {
    background: isDark ? 'rgba(30,41,59,0.5)' : '#f3f7fb',
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#dbe5ef'}`,
    borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#dbe5ef'}`,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: isDark ? '#cbd5e1' : '#334155',
    padding: '14px 16px',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
    fontFamily: UI_FONT_STACK,
    transition: BH_THEME_TRANSITION,
  };
}

export default function InventoryPanel({ header, children, bodyStyle }) {
  const { theme } = useLayoutContext();
  const isDark = theme === 'dark';
  const t = getBinaryHardeningTheme(theme);

  return (
    <div
      style={{
        background: isDark ? '#0f172a' : '#ffffff',
        border: `1px solid ${isDark ? t.borderStrong : '#cbd5e1'}`,
        borderRadius: 28,
        boxShadow: isDark ? 'none' : '0 10px 35px -15px rgba(15,23,42,0.14)',
        overflow: 'clip',
        transition: BH_THEME_TRANSITION,
      }}
    >
      <CardHeader
        className="py-3 px-4"
        style={{
          background: t.headerBg,
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
        }}
      >
        {header}
      </CardHeader>
      <CardBody
        className="pt-2 pt-sm-3 px-2 px-sm-4 pb-3 pb-sm-4"
        style={{
          background: isDark ? '#0f172a' : t.cardBg,
          ...(bodyStyle || {}),
        }}
      >
        {children}
      </CardBody>
    </div>
  );
}
